import { AppLayout } from "@/components/AppLayout";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { fmtUsd, fmtPct, tone } from "@/lib/format";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Trophy, AlertTriangle } from "lucide-react";
import { aggByPair, dailyAgg, drawdownSeries, equityCurve, fmtMinutes, histogram, monthlyAgg, weeklyAgg, winrateRolling } from "@/lib/metrics";

export default function Analytics() {
  const history = useTradeHistory();
  const daily = useFreqtrade<any>("daily");

  const closed = useMemo(() => history.trades.filter((t: any) => t.close_date), [history.trades]);

  const equity = useMemo(() => equityCurve(closed), [closed]);
  const dd = useMemo(() => drawdownSeries(equity), [equity]);

  const dailyApi = useMemo(() => [...(daily.data?.data ?? [])].reverse().map((d: any) => ({
    date: d.date, profit: Number((d.abs_profit ?? 0).toFixed(2)),
  })), [daily.data]);
  const dailyHist = useMemo(() => dailyAgg(closed), [closed]);
  const dailyData = dailyApi.length ? dailyApi : dailyHist;
  const weekly = useMemo(() => weeklyAgg(closed), [closed]);
  const monthly = useMemo(() => monthlyAgg(closed), [closed]);
  const wrRolling = useMemo(() => winrateRolling(closed, 20), [closed]);

  const profits = closed.map((t: any) => Number(t.profit_abs ?? 0));
  const profitDist = useMemo(() => histogram(profits, 12), [profits]);

  const durations = closed
    .filter((t: any) => t.open_date && t.close_date)
    .map((t: any) => (new Date(t.close_date).getTime() - new Date(t.open_date).getTime()) / 60000);
  const durationDist = useMemo(() => histogram(durations, 10), [durations]);

  const longShort = useMemo(() => {
    const acc = { Long: 0, Short: 0 };
    closed.forEach((t: any) => {
      const isShort = !!(t.is_short || t.trade_direction === "short");
      acc[isShort ? "Short" : "Long"] += Number(t.profit_abs ?? 0);
    });
    return [
      { side: "Long", profit: Number(acc.Long.toFixed(2)) },
      { side: "Short", profit: Number(acc.Short.toFixed(2)) },
    ];
  }, [closed]);

  const pairs = useMemo(() => aggByPair(closed), [closed]);
  const bestPairs = [...pairs].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const worstPairs = [...pairs].sort((a, b) => a.profit - b.profit).slice(0, 5);

  const best = closed.reduce((b: any, t: any) => (Number(t.profit_abs) > (b ? Number(b.profit_abs) : -Infinity) ? t : b), null as any);
  const worst = closed.reduce((b: any, t: any) => (Number(t.profit_abs) < (b ? Number(b.profit_abs) : Infinity) ? t : b), null as any);
  const avg = closed.length ? closed.reduce((s: number, t: any) => s + Number(t.profit_abs ?? 0), 0) / closed.length : 0;
  const totalEq = equity.length ? equity[equity.length - 1].equity : 0;
  const eqTone: "gain" | "loss" = totalEq >= 0 ? "gain" : "loss";

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Analytique</h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">Performance</span>
        </div>
        <span className="text-[10px] tabular px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{closed.length} fermés</span>
      </div>

      <div className="grid gap-1.5 grid-cols-3 mb-2">
        <StatCard label="Meilleur" value={fmtUsd(best?.profit_abs ?? 0)} sub={best?.pair ?? "—"} tone="gain" icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Pire" value={fmtUsd(worst?.profit_abs ?? 0)} sub={worst?.pair ?? "—"} tone="loss" icon={<TrendingDown className="h-3.5 w-3.5" />} />
        <StatCard label="Moy. / trade" value={fmtUsd(avg)} tone={tone(avg)} icon={<BarChart3 className="h-3.5 w-3.5" />} />
      </div>

      <Card className="bg-card border-border rounded-md overflow-hidden mb-2">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Courbe de capital</span>
          <span className={`text-sm font-bold tabular ${eqTone === "gain" ? "text-gain" : "text-loss"}`}>{fmtUsd(totalEq)}</span>
        </div>
        <div className="h-56 sm:h-72 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`hsl(var(--${eqTone}))`} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={`hsl(var(--${eqTone}))`} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" stroke="hsl(var(--muted-foreground))" fontSize={10}
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                labelFormatter={(v) => new Date(v).toLocaleString("fr-FR")} formatter={(v: any) => [fmtUsd(Number(v)), "Capital"]} />
              <Area type="monotone" dataKey="equity" stroke={`hsl(var(--${eqTone}))`} strokeWidth={1.5} fill="url(#eqA)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-2 lg:grid-cols-2 mb-2">
        <ChartCard title="Drawdown" subtitle="Perte depuis le dernier sommet">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dd} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ddA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" stroke="hsl(var(--muted-foreground))" fontSize={10}
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                formatter={(v: any) => [fmtUsd(Number(v)), "DD"]} />
              <Area type="monotone" dataKey="dd" stroke="hsl(var(--loss))" strokeWidth={1.5} fill="url(#ddA)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution du winrate" subtitle="Glissant 20 trades">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wrRolling} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" stroke="hsl(var(--muted-foreground))" fontSize={10}
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Winrate"]} />
              <Line type="monotone" dataKey="wr" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Performance journalière" subtitle={`${dailyData.length} jours`} className="mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
              tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
              cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} formatter={(v: any) => [fmtUsd(Number(v)), "Profit"]} />
            <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
              {dailyData.map((d: any, i: number) => (
                <Cell key={i} fill={d.profit >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-2 lg:grid-cols-2 mb-2">
        <ChartCard title="Performance hebdomadaire" subtitle={`${weekly.length} semaines`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} formatter={(v: any) => [fmtUsd(Number(v)), "Profit"]} />
              <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
                {weekly.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Performance mensuelle" subtitle={`${monthly.length} mois`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} formatter={(v: any) => [fmtUsd(Number(v)), "Profit"]} />
              <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
                {monthly.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-2 lg:grid-cols-2 mb-2">
        <ChartCard title="Distribution des profits" subtitle="Histogramme">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profitDist} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={40} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {profitDist.map((d, i) => <Cell key={i} fill={d.mid >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribution des durées" subtitle="Minutes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={durationDist} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false}
                tickFormatter={(v) => fmtMinutes(Number(v))} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={40} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} labelFormatter={(v) => fmtMinutes(Number(v))} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Long vs Short" subtitle="Profit cumulé par sens" className="mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={longShort} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="side" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
              cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} formatter={(v: any) => [fmtUsd(Number(v)), "Profit"]} />
            <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
              {longShort.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-2 lg:grid-cols-2">
        <RankCard title="Top paires" icon={<Trophy className="h-3.5 w-3.5 text-gain" />} items={bestPairs} />
        <RankCard title="Pires paires" icon={<AlertTriangle className="h-3.5 w-3.5 text-loss" />} items={worstPairs} />
      </div>
    </AppLayout>
  );
}

function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`bg-card border-border rounded-md overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{title}</span>
        {subtitle && <span className="text-[10px] tabular text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="h-56 sm:h-64 p-2">{children}</div>
    </Card>
  );
}

function RankCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: { pair: string; profit: number; count: number; wins: number }[] }) {
  return (
    <Card className="bg-card border-border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium flex items-center gap-1.5">{icon}{title}</span>
      </div>
      <table className="w-full text-xs tabular">
        <thead className="bg-secondary/20">
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left font-medium px-3 py-1.5">Paire</th>
            <th className="text-right font-medium px-3 py-1.5">Trades</th>
            <th className="text-right font-medium px-3 py-1.5">WR</th>
            <th className="text-right font-medium px-3 py-1.5">Profit</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Aucune donnée</td></tr>}
          {items.map((p) => (
            <tr key={p.pair} className="border-t border-border/50">
              <td className="px-3 py-1.5 font-semibold">{p.pair}</td>
              <td className="px-3 py-1.5 text-right text-muted-foreground">{p.count}</td>
              <td className="px-3 py-1.5 text-right text-muted-foreground">{((p.wins / p.count) * 100).toFixed(0)}%</td>
              <td className={`px-3 py-1.5 text-right font-semibold ${p.profit >= 0 ? "text-gain" : "text-loss"}`}>{fmtUsd(p.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
