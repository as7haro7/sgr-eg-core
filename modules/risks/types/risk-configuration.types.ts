export interface RiskCategorySummary {
  id: string;
  name: string;
  description: string | null;
  baseAppetite: number;
  status: "activo" | "inactivo";
}

export interface RiskAppetiteSummary {
  id: string;
  category: {
    id: string;
    name: string;
  };
  unit: {
    id: string;
    name: string;
  } | null;
  threshold: number;
  validFrom: Date;
  validUntil: Date | null;
}
