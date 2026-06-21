import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function deriveInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function generatePassword(name: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  const initials = deriveInitials(name);
  let rand = "";
  for (let i = 0; i < 8; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `Cc@${rand}${initials}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Identify the caller from their JWT ──────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Não autenticado." }, 401);

    // ── Service-role client (bypasses RLS for admin operations) ─────────
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Authorize: caller must be admin/diretor ─────────────────────────
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("system_role")
      .eq("id", caller.id)
      .single();

    // Bootstrap: if there are no profiles yet, allow the first authenticated
    // user to act as admin so the team can be created initially.
    const { count: profileCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const callerRole = callerProfile?.system_role as string | undefined;
    const isAdmin = callerRole === "admin" || callerRole === "diretor";
    const isBootstrap = (profileCount ?? 0) === 0;

    if (!isAdmin && !isBootstrap) {
      return json({ error: "Sem permissão para gerenciar usuários." }, 403);
    }

    const payload = await req.json();
    const action = payload.action as string;

    // ── CREATE ──────────────────────────────────────────────────────────
    if (action === "create") {
      const { name, email, whatsapp, linkedin, systemRole, role } = payload;
      const password = generatePassword(name);
      const initials = deriveInitials(name);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // no confirmation email needed — admin-managed
        user_metadata: { name, initials },
      });

      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? "Erro ao criar usuário." }, 400);
      }

      // Upsert the full profile (trigger may have created a partial row).
      const { error: profileErr } = await admin.from("profiles").upsert({
        id: created.user.id,
        name,
        initials,
        role,
        system_role: systemRole,
        email,
        whatsapp: whatsapp || null,
        linkedin: linkedin || null,
        temp_password: password,
        active: true,
      });

      if (profileErr) return json({ error: profileErr.message }, 400);

      return json({
        user: {
          id: created.user.id,
          name,
          initials,
          role,
          systemRole,
          email,
          whatsapp: whatsapp || undefined,
          linkedin: linkedin || undefined,
          active: true,
          createdAt: new Date().toISOString().split("T")[0],
          password,
        },
      });
    }

    // ── UPDATE ──────────────────────────────────────────────────────────
    if (action === "update") {
      const { id, name, email, whatsapp, linkedin, systemRole, role } = payload;
      const update: Record<string, unknown> = {};
      if (name !== undefined) { update.name = name; update.initials = deriveInitials(name); }
      if (role !== undefined) update.role = role;
      if (systemRole !== undefined) update.system_role = systemRole;
      if (email !== undefined) update.email = email;
      if (whatsapp !== undefined) update.whatsapp = whatsapp || null;
      if (linkedin !== undefined) update.linkedin = linkedin || null;

      const { error: updErr } = await admin.from("profiles").update(update).eq("id", id);
      if (updErr) return json({ error: updErr.message }, 400);

      // Keep auth email in sync if it changed.
      if (email !== undefined) {
        await admin.auth.admin.updateUserById(id, { email });
      }

      return json({ ok: true });
    }

    // ── RESET PASSWORD ──────────────────────────────────────────────────
    if (action === "resetPassword") {
      const { id, name } = payload;
      const password = generatePassword(name ?? "User");

      const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password });
      if (pwErr) return json({ error: pwErr.message }, 400);

      await admin.from("profiles").update({ temp_password: password }).eq("id", id);
      return json({ password });
    }

    // ── DELETE ──────────────────────────────────────────────────────────
    if (action === "delete") {
      const { id } = payload;
      if (id === caller.id) return json({ error: "Não é possível excluir a si mesmo." }, 400);

      const { error: delErr } = await admin.auth.admin.deleteUser(id);
      // profiles row is removed via ON DELETE CASCADE from auth.users
      if (delErr) return json({ error: delErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    console.error("admin-users error:", err);
    return json({ error: String(err) }, 500);
  }
});
