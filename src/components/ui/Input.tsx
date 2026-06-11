import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
}

export function Field({ label, hint, error, className, children, required }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-xs font-medium text-text-muted">
          {label} {required && <span className="text-accent-red">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-[11px] text-accent-red">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-text-faint">{hint}</span>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 rounded-md border border-border bg-white px-3 text-sm text-text-primary placeholder:text-text-faint focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        className
      )}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 rounded-md border border-border bg-white px-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[80px] rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
        className
      )}
      {...rest}
    />
  );
});
