import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useSettings } from "@/hooks/useSettings";
import { fmtPct, fmtUsd, tone } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Activity, TrendingUp, Wallet, Target, AlertCircle, ArrowDownRight, ArrowUpRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const { settings } = useSettings();
  const profit = useFreqtrade<any>("profit");
  const status = useFreqtrade<any>("status");
  const daily = useFreqtrade<any>("daily");
  const trades = useFreqtrade<any>("trades");

  const lastTradeCount = useRef<number | null>(null);
  const wasOnline = useRef(true);
  useEffect(() => {
    const tc = profit.data?.closed_trade_count;
    if (typeof tc === "number") {
      if (lastTradeCount.current != null && tc > lastTradeCount.current) toast.success(`Trade closed (${tc} total)`);
      lastTradeCount.current = tc;
    }
  }, [profit.data?.closed_trade_count]);
  useEffect(() => {
    if (profit.offline && wasOnline.current) { toast.error("Bot is offline"); wasOnline.current = false; }
    else if (!profit.offline && !wasOnline.current) { toast.success("Bot back online"); wasOnline.current = true; }
  }, [profit.offline]);

  const closed = useMemo(() => (trades.data?.trades ?? []).filter((t: any) => t.close_date), [trades.data]);
  const equity = useMemo(() => {
    let cum = 0;
    return [...closed]
      .sort((a, b) => new Date(a.close_date).getTime() - new Date(b.close_date).getTime())
      .map((t) => { cum += t.profit_abs ?? 0; return { t: new Date(t.close_date).getTime(), equity: Number(cum.toFixed(2)) }; });
  }, [closed]);
  const dailyData = useMemo(() => [...(daily.data?.data ?? [])].reverse().map((d: any) => ({
    date: d.date, profit: Number((d.abs_profit ?? 0).toFixed(2)),
  })), [daily.data]);

  if (!settings?.api_url) {
    return (
      <AppLayout>
        <Card className="p-8 text-center max-w-lg mx-auto mt-12">
          <AlertCircle className="h-10 w-10 mx-auto text-primary mb-3" />
          <h2 className="text-xl font-bold mb-2">Configure your bot</h2>
          <p className="text-sm text-muted-foreground mb-4">Add the Freqtrade API URL & credentials to start monitoring.</p>
          <Button asChild><Link to="/settings">Open settings</Link></Button>
        </Card>
      </AppLayout>
    );
  }

  const totalProfit = profit.data?.profit_closed_coin ?? 0;
  const totalPct = (profit.data?.profit_closed_ratio_mean ?? 0) * 100;
  const tradeCount = profit.data?.closed_trade_count ?? 0;
  const winRate = profit.data?.winning_trades && tradeCount ? (profit.data.winning_trades / tradeCount) * 100 : 0;
  const today = daily.data?.data?.[0]?.abs_profit ?? 0;
  const weekProfit = (daily.data?.data ?? []).slice(0, 7).reduce((s: number, d: any) => s + (d.abs_profit ?? 0), 0);
  const botRunning = !profit.offline && status.data && !status.data?.error;
  const bankroll = settings?.bankroll ?? 0;
  const roi = bankroll ? (totalProfit / bankroll) * 100 : 0;
  const openCount = Array.isArray(status.data) ? status.data.length : 0;

  const equityTone = totalProfit >= 0 ? "gain" : "loss";

  return (
    <AppLayout>
      {/* Ticker tape header */}
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Overview</h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">Real-time</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] tabular">
          <span className={cn("px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1",
            botRunning ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss")}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {botRunning ? "Active" : "Offline"}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">OPEN {openCount}</span>
          <span className="px-1.5 py-0.5 rounded bg-gain/10 text-gain">▲ {profit.data?.winning_trades ?? 0}</span>
          <span className="px-1.5 py-0.5 rounded bg-loss/10 text-loss">▼ {profit.data?.losing_trades ?? 0}</span>
        </div>
      </div>

      {/* Top stat ticker grid */}
      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4 mb-2">
        <StatCard label="P&L Total" value={fmtUsd(totalProfit)} sub={fmtPct(totalPct)} tone={tone(totalProfit)} icon={totalProfit >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />} />
        <StatCard label="Today" value={fmtUsd(today)} tone={tone(today)} icon={<Activity className="h-3.5 w-3.5" />} />
        <StatCard label="7D" value={fmtUsd(weekProfit)} tone={tone(weekProfit)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Trades" value={tradeCount} sub={`${winRate.toFixed(1)}% WR`} icon={<Target className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-3 mb-3">
        <StatCard label="Bankroll" value={fmtUsd(bankroll)} icon={<Wallet className="h-3.5 w-3.5" />} />
        <StatCard label="ROI" value={fmtPct(roi)} tone={tone(roi)} icon={<Zap className="h-3.5 w-3.5" />} />
        <StatCard label="Best Pair" value={fmtPct((profit.data?.best_pair_profit_ratio ?? 0) * 100)} sub={profit.data?.best_pair ?? "—"} tone="gain" icon={<TrendingUp className="h-3.5 w-3.5" />} />
      </div>

      {/* Equity chart hero — TradingView style */}
      <Card className="bg-card border-border rounded-md overflow-hidden mb-2">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Equity</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">USDT</span>
          </div>
          <div className="flex items-center gap-2 tabular">
            <span className={cn("text-sm font-bold", equityTone === "gain" ? "text-gain" : "text-loss")}>
              {fmtUsd(totalProfit)}
            </span>
            <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded",
              equityTone === "gain" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss")}>
              {fmtPct(totalPct)}
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
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} orientation="right" width={50} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                labelFormatter={(v) => new Date(v).toLocaleString()}
                formatter={(v: any) => [fmtUsd(Number(v)), "Equity"]}
              />
              <Area type="monotone" dataKey="equity" stroke={`hsl(var(--${equityTone}))`} strokeWidth={1.5} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Daily volume bars */}
      <Card className="bg-card border-border rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Daily P&L</span>
          <span className="text-[10px] tabular text-muted-foreground">{dailyData.length} days</span>
        </div>
        <div className="h-32 sm:h-40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
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
    </AppLayout>
  );
}
