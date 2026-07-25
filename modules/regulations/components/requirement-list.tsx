"use client";

import { AlertCircle, ChevronDown, ChevronRight, Edit, Plus } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import type { RequirementSummary } from "@/modules/regulations/types/regulation.types";

interface RequirementListProps {
  regulationId: string;
  requirements: RequirementSummary[];
  canUpdate: boolean;
}

export function RequirementList({
  regulationId,
  requirements,
  canUpdate,
}: RequirementListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const rootRequirements = requirements.filter((r) => !r.rootRequirementId);

  const renderRequirement = (req: RequirementSummary, level = 0) => {
    const children = requirements.filter((r) => r.rootRequirementId === req.id);
    const isExpanded = expanded.has(req.id);
    const hasChildren = children.length > 0;

    return (
      <div key={req.id} className="border-b border-slate-100 last:border-0">
        <div
          className={`flex items-start gap-3 px-4 py-4 hover:bg-slate-50 ${
            level > 0 ? "pl-" + (level * 8 + 4) : ""
          }`}
        >
          <div className="mt-0.5 flex shrink-0 items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(req.id)}
                className="text-slate-400 hover:text-slate-700"
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <StatusBadge
              tone={
                req.criticality === "alta"
                  ? "danger"
                  : req.criticality === "media"
                    ? "warning"
                    : "neutral"
              }
            >
              {req.code}
            </StatusBadge>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-950">
              {req.description}
            </p>
            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
              <span>Versión {req.version}</span>
              {req.validUntil && <span>Vence: {new Intl.DateTimeFormat("es-BO").format(req.validUntil)}</span>}
            </div>
          </div>

          {canUpdate && (
            <div className="flex shrink-0 items-center gap-2 opacity-0 focus-within:opacity-100 group-hover:opacity-100 sm:opacity-100">
              <button className="rounded bg-white p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-700">
                <Edit className="size-4" />
              </button>
              <button className="rounded bg-white p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-700">
                <Plus className="size-4" />
              </button>
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="bg-slate-50/50">
            {children.map((child) => renderRequirement(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="size-8 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-950">
          No hay requisitos registrados
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Esta normativa aún no tiene una estructura de requisitos definida.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {rootRequirements.map((req) => renderRequirement(req))}
    </div>
  );
}
