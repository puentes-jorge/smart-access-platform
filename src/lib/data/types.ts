export type ModuleKey = "residents" | "zones" | "incidents" | "automations" | "devices" | "reports" | "reservations";

export type ModuleData = {
  title: string;
  subtitle: string;
  action: string;
  columns: string[];
  rows: string[][];
  metrics?: { label: string; value: string; detail: string }[];
  empty?: string;
};
