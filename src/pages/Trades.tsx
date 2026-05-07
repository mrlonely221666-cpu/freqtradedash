import { AppLayout } from "@/components/AppLayout";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtNum, fmtPct, fmtUsd, fmtDuration, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp, Archive } from "lucide-react";

export default function Trades() {
  const { trades, archivedCount } = useTradeHistory();
  const [pair, setPair] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return trades.filter((t: any) => {
      if (pair && !t.pair?.toLowerCase().includes(pair.toLowerCase())) return false;
      const p = Number(t.profit_ratio ?? 0);
      if (filter === "win" && p <= 0) return false;
      if (filter === "loss" && p >= 0) return false;
      const dt = new Date(t.close_date || t.open_date).getTime();
      if (from && dt < new Date(from).getTime()) return false;
      if (to && dt > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [trades, pair, filter, from, to]);

  const wins = filtered.filter((t: any) => Number(t.profit_ratio ?? 0) > 0).length;
  const losses = filtered.length - wins;

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase">Trades</h1>
          <div className="flex items-center gap-1.5 text-[11px] tabular">
            <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{filtered.length}</span>
            <span className="px-1.5 py-0.5 rounded bg-gain/10 text-gain">▲ {wins}</span>
            <span className="px-1.5 py-0.5 rounded bg-loss/10 text-loss">▼ {losses}</span>
            {archivedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                <Archive className="h-3 w-3" /> {archivedCount} archivés
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-2 grid gap-1.5 grid-cols-2 lg:grid-cols-4 p-1.5 rounded-md bg-card border border-border">
        <Input placeholder="Rechercher une paire…" value={pair} onChange={(e) => setPair(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="win">Gains</SelectItem>
            <SelectItem value="loss">Pertes</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
      </div>

      {/* Mobile */}
      <div className="sm:hidden rounded-md border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
          <div>Paire</div>
          <div className="text-right">Cours</div>
          <div className="text-right">P&L%</div>
        </div>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-xs">Aucun trade</div>
        )}
        {filtered.map((t: any, i: number) => {
          const pct = Number(t.profit_ratio ?? 0) * 100;
          const isShort = !!(t.is_short || t.trade_direction === "short");
          const positive = pct > 0;
          return (
            <button type="button" onClick={() => setSelected(t)} key={`${t.trade_id}-${i}`} className="w-full text-left group grid grid-cols-[1fr_auto_auto] gap-2 px-2.5 py-2 border-b border-border/50 last:border-b-0 hover:bg-secondary/40 transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                  <span className="font-semibold text-sm truncate">{t.pair}</span>
                  {t.archived && <Archive className="h-2.5 w-2.5 text-muted-foreground" />}
                </div>
                <div className="text-[10px] text-muted-foreground tabular mt-0.5">
                  {isShort ? "VENTE" : "ACHAT"} · {fmtUsd(Number(t.stake_amount))} · {fmtDuration(t.open_date, t.close_date)}
                </div>
              </div>
              <div className="text-right tabular text-xs self-center">
                {t.close_rate ? fmtNum(Number(t.close_rate), 6) : fmtNum(Number(t.open_rate), 6)}
              </div>
              <div className={cn("text-right tabular font-semibold text-sm self-center flex items-center gap-0.5 justify-end", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                {positive ? <ArrowUpRight className="h-3 w-3" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                {fmtPct(pct)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular">
            <thead className="bg-secondary/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium px-3 py-2">Symbole</th>
                <th className="text-left font-medium px-3 py-2">Sens</th>
                <th className="text-right font-medium px-3 py-2">Entrée</th>
                <th className="text-right font-medium px-3 py-2">Sortie</th>
                <th className="text-right font-medium px-3 py-2">Var %</th>
                <th className="text-right font-medium px-3 py-2">Mise</th>
                <th className="text-right font-medium px-3 py-2">Durée</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Aucun trade</td></tr>
              )}
              {filtered.map((t: any, i: number) => {
                const pct = Number(t.profit_ratio ?? 0) * 100;
                const isShort = !!(t.is_short || t.trade_direction === "short");
                const positive = pct > 0;
                return (
                  <tr key={`${t.trade_id}-${i}`} className="border-t border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="px-3 py-1.5 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                        {t.pair}
                        {t.archived && <Archive className="h-3 w-3 text-muted-foreground" />}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isShort ? "bg-loss/10 text-loss" : "bg-gain/10 text-gain")}>
                        {isShort ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {isShort ? "Vente" : "Achat"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">{fmtNum(Number(t.open_rate), 6)}</td>
                    <td className="px-3 py-1.5 text-right">{t.close_rate ? fmtNum(Number(t.close_rate), 6) : <span className="text-muted-foreground">—</span>}</td>
                    <td className={cn("px-3 py-1.5 text-right font-semibold", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                      <span className="inline-flex items-center gap-0.5">
                        {positive ? <ArrowUpRight className="h-3 w-3" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {fmtPct(pct)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">{fmtUsd(Number(t.stake_amount))}</td>
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
