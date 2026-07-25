import {
  cloneElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface FieldControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

interface FormFieldProps {
  children: ReactElement<FieldControlProps>;
  className?: string;
  error?: string;
  hint?: ReactNode;
  id: string;
  label: string;
}

export function FormField({
  children,
  className,
  error,
  hint,
  id,
  label,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs leading-5 text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
