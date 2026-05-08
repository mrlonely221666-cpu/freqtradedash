import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useSettings } from "@/hooks/useSettings";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { fmtPct, fmtUsd, tone } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Activity, TrendingUp, Wallet, Target, AlertCircle, ArrowDownRight, ArrowUpRight, Zap, Clock, Award, AlertTriangle, Scale, Layers, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { avgDurationMin, dailyAgg, equityCurve, fmtMinutes, maxDrawdown, profitFactor, sharpeRatio } from "@/lib/metrics";

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
      if (lastTradeCount.current != null && tc > lastTradeCount.current) toast.success(`Trade fermé (${tc} au total)`);
      lastTradeCount.current = tc;
    }
  }, [profit.data?.closed_trade_count]);
  useEffect(() => {
    if (profit.offline && wasOnline.current) { toast.error("Bot hors ligne"); wasOnline.current = false; }
    else if (!profit.offline && !wasOnline.current) { toast.success("Bot de retour en ligne"); wasOnline.current = true; }
  }, [profit.offline]);

  const closed = useMemo(() => history.trades.filter((t: any) => t.close_date), [history.trades]);

  const equity = useMemo(() => equityCurve(closed), [closed]);
  const dd = useMemo(() => maxDrawdown(equity), [equity]);
  const dailyData = useMemo(() => [...(daily.data?.data ?? [])].reverse().map((d: any) => ({
    date: d.date, profit: Number((d.abs_profit ?? 0).toFixed(2)),
  })), [daily.data]);
  const dailyFromHistory = useMemo(() => dailyAgg(closed), [closed]);
  const sharpe = useMemo(() => sharpeRatio(dailyFromHistory.map((d) => d.profit)), [dailyFromHistory]);
  const pf = useMemo(() => profitFactor(closed), [closed]);
  const avgDur = useMemo(() => avgDurationMin(closed), [closed]);

  const best = closed.reduce((b: any, t: any) => (Number(t.profit_abs) > (b ? Number(b.profit_abs) : -Infinity) ? t : b), null as any);
  const worst = closed.reduce((b: any, t: any) => (Number(t.profit_abs) < (b ? Number(b.profit_abs) : Infinity) ? t : b), null as any);

  // Best pair
  const bestPair = useMemo(() => {
    const map = new Map<string, number>();
    closed.forEach((t: any) => map.set(t.pair, (map.get(t.pair) ?? 0) + Number(t.profit_abs ?? 0)));
    let best: { pair: string; profit: number } | null = null;
    map.forEach((profit, pair) => { if (!best || profit > best.profit) best = { pair, profit }; });
    return best;
  }, [closed]);

  if (!settings?.api_url) {
    return (
      <AppLayout>
        <Card className="p-8 text-center max-w-lg mx-auto mt-12">
          <AlertCircle className="h-10 w-10 mx-auto text-primary mb-3" />
          <h2 className="text-xl font-bold mb-2">Configurez votre bot</h2>
          <p className="text-sm text-muted-foreground mb-4">Ajoutez l'URL de l'API Freqtrade et vos identifiants pour commencer le suivi.</p>
          <Button asChild><Link to="/settings">Ouvrir les paramètres</Link></Button>
        </Card>
      </AppLayout>
    );
  }

  const closedCount = closed.length;
  const totalProfitAll = closed.reduce((s: number, t: any) => s + Number(t.profit_abs ?? 0), 0);
  const winsAll = closed.filter((t: any) => Number(t.profit_ratio ?? 0) > 0).length;
  const lossesAll = closed.filter((t: any) => Number(t.profit_ratio ?? 0) < 0).length;
  const winRate = closedCount ? (winsAll / closedCount) * 100 : 0;
  const avgPct = closedCount
    ? (closed.reduce((s: number, t: any) => s + Number(t.profit_ratio ?? 0), 0) / closedCount) * 100
    : 0;

  const today = daily.data?.data?.[0]?.abs_profit ?? 0;
  const weekProfit = (daily.data?.data ?? []).slice(0, 7).reduce((s: number, d: any) => s + (d.abs_profit ?? 0), 0);
  const monthProfit = (daily.data?.data ?? []).slice(0, 30).reduce((s: number, d: any) => s + (d.abs_profit ?? 0), 0);
  const botRunning = !profit.offline && status.data && !status.data?.error;
  const initialBankroll = settings?.bankroll ?? 0;
  const bankroll = initialBankroll + totalProfitAll;
  const roi = initialBankroll ? (totalProfitAll / initialBankroll) * 100 : 0;
  const openCount = Array.isArray(status.data) ? status.data.length : 0;

  // Total balance from API or fallback
  const totalBalance = balance.data?.total ?? balance.data?.value ?? bankroll;

  const equityTone = totalProfitAll >= 0 ? "gain" : "loss";

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Vue d'ensemble</h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">Temps réel</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] tabular">
          <span className={cn("px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1",
            botRunning ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss")}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {botRunning ? "Actif" : "Hors ligne"}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">OUV {openCount}</span>
          <span className="px-1.5 py-0.5 rounded bg-gain/10 text-gain">▲ {winsAll}</span>
          <span className="px-1.5 py-0.5 rounded bg-loss/10 text-loss">▼ {lossesAll}</span>
        </div>
      </div>

      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4 mb-2">
        <StatCard label="Solde total" value={fmtUsd(Number(totalBalance))} sub={`Initial ${fmtUsd(initialBankroll)}`} tone={tone(totalProfitAll)} icon={<Wallet className="h-3.5 w-3.5" />} />
        <StatCard label="P&L Total" value={fmtUsd(totalProfitAll)} sub={fmtPct(avgPct)} tone={tone(totalProfitAll)} icon={totalProfitAll >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />} />
        <StatCard label="ROI" value={fmtPct(roi)} tone={tone(roi)} icon={<Zap className="h-3.5 w-3.5" />} />
        <StatCard label="Winrate" value={`${winRate.toFixed(1).replace(".", ",")}%`} sub={`${winsAll}/${closedCount}`} tone={winRate >= 50 ? "gain" : "loss"} icon={<Target className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4 mb-2">
        <StatCard label="Aujourd'hui" value={fmtUsd(today)} tone={tone(today)} icon={<Activity className="h-3.5 w-3.5" />} />
        <StatCard label="7 jours" value={fmtUsd(weekProfit)} tone={tone(weekProfit)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="30 jours" value={fmtUsd(monthProfit)} tone={tone(monthProfit)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Ouverts / Fermés" value={`${openCount} / ${closedCount}`} icon={<Layers className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4 mb-2">
        <StatCard label="Profit Factor" value={isFinite(pf) ? pf.toFixed(2).replace(".", ",") : "∞"} tone={pf >= 1 ? "gain" : "loss"} icon={<Scale className="h-3.5 w-3.5" />} />
        <StatCard label="Sharpe" value={sharpe.toFixed(2).replace(".", ",")} tone={sharpe >= 1 ? "gain" : sharpe < 0 ? "loss" : "default"} icon={<Award className="h-3.5 w-3.5" />} />
        <StatCard label="Drawdown max" value={fmtUsd(-dd.abs)} sub={fmtPct(-dd.pct)} tone="loss" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <StatCard label="Durée moy." value={fmtMinutes(avgDur)} icon={<Clock className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4 mb-3">
        <StatCard label="Total gains" value={winsAll} tone="gain" icon={<ArrowUpRight className="h-3.5 w-3.5" />} />
        <StatCard label="Total pertes" value={lossesAll} tone="loss" icon={<ArrowDownRight className="h-3.5 w-3.5" />} />
        <StatCard label="Meilleur trade" value={fmtUsd(best?.profit_abs ?? 0)} sub={best?.pair ?? "—"} tone="gain" icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Pire trade" value={fmtUsd(worst?.profit_abs ?? 0)} sub={worst?.pair ?? "—"} tone="loss" icon={<TrendingDown className="h-3.5 w-3.5" />} />
      </div>

      <Card className="bg-card border-border rounded-md overflow-hidden mb-2">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Capital</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">USDT</span>
          </div>
          <div className="flex items-center gap-2 tabular">
            <span className={cn("text-sm font-bold", equityTone === "gain" ? "text-gain" : "text-loss")}>
              {fmtUsd(totalProfitAll)}
            </span>
            <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded",
              equityTone === "gain" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss")}>
              {fmtPct(avgPct)}
            </span>
          </div>
        </div>
        <div className="h-48 sm:h-64 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`hsl(var(--${equityTone}))`} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={`hsl(var(--${equityTone}))`} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" stroke="hsl(var(--muted-foreground))" fontSize={10}
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                labelFormatter={(v) => new Date(v).toLocaleString("fr-FR")}
                formatter={(v: any) => [fmtUsd(Number(v)), "Capital"]}
              />
              <Area type="monotone" dataKey="equity" stroke={`hsl(var(--${equityTone}))`} strokeWidth={1.5} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="bg-card border-border rounded-md overflow-hidden mb-2">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">P&L journalier</span>
          <span className="text-[10px] tabular text-muted-foreground">{dailyData.length} jours</span>
        </div>
        <div className="h-32 sm:h-40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                formatter={(v: any) => [fmtUsd(Number(v)), "Profit"]}
                cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
              />
              <Bar dataKey="profit" radius={[2, 2, 0, 0]}
                shape={(props: any) => {
                  const fill = props.payload.profit >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))";
                  return <rect {...props} fill={fill} />;
                }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-3 bg-card border-border rounded-md flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Meilleure paire : <span className="text-foreground font-semibold">{bestPair?.pair ?? "—"}</span>
          <span className="ml-2 text-gain font-semibold">{fmtUsd(bestPair?.profit ?? 0)}</span>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/analytics">Voir l'analytique</Link></Button>
      </Card>
    </AppLayout>
  );
}
