import { AppLayout } from "@/components/AppLayout";
import { useSettings } from "@/hooks/useSettings";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { settings, save } = useSettings();
  const [form, setForm] = useState({ api_url: "", username: "", password: "", bankroll: 1000 });
  const [tgChat, setTgChat] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await save({ ...form, bankroll: Number(form.bankroll) });
    setBusy(false);
    if (err) toast.error(err.message);
    else toast.success("Settings saved");
  };

  const testTelegram = async () => {
    if (!tgChat) return toast.error("Enter a chat ID");
    const { data, error } = await supabase.functions.invoke("telegram-notify", {
      body: { chat_id: tgChat, text: "✅ FreqDash test alert" },
    });
    if (error || data?.error) toast.error(data?.error ?? error?.message);
    else toast.success("Telegram test sent");
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Bot connection & bankroll</p>
      </div>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="url">Freqtrade API URL</Label>
            <Input id="url" placeholder="http://192.168.1.10:8080" value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} required />
            <p className="text-xs text-muted-foreground mt-1">Base URL of your bot (no trailing /api/v1).</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user">Username</Label>
              <Input id="user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="pass">Password</Label>
              <Input id="pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label htmlFor="bank">Bankroll (USDT)</Label>
            <Input id="bank" type="number" step="0.01" value={form.bankroll} onChange={(e) => setForm({ ...form, bankroll: Number(e.target.value) })} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save settings
          </Button>
        </form>
      </Card>

      <Card className="p-6 max-w-2xl mt-6">
        <h3 className="font-semibold mb-2">Telegram alerts</h3>
        <p className="text-sm text-muted-foreground mb-4">Send a test notification to verify your Telegram chat ID.</p>
        <div className="flex gap-2">
          <Input placeholder="Telegram chat ID (e.g. 123456789)" value={tgChat} onChange={(e) => setTgChat(e.target.value)} />
          <Button type="button" variant="secondary" onClick={testTelegram}>Send test</Button>
        </div>
      </Card>
    </AppLayout>
  );
}
