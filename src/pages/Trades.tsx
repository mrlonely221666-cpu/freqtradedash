import { AppLayout } from "@/components/AppLayout";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtNum, fmtPct, fmtUsd, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";

export default function Trades() {
  const { data } = useFreqtrade<any>("trades");
  const [pair, setPair] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const trades: any[] = data?.trades ?? [];

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (pair && !t.pair?.toLowerCase().includes(pair.toLowerCase())) return false;
      const p = t.profit_ratio ?? 0;
      if (filter === "win" && p <= 0) return false;
      if (filter === "loss" && p >= 0) return false;
      const dt = new Date(t.close_date || t.open_date).getTime();
      if (from && dt < new Date(from).getTime()) return false;
      if (to && dt > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [trades, pair, filter, from, to]);

  const wins = filtered.filter((t) => (t.profit_ratio ?? 0) > 0).length;
  const losses = filtered.length - wins;

  return (
    <AppLayout>
      {/* Toolbar — TradingView style */}
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase">Trades</h1>
          <div className="flex items-center gap-1.5 text-[11px] tabular">
            <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{filtered.length}</span>
            <span className="px-1.5 py-0.5 rounded bg-gain/10 text-gain">▲ {wins}</span>
            <span className="px-1.5 py-0.5 rounded bg-loss/10 text-loss">▼ {losses}</span>
          </div>
        </div>
      </div>

      {/* Filter strip */}
      <div className="mb-2 grid gap-1.5 grid-cols-2 lg:grid-cols-4 p-1.5 rounded-md bg-card border border-border">
        <Input placeholder="Search pair…" value={pair} onChange={(e) => setPair(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="win">Wins</SelectItem>
            <SelectItem value="loss">Losses</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
      </div>

      {/* Mobile — compact ticker rows */}
      <div className="sm:hidden rounded-md border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
          <div>Pair</div>
          <div className="text-right">Last</div>
          <div className="text-right">P&L%</div>
        </div>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-xs">No trades</div>
        )}
        {filtered.map((t) => {
          const pct = (t.profit_ratio ?? 0) * 100;
          const isShort = t.is_short || t.trade_direction === "short";
          const positive = pct > 0;
          return (
            <div key={t.trade_id} className="group grid grid-cols-[1fr_auto_auto] gap-2 px-2.5 py-2 border-b border-border/50 last:border-b-0 hover:bg-secondary/40 transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                  <span className="font-semibold text-sm truncate">{t.pair}</span>
                </div>
                <div className="text-[10px] text-muted-foreground tabular mt-0.5">
                  {isShort ? "SHORT" : "LONG"} · {fmtUsd(t.stake_amount)} · {fmtDuration(t.open_date, t.close_date)}
                </div>
              </div>
              <div className="text-right tabular text-xs self-center">
                {t.close_rate ? fmtNum(t.close_rate, 6) : fmtNum(t.open_rate, 6)}
              </div>
              <div className={cn("text-right tabular font-semibold text-sm self-center flex items-center gap-0.5 justify-end", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                {positive ? <ArrowUpRight className="h-3 w-3" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                {fmtPct(pct)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop — TradingView style table */}
      <div className="hidden sm:block rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular">
            <thead className="bg-secondary/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium px-3 py-2">Symbol</th>
                <th className="text-left font-medium px-3 py-2">Side</th>
                <th className="text-right font-medium px-3 py-2">Entry</th>
                <th className="text-right font-medium px-3 py-2">Exit</th>
                <th className="text-right font-medium px-3 py-2">Chg %</th>
                <th className="text-right font-medium px-3 py-2">Stake</th>
                <th className="text-right font-medium px-3 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No trades</td></tr>
              )}
              {filtered.map((t) => {
                const pct = (t.profit_ratio ?? 0) * 100;
                const isShort = t.is_short || t.trade_direction === "short";
                const positive = pct > 0;
                return (
                  <tr key={t.trade_id} className="border-t border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="px-3 py-1.5 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                        {t.pair}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isShort ? "bg-loss/10 text-loss" : "bg-gain/10 text-gain")}>
                        {isShort ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {isShort ? "Short" : "Long"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">{fmtNum(t.open_rate, 6)}</td>
                    <td className="px-3 py-1.5 text-right">{t.close_rate ? fmtNum(t.close_rate, 6) : <span className="text-muted-foreground">—</span>}</td>
                    <td className={cn("px-3 py-1.5 text-right font-semibold", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                      <span className="inline-flex items-center gap-0.5">
                        {positive ? <ArrowUpRight className="h-3 w-3" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {fmtPct(pct)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">{fmtUsd(t.stake_amount)}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{fmtDuration(t.open_date, t.close_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
