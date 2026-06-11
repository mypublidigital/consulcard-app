import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "purple" | "teal";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
}

const tones: Record<Tone, string> = {
  neutral: "bg-[#F0EDE6] text-text-muted",
  blue: "bg-[#1A3A8F]/10 text-[#1A3A8F]",
  green: "bg-[#0F5C48]/10 text-[#0F5C48]",
  amber: "bg-[#92400E]/10 text-[#92400E]",
  red: "bg-[#9B1C1C]/10 text-[#9B1C1C]",
  purple: "bg-[#6D28D9]/10 text-[#6D28D9]",
  teal: "bg-[#0E7C7B]/10 text-[#0E7C7B]",
};

export function Badge({ className, tone = "neutral", size = "sm", ...rest }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        tones[tone],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
      {...rest}
    />
  );
}
