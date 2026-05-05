import { Card } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, tone = "default", icon,
}: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "gain" | "loss"; icon?: ReactNode }) {
  return (
    <Card className="p-3 sm:p-4 bg-card border-border min-w-0">
      <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        <span className="truncate">{label}</span>
        <span className="shrink-0">{icon}</span>
      </div>
      <div className={cn("mt-2 text-lg sm:text-2xl font-bold tabular truncate", tone === "gain" && "text-gain", tone === "loss" && "text-loss")}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground tabular truncate">{sub}</div>}
    </Card>
  );
}
