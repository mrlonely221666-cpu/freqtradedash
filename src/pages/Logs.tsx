import { AppLayout } from "@/components/AppLayout";
import { useFreqtrade } from "@/hooks/useFreqtrade";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Pause, Play, ScrollText, Trash2 } from "lucide-react";

type Level = "ALL" | "INFO" | "WARNING" | "ERROR" | "DEBUG";

export default function Logs() {
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<Level>("ALL");
  const logs = useFreqtrade<any>("logs", paused ? 60_000_000 : 4000);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Freqtrade returns { logs: [[ts, ts2, name, level, message], ...] } typically
  const lines = useMemo(() => {
    const raw = logs.data?.logs ?? logs.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any) => {
      if (Array.isArray(l)) {
        const [ts, _epoch, name, lvl, msg] = l;
        return { ts: String(ts ?? ""), name: String(name ?? ""), level: String(lvl ?? "INFO"), msg: String(msg ?? "") };
      }
      return { ts: l.timestamp ?? "", name: l.name ?? "", level: l.level ?? "INFO", msg: l.message ?? String(l) };
    });
  }, [logs.data]);

  const filtered = useMemo(() => lines.filter((l) => {
    if (level !== "ALL" && l.level.toUpperCase() !== level) return false;
    if (search && !`${l.msg} ${l.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [lines, level, search]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered, autoScroll]);

  const colorOf = (lvl: string) => {
    const u = lvl.toUpperCase();
    if (u === "ERROR" || u === "CRITICAL") return "text-loss";
    if (u === "WARNING" || u === "WARN") return "text-yellow-500";
    if (u === "DEBUG") return "text-muted-foreground";
    return "text-foreground";
  };

  return (
    <AppLayout>
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">Logs</h1>
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{filtered.length}/{lines.length} lignes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)} className="h-8 text-xs">
            {paused ? <><Play className="h-3 w-3 mr-1" /> Reprendre</> : <><Pause className="h-3 w-3 mr-1" /> Pause</>}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAutoScroll((a) => !a)} className="h-8 text-xs">
            Auto-scroll : {autoScroll ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      <div className="mb-2 grid gap-1.5 grid-cols-2 lg:grid-cols-3 p-1.5 rounded-md bg-card border border-border">
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs bg-secondary border-0" />
        <Select value={level} onValueChange={(v: any) => setLevel(v)}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous niveaux</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="WARNING">WARNING</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="DEBUG">DEBUG</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setSearch("")} className="h-8 text-xs">
          <Trash2 className="h-3 w-3 mr-1" /> Effacer filtre
        </Button>
      </div>

      <Card className="bg-card border-border rounded-md overflow-hidden">
        <div ref={scrollRef} className="h-[60vh] overflow-y-auto font-mono text-[11px] leading-relaxed">
          {logs.offline && (
            <div className="p-4 text-loss text-xs">Bot hors ligne</div>
          )}
          {!logs.offline && filtered.length === 0 && (
            <div className="p-4 text-muted-foreground text-xs">Aucun log à afficher</div>
          )}
          {filtered.map((l, i) => (
            <div key={i} className="flex gap-2 px-3 py-0.5 border-b border-border/30 hover:bg-secondary/30">
              <span className="text-muted-foreground shrink-0 tabular">{l.ts}</span>
              <span className={cn("font-bold shrink-0 w-16", colorOf(l.level))}>{l.level}</span>
              <span className="text-muted-foreground shrink-0 truncate max-w-[180px]">{l.name}</span>
              <span className="break-all">{l.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
