// Centralised perf/risk metrics derived from closed trades.

export interface ClosedTrade {
  profit_abs?: number | null;
  profit_ratio?: number | null;
  open_date?: string | null;
  close_date?: string | null;
  pair?: string;
  is_short?: boolean;
  trade_direction?: string;
  stake_amount?: number | null;
  leverage?: number | null;
}

export const profitFactor = (trades: ClosedTrade[]) => {
  let g = 0, l = 0;
  trades.forEach((t) => {
    const p = Number(t.profit_abs ?? 0);
    if (p > 0) g += p; else l += -p;
  });
  if (l === 0) return g > 0 ? Infinity : 0;
  return g / l;
};

export const sharpeRatio = (dailyPnL: number[]) => {
  if (dailyPnL.length < 2) return 0;
  const mean = dailyPnL.reduce((s, v) => s + v, 0) / dailyPnL.length;
  const variance = dailyPnL.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyPnL.length;
  const std = Math.sqrt(variance);
  if (!std) return 0;
  return (mean / std) * Math.sqrt(365);
};

export const equityCurve = (trades: ClosedTrade[]) => {
  let cum = 0;
  return [...trades]
    .sort((a, b) => new Date(a.close_date ?? 0).getTime() - new Date(b.close_date ?? 0).getTime())
    .map((t) => {
      cum += Number(t.profit_abs ?? 0);
      return { t: new Date(t.close_date ?? 0).getTime(), equity: Number(cum.toFixed(2)) };
    });
};

export const maxDrawdown = (equity: { equity: number }[]) => {
  let peak = -Infinity, maxDD = 0, maxDDPct = 0;
  equity.forEach(({ equity: e }) => {
    if (e > peak) peak = e;
    const dd = peak - e;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak !== 0 ? (dd / Math.abs(peak)) * 100 : 0;
    }
  });
  return { abs: maxDD, pct: maxDDPct };
};

export const drawdownSeries = (equity: { t: number; equity: number }[]) => {
  let peak = -Infinity;
  return equity.map((p) => {
    if (p.equity > peak) peak = p.equity;
    return { t: p.t, dd: Number((p.equity - peak).toFixed(2)) };
  });
};

export const avgDurationMin = (trades: ClosedTrade[]) => {
  const closed = trades.filter((t) => t.open_date && t.close_date);
  if (!closed.length) return 0;
  const total = closed.reduce((s, t) => s + (new Date(t.close_date!).getTime() - new Date(t.open_date!).getTime()), 0);
  return total / closed.length / 60000;
};

export const fmtMinutes = (m: number) => {
  if (!isFinite(m) || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}j ${rh}h`;
  }
  return h ? `${h}h ${min}m` : `${min}m`;
};

export const groupBy = <T,>(arr: T[], key: (t: T) => string) => {
  const m = new Map<string, T[]>();
  arr.forEach((it) => {
    const k = key(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  });
  return m;
};

export const aggByPair = (trades: ClosedTrade[]) => {
  const m = new Map<string, { pair: string; profit: number; count: number; wins: number }>();
  trades.forEach((t) => {
    const k = t.pair ?? "—";
    const cur = m.get(k) ?? { pair: k, profit: 0, count: 0, wins: 0 };
    cur.profit += Number(t.profit_abs ?? 0);
    cur.count += 1;
    if (Number(t.profit_ratio ?? 0) > 0) cur.wins += 1;
    m.set(k, cur);
  });
  return [...m.values()];
};

export const dailyAgg = (trades: ClosedTrade[]) => {
  const m = new Map<string, number>();
  trades.forEach((t) => {
    if (!t.close_date) return;
    const d = new Date(t.close_date).toISOString().slice(0, 10);
    m.set(d, (m.get(d) ?? 0) + Number(t.profit_abs ?? 0));
  });
  return [...m.entries()].map(([date, profit]) => ({ date, profit })).sort((a, b) => a.date.localeCompare(b.date));
};

export const weekKey = (d: Date) => {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
};

export const weeklyAgg = (trades: ClosedTrade[]) => {
  const m = new Map<string, number>();
  trades.forEach((t) => {
    if (!t.close_date) return;
    const k = weekKey(new Date(t.close_date));
    m.set(k, (m.get(k) ?? 0) + Number(t.profit_abs ?? 0));
  });
  return [...m.entries()].map(([date, profit]) => ({ date, profit })).sort((a, b) => a.date.localeCompare(b.date));
};

export const monthlyAgg = (trades: ClosedTrade[]) => {
  const m = new Map<string, number>();
  trades.forEach((t) => {
    if (!t.close_date) return;
    const d = new Date(t.close_date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    m.set(k, (m.get(k) ?? 0) + Number(t.profit_abs ?? 0));
  });
  return [...m.entries()].map(([date, profit]) => ({ date, profit })).sort((a, b) => a.date.localeCompare(b.date));
};

export const winrateRolling = (trades: ClosedTrade[], window = 20) => {
  const sorted = [...trades]
    .filter((t) => t.close_date)
    .sort((a, b) => new Date(a.close_date!).getTime() - new Date(b.close_date!).getTime());
  return sorted.map((t, i) => {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
    const w = slice.filter((s) => Number(s.profit_ratio ?? 0) > 0).length;
    return { t: new Date(t.close_date!).getTime(), wr: (w / slice.length) * 100 };
  });
};

export const histogram = (values: number[], bins = 12) => {
  if (!values.length) return [] as { range: string; count: number; mid: number }[];
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return [{ range: min.toFixed(2), count: values.length, mid: min }];
  const step = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    range: `${(min + i * step).toFixed(1)}`,
    mid: min + (i + 0.5) * step,
    count: 0,
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / step);
    if (idx >= bins) idx = bins - 1;
    out[idx].count += 1;
  });
  return out;
};
