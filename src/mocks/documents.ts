import type { Document } from "@/types";

export const MOCK_DOCUMENTS: Record<string, Document[]> = {
  "proj-001": [
    { id: "d1", name: "Ata de Kick-off — 10/03/2026", type: "ata", date: "2026-03-10", driveUrl: "#" },
    { id: "d2", name: "Cronograma de Migração", type: "cronograma", date: "2026-03-15", driveUrl: "#" },
    { id: "d3", name: "Status Report — Abril/2026", type: "report", date: "2026-04-28", driveUrl: "#" },
    { id: "d4", name: "Mapeamento de Fluxos Transacionais", type: "entregavel", date: "2026-04-22", driveUrl: "#" },
  ],
  "proj-002": [
    { id: "d5", name: "Ata de Kick-off — 01/04/2026", type: "ata", date: "2026-04-01", driveUrl: "#" },
    { id: "d6", name: "Plano de Trabalho Inicial", type: "cronograma", date: "2026-04-05", driveUrl: "#" },
  ],
  "proj-003": [
    { id: "d7", name: "Proposta Comercial", type: "outro", date: "2026-04-15", driveUrl: "#" },
  ],
};
