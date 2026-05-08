import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useSettings } from "@/hooks/useSettings";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { fmtPct, fmtUsd, tone } from "@/lib/format";
import { equityCurve, maxDrawdown } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { ShieldAlert, Activity, Wallet, AlertTriangle, Layers } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--gain))",
  "hsl(var(--loss))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent))",
];

export default function Risk() {
  const { settings } = useSettings();
  const status = useFreqtrade<any>("status", 4000);
  const history = useTradeHistory();

  const open: any[] = Array.isArray(status.data) ? status.data : [];
  const closed = useMemo(() => history.trades.filter((t: any) => t.close_date), [history.trades]);
  const totalProfit = closed.reduce((s, t: any) => s + Number(t.profit_abs ?? 0), 0);
  const initialBankroll = settings?.bankroll ?? 0;
  const bankroll = initialBankroll + totalProfit;

  const exposure = open.reduce((s, t) => s + Number(t.stake_amount ?? 0), 0);
  const leveredExposure = open.reduce((s, t) => s + Number(t.stake_amount ?? 0) * Number(t.leverage ?? 1), 0);
  const marginUsage = bankroll > 0 ? (exposure / bankroll) * 100 : 0;

  const slRisk = open.reduce((s, t) => {
    const open_rate = Number(t.open_rate ?? 0);
    const sl = Number(t.stop_loss_abs ?? 0);
    const amount = Number(t.amount ?? 0);
    const isShort = !!(t.is_short || t.trade_direction === "short");
    if (!open_rate || !sl || !amount) return s;
    const loss = isShort ? (sl - open_rate) * amount : (open_rate - sl) * amount;
    return s + Math.max(0, loss);
  }, 0);

  const eq = useMemo(() => equityCurve(closed), [closed]);
  const dd = useMemo(() => maxDrawdown(eq), [eq]);

  // Allocation par paire
  const allocation = useMemo(() => {
    const m = new Map<string, number>();
    open.forEach((t) => m.set(t.pair, (m.get(t.pair) ?? 0) + Number(t.stake_amount ?? 0)));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [open]);

  // Risque par trade en %
  const riskPerTrade = open.map((t) => {
    const open_rate = Number(t.open_rate ?? 0);
    const sl = Number(t.stop_loss_abs ?? 0);
    const amount = Number(t.amount ?? 0);
    const isShort = !!(t.is_short || t.trade_direction === "short");
    const lev = Number(t.leverage ?? 1);
    if (!open_rate || !sl || !amount) return { ...t, risk: null, liqDist: null };
    const loss = isShort ? (sl - open_rate) * amount : (open_rate - sl) * amount;
    const riskPct = bankroll > 0 ? (loss / bankroll) * 100 : 0;
    // Approx liquidation distance (% move against position)
    const liqDist = lev > 1 ? 100 / lev : null;
    return { ...t, risk: riskPct, liqDist };
  });

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Gestion du risque</h1>
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-4 mb-2">
        <StatCard label="Exposition" value={fmtUsd(exposure)} sub={`${open.length} positions`} icon={<Activity className="h-3.5 w-3.5" />} />
        <StatCard label="Usage marge" value={fmtPct(marginUsage)} tone={marginUsage > 80 ? "loss" : marginUsage > 50 ? "default" : "gain"} icon={<Wallet className="h-3.5 w-3.5" />} />
        <StatCard label="Exposition x levier" value={fmtUsd(leveredExposure)} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard label="Risque SL total" value={fmtUsd(slRisk)} sub={`${bankroll > 0 ? ((slRisk / bankroll) * 100).toFixed(1).replace(".", ",") : "0"}% bankroll`} tone="loss" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-3 mb-3">
        <StatCard label="Drawdown max" value={fmtUsd(-dd.abs)} sub={fmtPct(-dd.pct)} tone="loss" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <StatCard label="Bankroll" value={fmtUsd(bankroll)} sub={`Initial ${fmtUsd(initialBankroll)}`} tone={tone(totalProfit)} icon={<Wallet className="h-3.5 w-3.5" />} />
        <StatCard label="Marge libre" value={fmtUsd(Math.max(0, bankroll - exposure))} icon={<Wallet className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-2 lg:grid-cols-2 mb-2">
        <Card className="bg-card border-border rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Allocation par paire</span>
            <span className="text-[10px] tabular text-muted-foreground">{allocation.length}</span>
          </div>
          <div className="h-64 p-2">
            {allocation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Aucune position ouverte</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {allocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                    formatter={(v: any, n: any) => [fmtUsd(Number(v)), n]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="bg-card border-border rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Risque par position</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular">
              <thead className="bg-secondary/40">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-medium px-3 py-2">Paire</th>
                  <th className="text-right font-medium px-3 py-2">Mise</th>
                  <th className="text-right font-medium px-3 py-2">Levier</th>
                  <th className="text-right font-medium px-3 py-2">Risque %</th>
                  <th className="text-right font-medium px-3 py-2">Dist. liq.</th>
                </tr>
              </thead>
              <tbody>
                {riskPerTrade.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Aucune position</td></tr>
                )}
                {riskPerTrade.map((t: any, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-3 py-1.5 font-semibold">{t.pair}</td>
                    <td className="px-3 py-1.5 text-right">{fmtUsd(Number(t.stake_amount ?? 0))}</td>
                    <td className="px-3 py-1.5 text-right">x{t.leverage ?? 1}</td>
                    <td className={cn("px-3 py-1.5 text-right font-semibold", t.risk == null ? "text-muted-foreground" : t.risk > 5 ? "text-loss" : "text-foreground")}>
                      {t.risk == null ? "—" : fmtPct(-t.risk)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {t.liqDist == null ? "—" : `~${t.liqDist.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
