import { useState } from "react";
import { FileText, FileSpreadsheet, FileBarChart, Plus, ExternalLink, File } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MOCK_DOCUMENTS } from "@/mocks/documents";
import type { Document } from "@/types";

const ICONS: Record<Document["type"], any> = {
  ata: FileText,
  cronograma: FileSpreadsheet,
  report: FileBarChart,
  entregavel: FileText,
  outro: File,
};

const ICON_TONES: Record<Document["type"], string> = {
  ata: "bg-brand-primary/10 text-brand-primary",
  cronograma: "bg-accent-green/10 text-accent-green",
  report: "bg-accent-amber/10 text-accent-amber",
  entregavel: "bg-[#6D28D9]/10 text-[#6D28D9]",
  outro: "bg-[#F0EDE6] text-text-muted",
};

export function DocumentsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Document[]>(MOCK_DOCUMENTS[projectId] ?? []);

  function addDoc() {
    const name = window.prompt("Nome do documento?");
    if (!name) return;
    setDocs((d) => [
      {
        id: "d-" + Math.random().toString(36).slice(2, 7),
        name,
        type: "outro",
        date: new Date().toISOString().slice(0, 10),
        driveUrl: "#",
      },
      ...d,
    ]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-text-muted">{docs.length} documentos vinculados</div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={addDoc}>
          Documento
        </Button>
      </div>

      {docs.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum documento ainda"
            description="Vincule atas, cronogramas, status reports e entregáveis do projeto."
            action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={addDoc}>Documento</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {docs.map((d) => {
            const Icon = ICONS[d.type];
            return (
              <Card key={d.id} className="hover:border-brand-primary/30">
                <div className="p-4">
                  <div className={`h-10 w-10 rounded-md flex items-center justify-center mb-3 ${ICON_TONES[d.type]}`}>
                    <Icon size={18} />
                  </div>
                  <div className="text-sm font-medium text-text-primary leading-snug line-clamp-2 min-h-[2.5em]">
                    {d.name}
                  </div>
                  <div className="text-[11px] text-text-faint font-mono mt-2">
                    {new Date(d.date).toLocaleDateString("pt-BR")}
                  </div>
                  <a
                    href={d.driveUrl}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
                  >
                    <ExternalLink size={12} /> Abrir no Drive
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
