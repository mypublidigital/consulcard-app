import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "purple" | "teal";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
}

const tones: Record<Tone, string> = {
  neutral: "bg-[#EDEEEF] text-text-muted",
  blue: "bg-[#354454]/10 text-[#354454]",
  green: "bg-[#5E8E2B]/10 text-[#5E8E2B]",
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
