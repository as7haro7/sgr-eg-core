import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-950 text-white hover:bg-slate-800 focus-visible:outline-slate-950 disabled:bg-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus-visible:outline-white",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900 dark:focus-visible:outline-white",
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
