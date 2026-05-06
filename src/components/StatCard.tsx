import { Card } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, tone = "default", icon,
}: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "gain" | "loss"; icon?: ReactNode }) {
  return (
    <Card className="p-2.5 sm:p-3 bg-card border-border min-w-0 rounded-md hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
        <span className="truncate">{label}</span>
        <span className="shrink-0 opacity-60">{icon}</span>
      </div>
      <div className={cn(
        "mt-1.5 text-base sm:text-xl font-bold tabular truncate leading-tight",
        tone === "gain" && "text-gain",
        tone === "loss" && "text-loss"
      )}>
        {value}
      </div>
      {sub && <div className={cn("mt-0.5 text-[10px] sm:text-xs tabular truncate",
        tone === "gain" ? "text-gain/80" : tone === "loss" ? "text-loss/80" : "text-muted-foreground"
      )}>{sub}</div>}
    </Card>
  );
}
