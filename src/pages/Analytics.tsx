import { AppLayout } from "@/components/AppLayout";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { fmtPct, fmtUsd, tone } from "@/lib/format";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Analytics() {
  const trades = useFreqtrade<any>("trades");
  const daily = useFreqtrade<any>("daily");

  const closed = (trades.data?.trades ?? []).filter((t: any) => t.close_date);

  const equity = useMemo(() => {
    let cum = 0;
    return [...closed]
      .sort((a, b) => new Date(a.close_date).getTime() - new Date(b.close_date).getTime())
      .map((t) => {
        cum += t.profit_abs ?? 0;
        return { date: new Date(t.close_date).toLocaleDateString(), equity: Number(cum.toFixed(2)) };
      });
  }, [closed]);

  const dailyData = useMemo(() => {
    return [...(daily.data?.data ?? [])]
      .reverse()
      .map((d: any) => ({ date: d.date, profit: Number((d.abs_profit ?? 0).toFixed(2)) }));
  }, [daily.data]);

  const best = closed.reduce((b: any, t: any) => (t.profit_abs > (b?.profit_abs ?? -Infinity) ? t : b), null);
  const worst = closed.reduce((b: any, t: any) => (t.profit_abs < (b?.profit_abs ?? Infinity) ? t : b), null);
  const avg = closed.length ? closed.reduce((s: number, t: any) => s + (t.profit_abs ?? 0), 0) / closed.length : 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance over time</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-4">
        <StatCard label="Best trade" value={fmtUsd(best?.profit_abs ?? 0)} sub={best?.pair ?? "—"} tone="gain" />
        <StatCard label="Worst trade" value={fmtUsd(worst?.profit_abs ?? 0)} sub={worst?.pair ?? "—"} tone="loss" />
        <StatCard label="Avg / trade" value={fmtUsd(avg)} tone={tone(avg)} />
      </div>

      <Card className="p-4 mb-4">
        <h3 className="font-semibold mb-4">Equity curve</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equity}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Daily performance</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: any) => fmtUsd(Number(v))}
              />
              <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppLayout>
  );
}
