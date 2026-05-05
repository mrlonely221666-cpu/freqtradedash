import { AppLayout } from "@/components/AppLayout";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtNum, fmtPct, fmtUsd, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

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

  return (
    <AppLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Trades</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{filtered.length} of {trades.length} trades</p>
      </div>

      <Card className="p-3 sm:p-4 mb-4 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Filter pair…" value={pair} onChange={(e) => setPair(e.target.value)} />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trades</SelectItem>
            <SelectItem value="win">Wins only</SelectItem>
            <SelectItem value="loss">Losses only</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </Card>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground text-sm">No trades</Card>
        )}
        {filtered.map((t) => {
          const pct = (t.profit_ratio ?? 0) * 100;
          const isShort = t.is_short || t.trade_direction === "short";
          return (
            <Card key={t.trade_id} className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold truncate">{t.pair}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", isShort ? "border-loss text-loss" : "border-gain text-gain")}>
                    {isShort ? "SHORT" : "LONG"}
                  </Badge>
                </div>
                <span className={cn("tabular font-semibold text-sm", pct > 0 ? "text-gain" : pct < 0 ? "text-loss" : "")}>{fmtPct(pct)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-muted-foreground">Entry</div>
                <div className="text-right tabular">{fmtNum(t.open_rate, 6)}</div>
                <div className="text-muted-foreground">Exit</div>
                <div className="text-right tabular">{t.close_rate ? fmtNum(t.close_rate, 6) : "—"}</div>
                <div className="text-muted-foreground">Stake</div>
                <div className="text-right tabular">{fmtUsd(t.stake_amount)}</div>
                <div className="text-muted-foreground">Duration</div>
                <div className="text-right tabular">{fmtDuration(t.open_date, t.close_date)}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop / tablet table */}
      <Card className="overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">Profit %</TableHead>
                <TableHead className="text-right">Stake</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No trades</TableCell></TableRow>
              )}
              {filtered.map((t) => {
                const pct = (t.profit_ratio ?? 0) * 100;
                const isShort = t.is_short || t.trade_direction === "short";
                return (
                  <TableRow key={t.trade_id}>
                    <TableCell className="font-medium">{t.pair}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(isShort ? "border-loss text-loss" : "border-gain text-gain")}>
                        {isShort ? "SHORT" : "LONG"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular">{fmtNum(t.open_rate, 6)}</TableCell>
                    <TableCell className="text-right tabular">{t.close_rate ? fmtNum(t.close_rate, 6) : "—"}</TableCell>
                    <TableCell className={cn("text-right tabular font-semibold", pct > 0 ? "text-gain" : pct < 0 ? "text-loss" : "")}>{fmtPct(pct)}</TableCell>
                    <TableCell className="text-right tabular">{fmtUsd(t.stake_amount)}</TableCell>
                    <TableCell className="text-right tabular text-muted-foreground">{fmtDuration(t.open_date, t.close_date)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AppLayout>
  );
}
