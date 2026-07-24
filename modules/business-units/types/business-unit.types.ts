export interface BusinessUnitOption {
  id: string;
  name: string;
  currency: string;
  country: {
    id: string;
    name: string;
    isoCode: string;
  };
}

export interface CountrySummary {
  id: string;
  name: string;
  isoCode: string;
  status: "activo" | "inactivo";
}

export interface BusinessUnitSummary extends BusinessUnitOption {
  status: "activo" | "inactivo";
}
