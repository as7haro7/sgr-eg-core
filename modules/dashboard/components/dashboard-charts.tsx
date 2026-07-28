"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardSummary } from "@/modules/dashboard/types/dashboard.types";

interface DashboardChartsProps {
  summary: DashboardSummary;
}

const RISK_COLORS = {
  Bajo: "#10b981",
  Moderado: "#f59e0b",
  Alto: "#ef4444",
  Crítico: "#991b1b",
};

export function DashboardCharts({ summary }: DashboardChartsProps) {
  const pieData = summary.riskDistribution.map((d) => ({
    name: d.level,
    value: d.count,
    color: RISK_COLORS[d.level as keyof typeof RISK_COLORS] || "#cbd5e1",
  }));

  const barData = [
    {
      name: "Efectividad",
      Alta: summary.controlEffectiveness.high,
      Media: summary.controlEffectiveness.medium,
      Baja: summary.controlEffectiveness.low,
    }
  ];

  const getCellColor = (p: number, i: number) => {
    const val = p * i;
    if (val <= summary.criticalityRanges.low[1]) return "bg-emerald-100 text-emerald-900 border-emerald-200";
    if (val <= summary.criticalityRanges.moderate[1]) return "bg-amber-100 text-amber-900 border-amber-200";
    if (val <= summary.criticalityRanges.high[1]) return "bg-orange-100 text-orange-900 border-orange-200";
    return "bg-red-100 text-red-900 border-red-200";
  };

  const getHeatmapCell = (p: number, i: number) => {
    const cellData = summary.heatmap?.find(h => h.probability === p && h.impact === i);
    const count = cellData ? cellData.count : 0;
    const colorClass = getCellColor(p, i);
    
    return (
      <div 
        key={`${p}-${i}`}
        className={`flex items-center justify-center border rounded-md text-sm font-semibold transition-colors hover:opacity-80 cursor-default ${colorClass} ${count === 0 ? 'opacity-50' : ''}`}
        title={`Probabilidad: ${p}, Impacto: ${i} -> Riesgos: ${count}`}
      >
        {count}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
      {/* Gráfico de Distribución de Riesgos */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-950">
          Distribución de Riesgos por Nivel
        </h3>
        <div className="mt-6 h-[300px] w-full">
          {summary.totalRisks > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    `${value ?? 0} riesgos`,
                    "Cantidad",
                  ]}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No hay datos suficientes
            </div>
          )}
        </div>
      </section>

      {/* Gráfico de Efectividad de Controles */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-950">
          Efectividad de Controles
        </h3>
        <div className="mt-6 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Legend verticalAlign="bottom" height={36} />
              <Bar dataKey="Alta" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Media" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Baja" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      </div>

      {/* Matriz de Calor */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-950 mb-2">
          Matriz de Riesgos (Matriz de Calor)
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Distribución de riesgos según Probabilidad e Impacto.
        </p>
        
        <div className="flex justify-center w-full overflow-x-auto">
          <div className="flex min-w-[500px]">
            {/* Y Axis Label */}
            <div className="flex flex-col justify-center items-center mr-4 w-6">
              <span className="text-xs font-semibold text-slate-500 -rotate-90 whitespace-nowrap">
                PROBABILIDAD
              </span>
            </div>

            <div className="flex flex-col">
              {/* The 5x5 Grid */}
              <div className="grid grid-cols-5 grid-rows-5 gap-1 w-[400px] h-[400px]">
                {[5, 4, 3, 2, 1].map((p) => (
                  [1, 2, 3, 4, 5].map((i) => getHeatmapCell(p, i))
                ))}
              </div>

              {/* X Axis Label */}
              <div className="flex justify-center items-center mt-4 h-6">
                <span className="text-xs font-semibold text-slate-500">
                  IMPACTO
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
