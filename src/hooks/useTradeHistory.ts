import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useFreqtrade } from "./useFreqtrade";

export interface ArchivedTrade {
  id: string;
  trade_id: number;
  pair: string;
  is_short: boolean;
  open_rate: number | null;
  close_rate: number | null;
  stake_amount: number | null;
  amount: number | null;
  profit_abs: number | null;
  profit_ratio: number | null;
  open_date: string | null;
  close_date: string | null;
  exit_reason: string | null;
}

/**
 * Récupère l'historique persistant + les trades live du bot,
 * et archive automatiquement tous les trades fermés en base.
 */
export function useTradeHistory() {
  const { user } = useAuth();
  const live = useFreqtrade<any>("trades");
  const [archived, setArchived] = useState<ArchivedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const syncedIds = useRef<Set<string>>(new Set());

  const loadArchive = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("trade_history")
      .select("trade_id,pair,is_short,open_rate,close_rate,stake_amount,amount,profit_abs,profit_ratio,open_date,close_date,exit_reason")
      .eq("user_id", user.id)
      .order("close_date", { ascending: false })
      .limit(1000);
    setArchived((data ?? []) as ArchivedTrade[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadArchive(); }, [loadArchive]);

  // Archivage automatique des trades fermés
  useEffect(() => {
    if (!user || !live.data?.trades) return;
    const closed = (live.data.trades as any[]).filter((t) => t.close_date);
    if (closed.length === 0) return;

    const toInsert = closed
      .map((t) => ({
        user_id: user.id,
        trade_id: t.trade_id,
        pair: t.pair,
        is_short: !!(t.is_short || t.trade_direction === "short"),
        open_rate: t.open_rate ?? null,
        close_rate: t.close_rate ?? null,
        stake_amount: t.stake_amount ?? null,
        amount: t.amount ?? null,
        profit_abs: t.profit_abs ?? null,
        profit_ratio: t.profit_ratio ?? null,
        open_date: t.open_date ? new Date(t.open_date).toISOString() : null,
        close_date: t.close_date ? new Date(t.close_date).toISOString() : null,
        exit_reason: t.exit_reason ?? null,
        raw: t,
      }))
      .filter((t) => {
        const key = `${t.trade_id}|${t.open_date}`;
        if (syncedIds.current.has(key)) return false;
        syncedIds.current.add(key);
        return true;
      });

    if (toInsert.length === 0) return;

    supabase
      .from("trade_history")
      .upsert(toInsert, { onConflict: "user_id,trade_id,open_date", ignoreDuplicates: false })
      .then(({ error }) => {
        if (!error) loadArchive();
      });
  }, [user, live.data, loadArchive]);

  // Fusionne live + archive (live prioritaire pour les ouvertes)
  const liveTrades: any[] = live.data?.trades ?? [];
  const liveKeys = new Set(liveTrades.map((t) => `${t.trade_id}|${t.open_date ? new Date(t.open_date).toISOString() : ""}`));
  const onlyArchived = archived.filter((a) => !liveKeys.has(`${a.trade_id}|${a.open_date ?? ""}`));
  const merged = [
    ...liveTrades,
    ...onlyArchived.map((a) => ({ ...a, archived: true })),
  ];

  return {
    trades: merged,
    archivedCount: archived.length,
    loading: loading || live.loading,
    offline: live.offline,
  };
}
