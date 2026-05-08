import { AppLayout } from "@/components/AppLayout";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtNum, fmtPct, fmtUsd, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, Radio, TrendingDown, TrendingUp } from "lucide-react";

type Sort = { key: string; dir: "asc" | "desc" };

export default function OpenTrades() {
  const status = useFreqtrade<any>("status", 3000);
  const [search, setSearch] = useState("");
  const [dir, setDir] = useState<"all" | "long" | "short">("all");
  const [sort, setSort] = useState<Sort>({ key: "profit_ratio", dir: "desc" });

  const trades: any[] = Array.isArray(status.data) ? status.data : [];

  const filtered = useMemo(() => {
    let t = trades.filter((x) => {
      if (search && !x.pair?.toLowerCase().includes(search.toLowerCase())) return false;
      const isShort = !!(x.is_short || x.trade_direction === "short");
      if (dir === "long" && isShort) return false;
      if (dir === "short" && !isShort) return false;
      return true;
    });
    t = [...t].sort((a, b) => {
      const av = Number(a[sort.key] ?? 0);
      const bv = Number(b[sort.key] ?? 0);
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return t;
  }, [trades, search, dir, sort]);

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const totalPnl = filtered.reduce((s, t) => s + Number(t.profit_abs ?? 0), 0);

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Trades ouverts</h1>
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Radio className="h-3 w-3 animate-pulse text-gain" /> Direct
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] tabular">
          <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{filtered.length} ouverts</span>
          <span className={cn("px-1.5 py-0.5 rounded font-bold", totalPnl >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss")}>
            {fmtUsd(totalPnl)}
          </span>
        </div>
      </div>

      <div className="mb-2 grid gap-1.5 grid-cols-2 lg:grid-cols-3 p-1.5 rounded-md bg-card border border-border">
        <Input placeholder="Rechercher une paire…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
        <Select value={dir} onValueChange={(v: any) => setDir(v)}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="long">Longs</SelectItem>
            <SelectItem value="short">Shorts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular">
            <thead className="bg-secondary/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <Th label="Paire" sortKey="pair" sort={sort} onSort={toggleSort} />
                <Th label="Sens" sortKey="is_short" sort={sort} onSort={toggleSort} />
                <Th label="Entrée" sortKey="open_rate" sort={sort} onSort={toggleSort} align="right" />
                <Th label="Cours" sortKey="current_rate" sort={sort} onSort={toggleSort} align="right" />
                <Th label="Mise" sortKey="stake_amount" sort={sort} onSort={toggleSort} align="right" />
                <Th label="Levier" sortKey="leverage" sort={sort} onSort={toggleSort} align="right" />
                <Th label="P&L %" sortKey="profit_ratio" sort={sort} onSort={toggleSort} align="right" />
                <Th label="P&L $" sortKey="profit_abs" sort={sort} onSort={toggleSort} align="right" />
                <th className="text-right font-medium px-3 py-2">Durée</th>
                <th className="text-right font-medium px-3 py-2">SL</th>
                <th className="text-right font-medium px-3 py-2">TP</th>
                <th className="text-right font-medium px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="text-center py-12 text-muted-foreground">
                  {status.offline ? "Bot hors ligne" : "Aucun trade ouvert"}
                </td></tr>
              )}
              {filtered.map((t, i) => {
                const isShort = !!(t.is_short || t.trade_direction === "short");
                const pct = Number(t.profit_ratio ?? 0) * 100;
                const positive = pct > 0;
                return (
                  <tr key={`${t.trade_id}-${i}`} className="border-t border-border/50 hover:bg-secondary/40 transition-colors">
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
                    <td className="px-3 py-1.5 text-right">{fmtNum(Number(t.open_rate ?? 0), 6)}</td>
                    <td className="px-3 py-1.5 text-right">{fmtNum(Number(t.current_rate ?? 0), 6)}</td>
                    <td className="px-3 py-1.5 text-right">{fmtUsd(Number(t.stake_amount ?? 0))}</td>
                    <td className="px-3 py-1.5 text-right">x{t.leverage ?? 1}</td>
                    <td className={cn("px-3 py-1.5 text-right font-semibold", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                      <span className="inline-flex items-center gap-0.5">
                        {positive ? <ArrowUpRight className="h-3 w-3" /> : pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {fmtPct(pct)}
                      </span>
                    </td>
                    <td className={cn("px-3 py-1.5 text-right font-semibold", positive ? "text-gain" : pct < 0 ? "text-loss" : "text-muted-foreground")}>
                      {fmtUsd(Number(t.profit_abs ?? 0))}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{fmtDuration(t.open_date)}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {t.stop_loss_abs ? fmtNum(Number(t.stop_loss_abs), 6) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {t.initial_stop_loss_abs ? fmtNum(Number(t.initial_stop_loss_abs), 6) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" /> Ouvert
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}

function Th({ label, sortKey, sort, onSort, align = "left" }: { label: string; sortKey: string; sort: Sort; onSort: (k: string) => void; align?: "left" | "right" }) {
  const active = sort.key === sortKey;
  return (
    <th className={cn("font-medium px-3 py-2 select-none", align === "right" ? "text-right" : "text-left")}>
      <button onClick={() => onSort(sortKey)} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}
