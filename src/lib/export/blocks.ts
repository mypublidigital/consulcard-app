import { marked, type Token, type Tokens } from "marked";

/**
 * Modelo intermediário de documento. Markdown do co-piloto e o Status Report
 * viram esta lista de blocos, e os exportadores (PDF, DOCX) só conhecem ela —
 * a conversão do Markdown fica num lugar só.
 */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; runs: Run[] }
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "list"; ordered: boolean; items: Run[][] }
  | { kind: "table"; header: Run[][]; rows: Run[][][] }
  | { kind: "code"; text: string }
  | { kind: "quote"; runs: Run[] }
  | { kind: "hr" };

export interface DocModel {
  title: string;
  subtitle?: string;
  blocks: Block[];
  /**
   * O texto veio da IA? Controla o aviso de revisão no rodapé: o Status Report
   * factual é só dado do sistema, e dizer que foi "gerado com IA" seria falso.
   */
  aiGenerated: boolean;
}

/** Tira o primeiro título quando ele repete o título do documento. */
export function dropDuplicateTitle(blocks: Block[], title: string): Block[] {
  const first = blocks[0];
  if (first?.kind !== "heading") return blocks;
  const heading = first.runs.map((r) => r.text).join("").trim().toLowerCase();
  return heading === title.trim().toLowerCase() ? blocks.slice(1) : blocks;
}

export const AI_NOTICE = "conteúdo gerado com apoio de IA — revisar antes de enviar";
export const DATA_NOTICE = "gerado a partir dos dados do sistema";

export const text = (t: string, style: Omit<Run, "text"> = {}): Run[] => [{ text: t, ...style }];

function inline(tokens: Token[] | undefined, style: Omit<Run, "text"> = {}): Run[] {
  if (!tokens) return [];
  const out: Run[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "strong":
        out.push(...inline((t as Tokens.Strong).tokens, { ...style, bold: true }));
        break;
      case "em":
        out.push(...inline((t as Tokens.Em).tokens, { ...style, italic: true }));
        break;
      case "codespan":
        out.push({ text: (t as Tokens.Codespan).text, ...style, code: true });
        break;
      case "br":
        out.push({ text: "\n", ...style });
        break;
      case "link":
      case "del":
        out.push(...inline((t as Tokens.Link).tokens, style));
        break;
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens?.length) out.push(...inline(tt.tokens, style));
        else out.push({ text: decode(tt.text), ...style });
        break;
      }
      case "escape":
        out.push({ text: (t as Tokens.Escape).text, ...style });
        break;
      default:
        if ("text" in t && typeof t.text === "string") out.push({ text: decode(t.text), ...style });
    }
  }
  return out;
}

// O lexer devolve entidades HTML em texto puro ("&quot;"); o documento quer o caractere.
function decode(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function markdownToBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  for (const t of marked.lexer(md)) {
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        blocks.push({ kind: "heading", level: Math.min(3, Math.max(1, h.depth)) as 1 | 2 | 3, runs: inline(h.tokens) });
        break;
      }
      case "paragraph":
        blocks.push({ kind: "paragraph", runs: inline((t as Tokens.Paragraph).tokens) });
        break;
      case "list": {
        const l = t as Tokens.List;
        blocks.push({
          kind: "list",
          ordered: l.ordered,
          items: l.items.map((it) => it.tokens.flatMap((x) => inline("tokens" in x ? (x.tokens as Token[]) : [x]))),
        });
        break;
      }
      case "table": {
        const tb = t as Tokens.Table;
        blocks.push({
          kind: "table",
          header: tb.header.map((c) => inline(c.tokens)),
          rows: tb.rows.map((r) => r.map((c) => inline(c.tokens))),
        });
        break;
      }
      case "code":
        blocks.push({ kind: "code", text: (t as Tokens.Code).text });
        break;
      case "blockquote": {
        const q = t as Tokens.Blockquote;
        blocks.push({ kind: "quote", runs: q.tokens.flatMap((x) => inline("tokens" in x ? (x.tokens as Token[]) : [x])) });
        break;
      }
      case "hr":
        blocks.push({ kind: "hr" });
        break;
      // "space" e "html" não viram conteúdo.
    }
  }
  return blocks;
}

/** Primeiro título da resposta, para nomear o arquivo exportado. */
export function guessTitle(md: string, fallback: string): string {
  const h = md.match(/^#{1,3}\s+(.+)$/m);
  return (h?.[1] ?? fallback).replace(/[*_`]/g, "").trim().slice(0, 80);
}
