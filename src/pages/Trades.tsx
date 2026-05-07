import { AppLayout } from "@/components/AppLayout";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtNum, fmtPct, fmtUsd, fmtDuration, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Archive } from "lucide-react";

export default function Trades() {
  const { trades, archivedCount } = useTradeHistory();
  const [pair, setPair] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

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
                  <tr key={`${t.trade_id}-${i}`} onClick={() => setSelected(t)} className="border-t border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer">
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          {selected && (() => {
            const t = selected;
            const pct = Number(t.profit_ratio ?? 0) * 100;
            const profit = Number(t.profit_abs ?? 0);
            const isShort = !!(t.is_short || t.trade_direction === "short");
            const open = Number(t.open_rate ?? 0);
            const close = t.close_rate != null ? Number(t.close_rate) : null;
            const isOpen = close == null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
                    <span className={cn("h-2 w-2 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                    {t.pair}
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isShort ? "bg-loss/10 text-loss" : "bg-gain/10 text-gain")}>
                      {isShort ? "Vente" : "Achat"}
                    </span>
                    {isOpen && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">Ouvert</span>}
                    {t.archived && <Archive className="h-3.5 w-3.5 text-muted-foreground" />}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2 text-xs tabular mt-2">
                  <Detail label="ID Trade" value={`#${t.trade_id}`} />
                  <Detail label="Stratégie" value={t.strategy ?? t.enter_tag ?? "—"} />
                  <Detail label="Date d'entrée" value={fmtDateTime(t.open_date)} />
                  <Detail label="Date de sortie" value={isOpen ? "—" : fmtDateTime(t.close_date)} />
                  <Detail label="Durée" value={fmtDuration(t.open_date, t.close_date)} />
                  <Detail label="Raison sortie" value={t.exit_reason ?? "—"} />
                  <Detail label="Cours d'entrée" value={fmtNum(open, 6)} />
                  <Detail label="Cours de sortie" value={close != null ? fmtNum(close, 6) : "—"} />
                  <Detail label="Quantité" value={fmtNum(Number(t.amount ?? 0), 6)} />
                  <Detail label="Mise" value={fmtUsd(Number(t.stake_amount ?? 0))} />
                  <Detail label="Effet de levier" value={t.leverage ? `x${t.leverage}` : "x1"} />
                  <Detail label="Frais" value={t.fee_close_cost != null ? fmtUsd(Number(t.fee_open_cost ?? 0) + Number(t.fee_close_cost ?? 0)) : "—"} />
                  <Detail label="Stop loss" value={t.stop_loss_abs ? fmtNum(Number(t.stop_loss_abs), 6) : "—"} />
                  <Detail label="Take profit" value={t.initial_stop_loss_abs ? fmtNum(Number(t.initial_stop_loss_abs), 6) : "—"} />
                </div>
                <div className={cn("mt-3 rounded-md p-3 flex items-center justify-between", profit >= 0 ? "bg-gain/10" : "bg-loss/10")}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Résultat</span>
                  <div className={cn("flex items-center gap-2 tabular font-bold", profit >= 0 ? "text-gain" : "text-loss")}>
                    {profit >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>{fmtUsd(profit)}</span>
                    <span className="text-xs opacity-80">({fmtPct(pct)})</span>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded bg-secondary/40 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium truncate">{value}</div>
    </div>
  );
}
