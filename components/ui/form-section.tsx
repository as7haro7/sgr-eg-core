import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormSection({
  children,
  className,
  columns = 2,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
  description?: string;
  title: string;
}) {
  return (
    <fieldset className={cn("form-section", className)}>
      <legend className="px-1 text-base font-bold text-slate-950">
        {title}
      </legend>
      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}
      <div
        className={cn(
          "mt-5 grid gap-x-5 gap-y-6",
          columns === 1 && "grid-cols-1",
          columns === 2 && "md:grid-cols-2",
          columns === 3 && "md:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}
