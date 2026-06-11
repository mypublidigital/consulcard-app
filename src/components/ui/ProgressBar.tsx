import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "brand",
  size = "md",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "green" | "amber";
  size?: "sm" | "md" | "lg";
}) {
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" };
  const tones = {
    brand: "bg-brand-primary",
    green: "bg-accent-green",
    amber: "bg-accent-amber",
  };
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-[#EFEBE3]", heights[size], className)}>
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
