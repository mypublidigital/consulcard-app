import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://placeholder.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "placeholder-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error("[Supabase] Missing env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

/**
 * Link do e-mail de recuperação de senha (testes de 06/10, GAP #1). Precisa
 * ser lido ANTES de criar o cliente: o Supabase consome o endereço, abre a
 * sessão e limpa o "#…type=recovery". Antes ninguém tratava isso e o link
 * entrava direto no sistema, sem pedir a nova senha.
 */
const initialHash = typeof window !== "undefined" ? window.location.hash : "";
const initialPath = typeof window !== "undefined" ? window.location.pathname : "";
const hashParams = new URLSearchParams(initialHash.replace(/^#/, ""));

export const RECOVERY_LINK = {
  /** Chegou pelo link "redefinir senha". */
  active: initialPath.startsWith("/reset-password") || hashParams.get("type") === "recovery",
  /** Link vencido ou já usado (o Supabase devolve error_code no endereço). */
  error: hashParams.get("error_code")
    ? hashParams.get("error_code") === "otp_expired"
      ? "Este link de redefinição de senha venceu ou já foi usado. Peça um novo em \"Esqueci minha senha\"."
      : (hashParams.get("error_description")?.replace(/\+/g, " ") ?? "Link inválido.")
    : null,
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * "Manter conectado" (GAP #1: "mesmo saindo do portal e clicando no link, vai
 * direto para o projeto sem validar o login"). Antes a sessão ficava salva no
 * navegador indefinidamente.
 *
 * Sem a opção marcada, a sessão vale enquanto houver alguma aba do sistema
 * aberta: abrir um projeto em nova aba continua funcionando, mas, fechadas
 * todas as abas, a próxima visita pede login. Cada aba se marca como "viva"
 * (sessionStorage, que morre com a aba) e responde às abas novas que
 * perguntam, pelo BroadcastChannel, se ainda há alguém aberto.
 */
const REMEMBER_KEY = "consulcard.remember";
const ALIVE_KEY = "consulcard.tab-alive";
const CHANNEL = "consulcard-auth";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function setRememberSession(remember: boolean) {
  safe(() => localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0"), undefined);
}

/** Esta aba participa da sessão: responde às abas novas. */
export function markTabAlive() {
  safe(() => sessionStorage.setItem(ALIVE_KEY, "1"), undefined);
}

const channel = safe(() => new BroadcastChannel(CHANNEL), null);
if (channel) {
  channel.onmessage = (e) => {
    if (e.data === "ping" && safe(() => sessionStorage.getItem(ALIVE_KEY) === "1", false)) channel.postMessage("alive");
  };
}

/**
 * false = a sessão salva é de uma visita anterior que já terminou (todas as
 * abas foram fechadas) e o usuário não pediu para manter conectado.
 */
export async function browserSessionStillOpen(): Promise<boolean> {
  if (safe(() => localStorage.getItem(REMEMBER_KEY) === "1", false)) return true;
  if (safe(() => sessionStorage.getItem(ALIVE_KEY) === "1", false)) return true; // recarga desta aba
  if (!channel) return true; // navegador sem suporte: mantém o comportamento anterior
  const probe = new BroadcastChannel(CHANNEL);
  return new Promise((resolve) => {
    const timer = setTimeout(() => { probe.close(); resolve(false); }, 400);
    probe.onmessage = (e) => {
      if (e.data === "alive") { clearTimeout(timer); probe.close(); resolve(true); }
    };
    probe.postMessage("ping");
  });
}
