import { AppLayout } from "@/components/AppLayout";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { Input } from "@/components/ui/input";
import { fmtPct, fmtUsd, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Radio, TrendingDown, TrendingUp } from "lucide-react";

export default function OpenTrades() {
  const status = useFreqtrade<any>("status", 3000);
  const [search, setSearch] = useState("");

  const trades: any[] = Array.isArray(status.data) ? status.data : [];

  const filtered = useMemo(() => {
    if (!search) return trades;
    return trades.filter((x) => x.pair?.toLowerCase().includes(search.toLowerCase()));
  }, [trades, search]);

  const totalPnl = filtered.reduce((s, t) => s + Number(t.profit_abs ?? 0), 0);

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Positions ouvertes</h1>
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Radio className="h-3 w-3 animate-pulse text-gain" /> Direct
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] tabular">
          <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{filtered.length} ouvert{filtered.length !== 1 ? "s" : ""}</span>
          {filtered.length > 0 && (
            <span className={cn("px-1.5 py-0.5 rounded font-bold", totalPnl >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss")}>
              {fmtUsd(totalPnl)}
            </span>
          )}
        </div>
      </div>

      {trades.length > 3 && (
        <div className="mb-2">
          <Input
            placeholder="Filtrer par paire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-secondary border-0 w-48"
          />
        </div>
      )}

      <div className="rounded-md border border-border bg-card overflow-hidden">
        {status.offline && (
          <div className="p-8 text-center text-muted-foreground text-sm">Bot hors ligne</div>
        )}
        {!status.offline && filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">Aucune position ouverte</div>
        )}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular">
              <thead className="bg-secondary/40">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-medium px-3 py-2">Paire</th>
                  <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Sens</th>
                  <th className="text-right font-medium px-3 py-2">P&L %</th>
                  <th className="text-right font-medium px-3 py-2">P&L $</th>
                  <th className="text-right font-medium px-3 py-2 hidden md:table-cell">Entrée</th>
                  <th className="text-right font-medium px-3 py-2 hidden md:table-cell">Cours</th>
                  <th className="text-right font-medium px-3 py-2 hidden lg:table-cell">Mise</th>
                  <th className="text-right font-medium px-3 py-2 hidden lg:table-cell">Durée</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const isShort = !!(t.is_short || t.trade_direction === "short");
                  const pct = Number(t.profit_ratio ?? 0) * 100;
                  const positive = pct > 0;
                  return (
                    <tr key={`${t.trade_id}-${i}`} className="border-t border-border/50 hover:bg-secondary/40 transition-colors">
                      <td className="px-3 py-2 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isShort ? "bg-loss" : "bg-gain")} />
                          {t.pair}
                        </span>
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isShort ? "bg-loss/10 text-loss" : "bg-gain/10 text-gain")}>
                          {isShort ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          {isShort ? "Short" : "Long"}
                        </span>
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
                      <td className="px-3 py-2 text-right text-muted-foreground hidden md:table-cell">
                        {t.open_rate ? Number(t.open_rate).toPrecision(6) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground hidden md:table-cell">
                        {t.current_rate ? Number(t.current_rate).toPrecision(6) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground hidden lg:table-cell">
                        {fmtUsd(Number(t.stake_amount ?? 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground hidden lg:table-cell">
                        {fmtDuration(t.open_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
