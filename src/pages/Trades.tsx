import { AppLayout } from "@/components/AppLayout";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtNum, fmtPct, fmtUsd, fmtDuration, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Download } from "lucide-react";

export default function Trades() {
  const { trades } = useTradeHistory();
  const [pair, setPair] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
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

  const exportCsv = () => {
    const rows = [
      ["date_ouverture", "date_fermeture", "paire", "sens", "entree", "sortie", "profit_pct", "profit_usd", "mise", "duree", "raison_sortie"],
      ...filtered.map((t: any) => [
        t.open_date ?? "",
        t.close_date ?? "",
        t.pair ?? "",
        t.is_short || t.trade_direction === "short" ? "SHORT" : "LONG",
        t.open_rate ?? "",
        t.close_rate ?? "",
        ((Number(t.profit_ratio ?? 0)) * 100).toFixed(4),
        Number(t.profit_abs ?? 0).toFixed(4),
        Number(t.stake_amount ?? 0).toFixed(4),
        fmtDuration(t.open_date, t.close_date),
        (t.exit_reason ?? "").replace(/[\n,;]/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selected = selectedIdx != null ? filtered[selectedIdx] ?? null : null;

  const openTrade = (i: number, e?: React.MouseEvent | React.KeyboardEvent) => {
    lastFocused.current = (e?.currentTarget as HTMLElement) ?? (document.activeElement as HTMLElement);
    setSelectedIdx(i);
  };

  const closeDialog = () => {
    setSelectedIdx(null);
    requestAnimationFrame(() => lastFocused.current?.focus?.());
  };

  useEffect(() => {
    if (selectedIdx != null && selectedIdx >= filtered.length) setSelectedIdx(null);
  }, [filtered.length, selectedIdx]);

  useEffect(() => {
    if (selectedIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && selectedIdx < filtered.length - 1) {
        e.preventDefault();
        setSelectedIdx(selectedIdx + 1);
      } else if (e.key === "ArrowLeft" && selectedIdx > 0) {
        e.preventDefault();
        setSelectedIdx(selectedIdx - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx, filtered.length]);

  const wins = filtered.filter((t: any) => Number(t.profit_ratio ?? 0) > 0).length;
  const losses = filtered.length - wins;
  const totalProfit = filtered.reduce((s: number, t: any) => s + Number(t.profit_abs ?? 0), 0);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page >= pageCount) setPage(0); }, [pageCount, page]);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Historique</h1>
          <div className="flex items-center gap-1.5 text-[11px] tabular">
            <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{filtered.length}</span>
            <span className="px-1.5 py-0.5 rounded bg-gain/10 text-gain">▲ {wins}</span>
            <span className="px-1.5 py-0.5 rounded bg-loss/10 text-loss">▼ {losses}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs tabular px-2 py-1 rounded font-bold", totalProfit >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss")}>
            {fmtUsd(totalProfit)}
          </span>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Input
          placeholder="Paire..."
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          className="h-8 text-xs bg-secondary border-0 w-36"
        />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-0 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="win">Gains</SelectItem>
            <SelectItem value="loss">Pertes</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs bg-secondary border-0 w-36" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs bg-secondary border-0 w-36" />
        {(pair || filter !== "all" || from || to) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setPair(""); setFilter("all"); setFrom(""); setTo(""); }}>
            Effacer
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular">
            <thead className="bg-secondary/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium px-3 py-2">Paire</th>
                <th className="text-left font-medium px-3 py-2">Sens</th>
                <th className="text-right font-medium px-3 py-2">Entrée</th>
                <th className="text-right font-medium px-3 py-2">Sortie</th>
                <th className="text-right font-medium px-3 py-2">P&L %</th>
                <th className="text-right font-medium px-3 py-2">P&L $</th>
                <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Durée</th>
                <th className="text-right font-medium px-3 py-2 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aucun trade
                  </td>
                </tr>
              )}
              {paged.map((t: any, i: number) => {
                const absIdx = page * PAGE_SIZE + i;
                const pct = Number(t.profit_ratio ?? 0) * 100;
                const isShort = !!(t.is_short || t.trade_direction === "short");
                const positive = pct > 0;
                return (
                  <tr
                    key={`${t.trade_id}-${absIdx}`}
                    tabIndex={0}
                    role="button"
                    className="border-t border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer focus:outline-none focus:bg-secondary/60"
                    onClick={(e) => openTrade(absIdx, e as any)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTrade(absIdx, e as any); } }}
                  >
                    <td className="px-3 py-2 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                        {t.pair}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isShort ? "bg-loss/10 text-loss" : "bg-gain/10 text-gain")}>
                        {isShort ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {isShort ? "Short" : "Long"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmtNum(Number(t.open_rate), 6)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {t.close_rate ? fmtNum(Number(t.close_rate), 6) : <span className="opacity-40">—</span>}
                    </td>
                    <td className={cn("px-3 py-2 text-right font-semibold", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                      <span className="inline-flex items-center gap-0.5 justify-end">
                        {positive ? <ArrowUpRight className="h-3 w-3" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {fmtPct(pct)}
                      </span>
                    </td>
                    <td className={cn("px-3 py-2 text-right font-semibold", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                      {fmtUsd(Number(t.profit_abs ?? 0))}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">
                      {fmtDuration(t.open_date, t.close_date)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground hidden md:table-cell">
                      {fmtDateTime(t.close_date || t.open_date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground tabular">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="tabular text-muted-foreground px-2">{page + 1} / {pageCount}</span>
            <Button size="sm" variant="outline" className="h-8" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent
          className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {selected && (() => {
            const t = selected;
            const pct = Number(t.profit_ratio ?? 0) * 100;
            const profit = Number(t.profit_abs ?? 0);
            const isShort = !!(t.is_short || t.trade_direction === "short");
            const open = Number(t.open_rate ?? 0);
            const close = t.close_rate != null ? Number(t.close_rate) : null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
                    <span className={cn("h-2 w-2 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                    {t.pair}
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isShort ? "bg-loss/10 text-loss" : "bg-gain/10 text-gain")}>
                      {isShort ? "Short" : "Long"}
                    </span>
                    {!t.close_date && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">Ouvert</span>}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] text-muted-foreground">
                    {(selectedIdx ?? 0) + 1} / {filtered.length} · ← → pour naviguer
                  </DialogDescription>
                </DialogHeader>

                <div className={cn("rounded-md p-3 flex items-center justify-between mb-3", profit >= 0 ? "bg-gain/10" : "bg-loss/10")}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Résultat</span>
                  <div className={cn("flex items-center gap-2 tabular font-bold text-lg", profit >= 0 ? "text-gain" : "text-loss")}>
                    {profit >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {fmtUsd(profit)}
                    <span className="text-sm opacity-80">({fmtPct(pct)})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs tabular">
                  <Detail label="Paire" value={t.pair} />
                  <Detail label="Trade #" value={`#${t.trade_id}`} />
                  <Detail label="Ouverture" value={fmtDateTime(t.open_date)} />
                  <Detail label="Fermeture" value={fmtDateTime(t.close_date)} />
                  <Detail label="Cours entrée" value={fmtNum(open, 6)} />
                  <Detail label="Cours sortie" value={close != null ? fmtNum(close, 6) : "—"} />
                  <Detail label="Mise" value={fmtUsd(Number(t.stake_amount ?? 0))} />
                  <Detail label="Durée" value={fmtDuration(t.open_date, t.close_date)} />
                  {t.leverage && t.leverage !== 1 && <Detail label="Levier" value={`x${t.leverage}`} />}
                  {t.exit_reason && <Detail label="Raison sortie" value={t.exit_reason} />}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button variant="outline" size="sm" className="flex-1"
                    disabled={selectedIdx == null || selectedIdx <= 0}
                    onClick={() => selectedIdx != null && setSelectedIdx(selectedIdx - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1"
                    disabled={selectedIdx == null || selectedIdx >= filtered.length - 1}
                    onClick={() => selectedIdx != null && setSelectedIdx(selectedIdx + 1)}>
                    Suivant <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
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
