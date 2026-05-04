import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useSettings } from "@/hooks/useSettings";
import { fmtPct, fmtUsd, tone } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Activity, TrendingUp, Wallet, Target, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { settings } = useSettings();
  const profit = useFreqtrade<any>("profit");
  const status = useFreqtrade<any>("status");
  const daily = useFreqtrade<any>("daily");

  // Alerts
  const lastTradeCount = useRef<number | null>(null);
  const wasOnline = useRef(true);
  useEffect(() => {
    const tc = profit.data?.closed_trade_count;
    if (typeof tc === "number") {
      if (lastTradeCount.current != null && tc > lastTradeCount.current) {
        toast.success(`Trade closed (${tc} total)`);
      }
      lastTradeCount.current = tc;
    }
  }, [profit.data?.closed_trade_count]);
  useEffect(() => {
    if (profit.offline && wasOnline.current) {
      toast.error("Bot is offline");
      wasOnline.current = false;
    } else if (!profit.offline && !wasOnline.current) {
      toast.success("Bot back online");
      wasOnline.current = true;
    }
  }, [profit.offline]);

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
  const winRate = profit.data?.winning_trades && tradeCount
    ? (profit.data.winning_trades / tradeCount) * 100
    : 0;

  const today = daily.data?.data?.[0]?.abs_profit ?? 0;
  const weekProfit = (daily.data?.data ?? []).slice(0, 7).reduce((s: number, d: any) => s + (d.abs_profit ?? 0), 0);

  const botRunning = !profit.offline && status.data && !status.data?.error;
  const bankroll = settings?.bankroll ?? 0;
  const roi = bankroll ? (totalProfit / bankroll) * 100 : 0;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time bot performance</p>
        </div>
        <Badge variant={botRunning ? "default" : "destructive"} className={botRunning ? "bg-gain text-background" : ""}>
          <span className="h-2 w-2 rounded-full bg-current mr-2 animate-pulse" />
          {botRunning ? "Running" : "Offline"}
        </Badge>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Profit" value={fmtUsd(totalProfit)} sub={fmtPct(totalPct)} tone={tone(totalProfit)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Today" value={fmtUsd(today)} tone={tone(today)} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="This Week" value={fmtUsd(weekProfit)} tone={tone(weekProfit)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Trades" value={tradeCount} sub={`${winRate.toFixed(1)}% win rate`} icon={<Target className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-4">
        <StatCard label="Bankroll" value={fmtUsd(bankroll)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="ROI vs Bankroll" value={fmtPct(roi)} tone={tone(roi)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Best Trade" value={fmtPct((profit.data?.best_pair_profit_ratio ?? 0) * 100)} sub={profit.data?.best_pair ?? "—"} tone="gain" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <Card className="mt-6 p-4">
        <h3 className="font-semibold mb-3">Bot status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-muted-foreground text-xs">Open trades</div><div className="font-semibold tabular">{Array.isArray(status.data) ? status.data.length : 0}</div></div>
          <div><div className="text-muted-foreground text-xs">Avg profit</div><div className="font-semibold tabular">{fmtPct((profit.data?.profit_closed_ratio_mean ?? 0) * 100)}</div></div>
          <div><div className="text-muted-foreground text-xs">Winning</div><div className="font-semibold tabular text-gain">{profit.data?.winning_trades ?? 0}</div></div>
          <div><div className="text-muted-foreground text-xs">Losing</div><div className="font-semibold tabular text-loss">{profit.data?.losing_trades ?? 0}</div></div>
        </div>
      </Card>
    </AppLayout>
  );
}
