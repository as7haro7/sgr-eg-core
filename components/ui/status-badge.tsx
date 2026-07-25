import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneStyles: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-600/15",
  info: "bg-blue-50 text-blue-800 ring-blue-700/20",
  success: "bg-green-50 text-green-800 ring-green-700/20",
  warning: "bg-amber-50 text-amber-900 ring-amber-700/20",
  danger: "bg-red-50 text-red-800 ring-red-700/20",
};

interface StatusBadgeProps {
  children: ReactNode;
  className?: string;
  tone?: StatusTone;
}

export function StatusBadge({
  children,
  className,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
