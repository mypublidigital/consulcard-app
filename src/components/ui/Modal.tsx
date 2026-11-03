import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  // Altura máxima = tela: em notebook ou com zoom, a janela maior que a tela
  // ficava cortada e sem barra de rolagem. Título fixo, conteúdo rola.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={cn("flex w-full max-h-[calc(100dvh-2rem)] flex-col rounded-lg bg-white shadow-xl border border-border", maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            <button
              aria-label="Fechar"
              className="text-text-muted hover:text-text-primary"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative h-full w-full max-w-md border-l border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            <button
              aria-label="Fechar"
              className="text-text-muted hover:text-text-primary"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-5 h-[calc(100%-57px)]">{children}</div>
      </div>
    </div>
  );
}
