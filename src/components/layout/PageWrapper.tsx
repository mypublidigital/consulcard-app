import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageWrapper({
  children,
  className,
  fullWidth = false,
}: {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <main className={cn("flex-1 overflow-y-auto bg-surface", className)}>
      <div className={cn(fullWidth ? "" : "max-w-[1440px] mx-auto px-6 py-6")}>{children}</div>
    </main>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
