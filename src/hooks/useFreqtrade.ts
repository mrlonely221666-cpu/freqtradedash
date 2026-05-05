import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type Endpoint = "status" | "profit" | "trades" | "balance" | "daily" | "performance";

export function useFreqtrade<T = any>(endpoint: Endpoint, intervalMs = 5000) {
  const { session } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      const { data: res, error: err } = await supabase.functions.invoke(
        `freqtrade-proxy?endpoint=${endpoint}`,
        { method: "GET" }
      );
      if (!mountedRef.current) return;
      if (err) {
        setError(err.message);
        setOffline(true);
      } else if (res?.error) {
        setError(res.error);
        setOffline(!!res.offline);
        if (!res.offline) setData(null);
      } else {
        setData(res);
        setError(null);
        setOffline(false);
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setError(String(e));
        setOffline(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    mountedRef.current = true;
    fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchOnce, intervalMs]);

  return { data, error, offline, loading, refetch: fetchOnce };
}
