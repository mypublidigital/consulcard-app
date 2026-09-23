import { useEffect, useState } from "react";
import { FileText, FileSpreadsheet, FileBarChart, Plus, ExternalLink, File, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { createDocument, deleteDocument, listDocuments } from "@/lib/documents";
import { useAuthStore } from "@/store/auth-store";
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
  const currentUser = useAuthStore((s) => s.currentUser);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Documentos agora vêm do banco (migração 0007): antes viviam em memória e
  // sumiam ao sair da tela.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDocuments(projectId)
      .then((d) => { if (!cancelled) { setDocs(d); setError(""); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function addDoc() {
    if (!currentUser?.id) return;
    const name = window.prompt("Nome do documento?");
    if (!name?.trim()) return;
    const url = window.prompt("Cole o link do documento no SharePoint:");
    if (!url?.trim()) return;
    // Antes o link era gravado como "#" e o card abria em lugar nenhum.
    if (!/^https?:\/\//i.test(url.trim())) {
      window.alert("O link precisa começar com https://");
      return;
    }
    try {
      const created = await createDocument(projectId, currentUser.id, {
        name: name.trim(),
        url: url.trim(),
        type: "outro",
      });
      setDocs((d) => [created, ...d]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível vincular o documento.");
    }
  }

  async function removeDoc(id: string) {
    const before = docs;
    setDocs((d) => d.filter((x) => x.id !== id));
    try {
      await deleteDocument(id);
    } catch (e) {
      setDocs(before);
      setError(e instanceof Error ? e.message : "Não foi possível remover o documento.");
    }
  }

  return (
    <div>
      <div className="mb-3 rounded-md border border-border bg-surface px-4 py-2.5 text-xs text-text-muted">
        Os documentos ficam no <strong>SharePoint</strong> da Consulcard; aqui o projeto guarda o vínculo.
        A integração automática (listar e enviar arquivos direto do SharePoint) ainda não existe: por
        enquanto o link é colado à mão.
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-accent-red/30 bg-accent-red/10 px-4 py-2.5 text-xs text-accent-red">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-text-muted">
          {loading ? (
            <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Carregando documentos...</span>
          ) : (
            `${docs.length} documento${docs.length === 1 ? "" : "s"} vinculado${docs.length === 1 ? "" : "s"}`
          )}
        </div>
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
              <Card key={d.id} className="relative hover:border-brand-primary/30">
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
                    href={d.sharepointUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
                  >
                    <ExternalLink size={12} /> Abrir no SharePoint
                  </a>
                  <button
                    onClick={() => removeDoc(d.id)}
                    className="absolute right-2 top-2 rounded p-1 text-text-faint hover:bg-accent-red/10 hover:text-accent-red"
                    title="Remover vínculo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
