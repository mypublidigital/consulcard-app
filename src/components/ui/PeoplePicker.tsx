import { useMemo, useState } from "react";
import { CheckSquare, Search, Square } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

/**
 * Seleção de várias pessoas com caixas de marcar (testes de 22/10, GAP #03).
 * Antes era uma lista nativa de múltipla escolha: para marcar mais de um era
 * preciso segurar Ctrl, e um clique comum desmarcava todos os outros.
 */
export function PeoplePicker({
  people,
  value,
  onChange,
  emptyText = "Nenhuma pessoa cadastrada.",
}: {
  people: User[];
  value: string[];
  onChange: (ids: string[]) => void;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? people.filter((p) => `${p.name} ${p.role ?? ""}`.toLowerCase().includes(q)) : people;
    // Marcados primeiro: com a lista longa, ficam à vista.
    return [...list].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || a.name.localeCompare(b.name));
  }, [people, query, selected]);

  function toggle(id: string) {
    onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <div className="rounded-md border border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
        <Search size={13} className="shrink-0 text-text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pelo nome"
          className="w-full bg-transparent py-0.5 text-sm focus:outline-none"
        />
        <span className="shrink-0 text-[11px] text-text-muted">
          {value.length} {value.length === 1 ? "selecionado" : "selecionados"}
        </span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="shrink-0 text-[11px] text-brand-primary hover:underline">
            Limpar
          </button>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto py-1" role="group">
        {shown.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-text-faint">{people.length ? "Ninguém com esse nome." : emptyText}</div>
        )}
        {shown.map((p) => {
          const on = selected.has(p.id);
          return (
            <button
              type="button"
              key={p.id}
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(p.id)}
              className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface", on && "bg-brand-primary/5")}
            >
              {on ? <CheckSquare size={16} className="shrink-0 text-brand-primary" /> : <Square size={16} className="shrink-0 text-text-faint" />}
              <Avatar initials={p.initials} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text-primary">{p.name}</span>
                {p.role && <span className="block truncate text-[11px] text-text-faint">{p.role}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
