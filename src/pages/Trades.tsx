import { AppLayout } from "@/components/AppLayout";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtNum, fmtPct, fmtUsd, fmtDuration, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Archive, Download, Trash2, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function Trades() {
  const { trades, archivedCount, deleteArchived } = useTradeHistory();
  const [pair, setPair] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const lastFocused = useRef<HTMLElement | null>(null);

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

  const filtered = useMemo(() => {
    return trades.filter((t: any) => {
      if (archivedOnly && !t.archived) return false;
      if (pair && !t.pair?.toLowerCase().includes(pair.toLowerCase())) return false;
      const p = Number(t.profit_ratio ?? 0);
      if (filter === "win" && p <= 0) return false;
      if (filter === "loss" && p >= 0) return false;
      const dt = new Date(t.close_date || t.open_date).getTime();
      if (from && dt < new Date(from).getTime()) return false;
      if (to && dt > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [trades, pair, filter, from, to, archivedOnly]);

  const archivedInFiltered = useMemo(() => filtered.filter((t: any) => t.archived && t.id), [filtered]);
  const allSelected = archivedInFiltered.length > 0 && archivedInFiltered.every((t: any) => selectedIds.has(t.id));
  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) archivedInFiltered.forEach((t: any) => next.delete(t.id));
      else archivedInFiltered.forEach((t: any) => next.add(t.id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setDeleting(true);
    const { error } = await deleteArchived(ids);
    setDeleting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Archives supprimées", description: `${ids.length} trade(s) supprimé(s)` });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const selected = selectedIdx != null ? filtered[selectedIdx] ?? null : null;

  const openTrade = (i: number, e?: React.MouseEvent | React.KeyboardEvent) => {
    lastFocused.current = (e?.currentTarget as HTMLElement) ?? (document.activeElement as HTMLElement);
    setSelectedIdx(i);
  };

  const closeDialog = () => {
    setSelectedIdx(null);
    // restore focus to the trigger after Radix unmount
    requestAnimationFrame(() => lastFocused.current?.focus?.());
  };

  // Keep index valid when filters change
  useEffect(() => {
    if (selectedIdx != null && selectedIdx >= filtered.length) setSelectedIdx(null);
  }, [filtered.length, selectedIdx]);

  // Arrow-key navigation between trades while dialog is open
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
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase">Trades</h1>
          <div className="flex items-center gap-1.5 text-[11px] tabular">
            <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{filtered.length}</span>
            <span className="px-1.5 py-0.5 rounded bg-gain/10 text-gain">▲ {wins}</span>
            <span className="px-1.5 py-0.5 rounded bg-loss/10 text-loss">▼ {losses}</span>
            {archivedCount > 0 && (
              <button
                type="button"
                onClick={() => setArchivedOnly((v) => !v)}
                className={cn(
                  "px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors",
                  archivedOnly ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                title={archivedOnly ? "Afficher tous les trades" : "Afficher uniquement les archives"}
              >
                <Archive className="h-3 w-3" /> {archivedCount} archivés
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs tabular px-2 py-1 rounded font-bold", totalProfit >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss")}>{fmtUsd(totalProfit)}</span>
          {selectedIds.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={deleting}>
                  {deleting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Supprimer ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer {selectedIds.size} archive(s) ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est définitive. Les trades sélectionnés seront supprimés de l'historique persistant.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(Array.from(selectedIds))}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {archivedOnly && archivedInFiltered.length > 0 && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={toggleAll}>
              <Checkbox checked={allSelected} className="mr-1.5 pointer-events-none" />
              {allSelected ? "Tout déselectionner" : "Tout sélectionner"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
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
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/40">
          <div className="w-4"></div>
          <div>Paire</div>
          <div className="text-right">Cours</div>
          <div className="text-right">P&L%</div>
        </div>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-xs">Aucun trade</div>
        )}
        {paged.map((t: any, i: number) => {
          const absIdx = page * PAGE_SIZE + i;
          const pct = Number(t.profit_ratio ?? 0) * 100;
          const isShort = !!(t.is_short || t.trade_direction === "short");
          const positive = pct > 0;
          const canSelect = t.archived && t.id;
          return (
            <div key={`${t.trade_id}-${absIdx}`} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-2.5 py-2 border-b border-border/50 last:border-b-0 hover:bg-secondary/40 transition-colors items-center">
              <div className="flex items-center justify-center w-4" onClick={(e) => e.stopPropagation()}>
                {canSelect ? (
                  <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleOne(t.id)} aria-label="Sélectionner" />
                ) : null}
              </div>
              <button type="button" onClick={(e) => openTrade(absIdx, e)} className="text-left contents focus:outline-none">
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
            </div>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular">
            <thead className="bg-secondary/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-8 px-2 py-2">
                  {archivedInFiltered.length > 0 && (
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
                  )}
                </th>
                <th className="text-left font-medium px-3 py-2">Symbole</th>
                <th className="text-left font-medium px-3 py-2">Sens</th>
                <th className="text-right font-medium px-3 py-2">Entrée</th>
                <th className="text-right font-medium px-3 py-2">Sortie</th>
                <th className="text-right font-medium px-3 py-2">Var %</th>
                <th className="text-right font-medium px-3 py-2">Mise</th>
                <th className="text-right font-medium px-3 py-2">Durée</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">Aucun trade</td></tr>
              )}
              {paged.map((t: any, i: number) => {
                const absIdx = page * PAGE_SIZE + i;
                const pct = Number(t.profit_ratio ?? 0) * 100;
                const isShort = !!(t.is_short || t.trade_direction === "short");
                const positive = pct > 0;
                const canSelect = t.archived && t.id;
                return (
                  <tr key={`${t.trade_id}-${absIdx}`} className={cn("border-t border-border/50 hover:bg-secondary/40 transition-colors", selectedIds.has(t.id) && "bg-primary/5")}>
                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      {canSelect ? (
                        <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleOne(t.id)} aria-label="Sélectionner" />
                      ) : null}
                    </td>
                    <td tabIndex={0} role="button" onClick={(e) => openTrade(absIdx, e as any)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTrade(absIdx, e as any); } }} className="px-3 py-1.5 font-semibold cursor-pointer focus:outline-none focus:bg-secondary/60">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", isShort ? "bg-loss" : "bg-gain")} />
                        {t.pair}
                        {t.archived && <Archive className="h-3 w-3 text-muted-foreground" />}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 cursor-pointer" onClick={(e) => openTrade(absIdx, e as any)}>
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

      {filtered.length > PAGE_SIZE && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground tabular">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
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

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent
          className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
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
                  <DialogDescription className="text-[10px] text-muted-foreground">
                    Trade {(selectedIdx ?? 0) + 1} / {filtered.length} · ← → pour naviguer · Échap pour fermer
                  </DialogDescription>
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
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={selectedIdx == null || selectedIdx <= 0}
                    onClick={() => selectedIdx != null && setSelectedIdx(selectedIdx - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={selectedIdx == null || selectedIdx >= filtered.length - 1}
                    onClick={() => selectedIdx != null && setSelectedIdx(selectedIdx + 1)}
                  >
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
