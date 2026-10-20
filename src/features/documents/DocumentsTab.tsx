import { useEffect, useRef, useState } from "react";
import {
  FileText, FileSpreadsheet, FileBarChart, Plus, ExternalLink, File, Loader2, Trash2, Upload, Download, Sparkles, Link2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { createDocument, deleteDocument, listDocuments, uploadDocument } from "@/lib/documents";
import { signedFileUrl, sizeLabel } from "@/lib/attachments";
import { useAuthStore } from "@/store/auth-store";
import type { Document } from "@/types";

const ICONS: Record<Document["type"], typeof File> = {
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
  outro: "bg-[#EDEEEF] text-text-muted",
};

const SOURCE_LABEL: Record<Document["source"], string> = {
  link: "SharePoint",
  upload: "Enviado",
  copiloto: "Co-piloto",
};

/** Arquivo grande demais para o Storage do projeto (limite do bucket). */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function DocumentsTab({ projectId }: { projectId: string }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);

  // Documentos vêm do banco: links do SharePoint, arquivos enviados aqui e os
  // anexos/respostas do co-piloto (testes de 06/10, backlog 5).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDocuments(projectId)
      .then((d) => { if (!cancelled) { setDocs(d); setError(""); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function addLink() {
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
      const created = await createDocument(projectId, currentUser.id, { name: name.trim(), url: url.trim(), type: "outro" });
      setDocs((d) => [created, ...d]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível vincular o documento.");
    }
  }

  async function uploadFiles(files: File[]) {
    if (!currentUser?.id || files.length === 0) return;
    setUploading(true);
    setError("");
    const errors: string[] = [];
    for (const f of files) {
      if (f.size > MAX_UPLOAD_BYTES) {
        errors.push(`"${f.name}" tem ${sizeLabel(f.size)} — o limite é 50 MB.`);
        continue;
      }
      try {
        const created = await uploadDocument(projectId, currentUser.id, f, { name: f.name, type: "outro" });
        setDocs((d) => [created, ...d]);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `Falha ao enviar "${f.name}".`);
      }
    }
    if (errors.length) setError(errors.join(" "));
    setUploading(false);
  }

  async function open(d: Document, download = false) {
    try {
      if (d.storagePath) window.open(await signedFileUrl(d.storagePath, download ? d.name : undefined), "_blank", "noopener");
      else if (d.sharepointUrl) window.open(d.sharepointUrl, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível abrir o documento.");
    }
  }

  async function removeDoc(d: Document) {
    const what = d.storagePath ? "Excluir este arquivo do projeto?" : "Remover o vínculo deste documento?";
    if (!window.confirm(`${what}\n\n${d.name}`)) return;
    const before = docs;
    setDocs((list) => list.filter((x) => x.id !== d.id));
    try {
      await deleteDocument(d);
    } catch (e) {
      setDocs(before);
      setError(e instanceof Error ? e.message : "Não foi possível remover o documento.");
    }
  }

  const actions = (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" leftIcon={<Link2 size={14} />} onClick={addLink}>
        Link do SharePoint
      </Button>
      <Button size="sm" leftIcon={uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} onClick={() => uploadRef.current?.click()} disabled={uploading}>
        {uploading ? "Enviando…" : "Enviar arquivo"}
      </Button>
    </div>
  );

  return (
    <div>
      <input
        ref={uploadRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { uploadFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />
      <div className="mb-3 rounded-md border border-border bg-surface px-4 py-2.5 text-xs text-text-muted">
        Aqui ficam os arquivos do projeto: os enviados nesta aba, os <strong>anexos do co-piloto</strong> e as
        respostas salvas por ele. Documentos que vivem no <strong>SharePoint</strong> podem ser vinculados pelo link
        (a integração automática com o SharePoint ainda não existe).
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
            `${docs.length} documento${docs.length === 1 ? "" : "s"}`
          )}
        </div>
        {actions}
      </div>

      {!loading && docs.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum documento ainda"
            description="Envie arquivos, vincule links do SharePoint ou salve respostas do co-piloto."
            action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => uploadRef.current?.click()}>Enviar arquivo</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {docs.map((d) => {
            const Icon = ICONS[d.type] ?? File;
            return (
              <Card key={d.id} className="relative hover:border-brand-primary/30">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-10 w-10 rounded-md flex items-center justify-center ${ICON_TONES[d.type] ?? ICON_TONES.outro}`}>
                      <Icon size={18} />
                    </div>
                    <span className="mr-6 inline-flex items-center gap-1 rounded-full bg-[#EDEEEF] px-2 py-0.5 text-[10px] text-text-muted">
                      {d.source === "copiloto" && <Sparkles size={9} />}
                      {SOURCE_LABEL[d.source]}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-text-primary leading-snug line-clamp-2 min-h-[2.5em] break-words">
                    {d.name}
                  </div>
                  <div className="text-[11px] text-text-faint font-mono mt-2">
                    {new Date(d.date).toLocaleDateString("pt-BR")}
                    {d.sizeBytes ? ` · ${sizeLabel(d.sizeBytes)}` : ""}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {d.storagePath ? (
                      <>
                        <button onClick={() => open(d)} className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline">
                          <ExternalLink size={12} /> Abrir
                        </button>
                        <button onClick={() => open(d, true)} className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline">
                          <Download size={12} /> Baixar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => open(d)} className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline">
                        <ExternalLink size={12} /> Abrir no SharePoint
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => removeDoc(d)}
                    className="absolute right-2 top-2 rounded p-1 text-text-faint hover:bg-accent-red/10 hover:text-accent-red"
                    title={d.storagePath ? "Excluir arquivo" : "Remover vínculo"}
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
