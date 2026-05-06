export const fmtNum = (n: number | null | undefined, digits = 2) =>
  n == null || isNaN(n) ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtUsd = (n: number | null | undefined, digits = 2) =>
  n == null || isNaN(n) ? "—" : (n >= 0 ? "" : "-") + "$" + Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtPct = (n: number | null | undefined, digits = 2) =>
  n == null || isNaN(n) ? "—" : (n >= 0 ? "+" : "") + n.toFixed(digits).replace(".", ",") + "%";

export const tone = (n: number | null | undefined): "gain" | "loss" | "default" =>
  n == null ? "default" : n > 0 ? "gain" : n < 0 ? "loss" : "default";

export const fmtDuration = (open: string, close?: string | null) => {
  if (!open) return "—";
  const start = new Date(open).getTime();
  const end = close ? new Date(close).getTime() : Date.now();
  const s = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};
