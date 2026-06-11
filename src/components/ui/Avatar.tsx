import { cn } from "@/lib/utils";

interface Props {
  initials: string;
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "brand" | "neutral" | "green" | "amber";
  className?: string;
  title?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

const tones = {
  brand: "bg-brand-primary text-white",
  neutral: "bg-[#E4E0D9] text-text-primary",
  green: "bg-accent-green text-white",
  amber: "bg-accent-amber text-white",
};

export function Avatar({ initials, size = "md", tone = "brand", className, title }: Props) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white",
        sizes[size],
        tones[tone],
        className
      )}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ users, max = 3 }: { users: { initials: string; name?: string }[]; max?: number }) {
  const visible = users.slice(0, max);
  const rest = users.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={i} initials={u.initials} title={u.name} size="sm" tone={i % 2 === 0 ? "brand" : "neutral"} />
      ))}
      {rest > 0 && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F0EDE6] text-[10px] font-semibold text-text-muted ring-2 ring-white">
          +{rest}
        </span>
      )}
    </div>
  );
}
