import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache (per function instance)
const cache = new Map<string, { data: unknown; expires: number }>();
const TTL_MS = 4000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: settings } = await supabase
      .from("bot_settings")
      .select("api_url, username, password")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.api_url) return json({ error: "Bot not configured", not_configured: true, offline: true }, 200);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "status";
    const allowed = ["status", "profit", "trades", "balance", "show_config", "performance", "daily", "logs"];
    if (!allowed.includes(endpoint)) return json({ error: "Invalid endpoint" }, 400);

    const cacheKey = `${user.id}:${endpoint}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return json(cached.data);
    }

    const base = settings.api_url.replace(/\/+$/, "");
    const target = `${base}/api/v1/${endpoint}`;
    const auth = "Basic " + btoa(`${settings.username}:${settings.password}`);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    let resp: Response;
    try {
      resp = await fetch(target, { headers: { Authorization: auth }, signal: ctrl.signal });
    } catch (e) {
      clearTimeout(t);
      return json({ error: "Bot offline", offline: true, detail: String(e) }, 200);
    }
    clearTimeout(t);

    if (!resp.ok) {
      return json({ error: `Freqtrade ${resp.status}`, offline: resp.status >= 500 }, 200);
    }

    const data = await resp.json();
    cache.set(cacheKey, { data, expires: Date.now() + TTL_MS });
    return json(data);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
