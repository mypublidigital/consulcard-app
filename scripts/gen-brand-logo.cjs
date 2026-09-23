// Regera src/lib/export/brand-logo.ts a partir do PNG institucional.
//   node scripts/gen-brand-logo.cjs
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const b64 = fs.readFileSync(path.join(root, "public/brand/consulcard-horizontal.png")).toString("base64");
const out = `/**
 * Logo institucional da Consulcard (versão primária horizontal, Manual de Uso
 * de Marca v1c) embutida em base64 para uso nos documentos exportados — PDF e
 * PowerPoint são gerados no navegador e não podem depender de arquivo externo.
 *
 * GERADO de public/brand/consulcard-horizontal.png. Para atualizar:
 *   node scripts/gen-brand-logo.cjs
 */
export const CONSULCARD_LOGO_PNG = "data:image/png;base64,${b64}";

/** Proporção da arte (largura ÷ altura), para dimensionar sem distorcer. */
export const CONSULCARD_LOGO_RATIO = 1600 / 366;
`;
fs.writeFileSync(path.join(root, "src/lib/export/brand-logo.ts"), out);
console.log("gerado: src/lib/export/brand-logo.ts");
