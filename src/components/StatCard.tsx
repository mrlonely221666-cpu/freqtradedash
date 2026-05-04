import { Card } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, tone = "default", icon,
}: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "gain" | "loss"; icon?: ReactNode }) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
        <span>{label}</span>
        {icon}
      </div>
      <div className={cn("mt-2 text-2xl font-bold tabular", tone === "gain" && "text-gain", tone === "loss" && "text-loss")}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground tabular">{sub}</div>}
    </Card>
  );
}
