import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface BotSettings {
  api_url: string;
  username: string;
  password: string;
  bankroll: number;
}

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("bot_settings")
      .select("api_url,username,password,bankroll")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data as BotSettings | null);
        setLoading(false);
      });
  }, [user]);

  const save = async (s: BotSettings) => {
    if (!user) return;
    const { error } = await supabase
      .from("bot_settings")
      .upsert({ user_id: user.id, ...s }, { onConflict: "user_id" });
    if (!error) setSettings(s);
    return error;
  };

  return { settings, loading, save };
}
