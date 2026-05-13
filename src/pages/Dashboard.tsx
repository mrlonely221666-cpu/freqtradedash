import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useSettings } from "@/hooks/useSettings";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { fmtPct, fmtUsd, tone } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { CircleAlert as AlertCircle, TrendingUp, Wallet, Target, ArrowUpRight, ArrowDownRight, Zap, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { avgDurationMin, dailyAgg, equityCurve, fmtMinutes, maxDrawdown, profitFactor } from "@/lib/metrics";

export default function Dashboard() {
  const { settings } = useSettings();
  const profit = useFreqtrade<any>("profit");
  const status = useFreqtrade<any>("status");
  const daily = useFreqtrade<any>("daily");
  const balance = useFreqtrade<any>("balance");
  const history = useTradeHistory();

  const lastTradeCount = useRef<number | null>(null);
  const wasOnline = useRef(true);

  useEffect(() => {
    const tc = profit.data?.closed_trade_count;
    if (typeof tc === "number") {
      if (lastTradeCount.current != null && tc > lastTradeCount.current)
        toast.success(`Trade fermé (${tc} au total)`);
      lastTradeCount.current = tc;
    }
  }, [profit.data?.closed_trade_count]);

  useEffect(() => {
    if (profit.offline && wasOnline.current) { toast.error("Bot hors ligne"); wasOnline.current = false; }
    else if (!profit.offline && !wasOnline.current) { toast.success("Bot en ligne"); wasOnline.current = true; }
  }, [profit.offline]);

  const closed = useMemo(() => history.trades.filter((t: any) => t.close_date), [history.trades]);
  const equity = useMemo(() => equityCurve(closed), [closed]);
  const dd = useMemo(() => maxDrawdown(equity), [equity]);

  const dailyData = useMemo(() =>
    [...(daily.data?.data ?? [])].reverse().map((d: any) => ({
      date: d.date, profit: Number((d.abs_profit ?? 0).toFixed(2)),
    })), [daily.data]);

  const dailyFromHistory = useMemo(() => dailyAgg(closed), [closed]);
  const avgDur = useMemo(() => avgDurationMin(closed), [closed]);
  const pf = useMemo(() => profitFactor(closed), [closed]);

  if (!settings?.api_url) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Configurer le bot</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Ajoutez l'URL de l'API Freqtrade et vos identifiants pour commencer le suivi.
          </p>
          <Button asChild size="lg">
            <Link to="/settings">Ouvrir les paramètres</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const closedCount = closed.length;
  const totalProfitAll = closed.reduce((s: number, t: any) => s + Number(t.profit_abs ?? 0), 0);
  const winsAll = closed.filter((t: any) => Number(t.profit_ratio ?? 0) > 0).length;
  const winRate = closedCount ? (winsAll / closedCount) * 100 : 0;
  const avgPct = closedCount
    ? (closed.reduce((s: number, t: any) => s + Number(t.profit_ratio ?? 0), 0) / closedCount) * 100
    : 0;

  const today = daily.data?.data?.[0]?.abs_profit ?? 0;
  const monthProfit = (daily.data?.data ?? []).slice(0, 30).reduce((s: number, d: any) => s + (d.abs_profit ?? 0), 0);
  const botRunning = !profit.offline && status.data && !status.data?.error;
  const initialBankroll = settings?.bankroll ?? 0;
  const bankroll = initialBankroll + totalProfitAll;
  const roi = initialBankroll ? (totalProfitAll / initialBankroll) * 100 : 0;
  const openCount = Array.isArray(status.data) ? status.data.length : 0;
  const totalBalance = balance.data?.total ?? balance.data?.value ?? bankroll;
  const equityTone = totalProfitAll >= 0 ? "gain" : "loss";

  return (
    <AppLayout>
      {/* Status bar */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
            botRunning ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss"
          )}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {botRunning ? "Bot actif" : "Bot hors ligne"}
          </span>
          <span className="text-xs text-muted-foreground tabular">
            {openCount} trade{openCount !== 1 ? "s" : ""} ouvert{openCount !== 1 ? "s" : ""}
          </span>
        </div>
        {openCount > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link to="/open">Voir les positions</Link>
          </Button>
        )}
      </div>

      {/* Primary metrics */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 mb-2">
        <StatCard
          label="Solde"
          value={fmtUsd(Number(totalBalance))}
          sub={`ROI ${fmtPct(roi)}`}
          tone={tone(totalProfitAll)}
          icon={<Wallet className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="P&L total"
          value={fmtUsd(totalProfitAll)}
          sub={fmtPct(avgPct) + " / trade"}
          tone={tone(totalProfitAll)}
          icon={totalProfitAll >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Winrate"
          value={`${winRate.toFixed(1).replace(".", ",")}%`}
          sub={`${winsAll} / ${closedCount} trades`}
          tone={winRate >= 50 ? "gain" : "loss"}
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Durée moy."
          value={fmtMinutes(avgDur)}
          sub="par trade fermé"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard label="Aujourd'hui" value={fmtUsd(today)} tone={tone(today)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="30 jours" value={fmtUsd(monthProfit)} tone={tone(monthProfit)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Drawdown max" value={fmtPct(-dd.pct)} sub={fmtUsd(-dd.abs)} tone="loss" icon={<ArrowDownRight className="h-3.5 w-3.5" />} />
        <StatCard
          label="Profit Factor"
          value={isFinite(pf) ? pf.toFixed(2) : "∞"}
          tone={pf >= 1 ? "gain" : "loss"}
          icon={<Zap className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Equity chart */}
      <Card className="bg-card border-border rounded-md overflow-hidden mb-2">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Courbe de capital</span>
          <span className={cn("text-sm font-bold tabular", equityTone === "gain" ? "text-gain" : "text-loss")}>
            {fmtUsd(totalProfitAll)}
          </span>
        </div>
        <div className="h-52 sm:h-64 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`hsl(var(--${equityTone}))`} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={`hsl(var(--${equityTone}))`} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time"
                stroke="hsl(var(--muted-foreground))" fontSize={10}
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })}
                tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                orientation="right" width={52}
                tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                labelFormatter={(v) => new Date(v).toLocaleString("fr-FR")}
                formatter={(v: any) => [fmtUsd(Number(v)), "Capital"]}
              />
              <Area type="monotone" dataKey="equity" stroke={`hsl(var(--${equityTone}))`} strokeWidth={2} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Daily PnL */}
      <Card className="bg-card border-border rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">P&L journalier</span>
          <span className="text-[10px] tabular text-muted-foreground">{dailyData.length} jours</span>
        </div>
        <div className="h-36 sm:h-44 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                orientation="right" width={52} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                formatter={(v: any) => [fmtUsd(Number(v)), "Profit"]}
                cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
              />
              <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
                {dailyData.map((d: any, i: number) => (
                  <Cell key={i} fill={d.profit >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppLayout>
  );
}
