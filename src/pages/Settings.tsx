import { AppLayout } from "@/components/AppLayout";
import { useSettings } from "@/hooks/useSettings";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { settings, save } = useSettings();
  const { user } = useAuth();
  const [form, setForm] = useState({ api_url: "", username: "", password: "", bankroll: 1000 });
  const [tgChat, setTgChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [wiping, setWiping] = useState(false);

  const wipeAll = async () => {
    if (!user) return;
    setWiping(true);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("trade_history").delete().eq("user_id", user.id),
      supabase.from("bot_settings").delete().eq("user_id", user.id),
    ]);
    setWiping(false);
    if (e1 || e2) {
      toast.error((e1 ?? e2)?.message ?? "Erreur lors de la suppression");
      return;
    }
    toast.success("Toutes les données ont été effacées");
    setTimeout(() => window.location.reload(), 800);
  };

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await save({ ...form, bankroll: Number(form.bankroll) });
    setBusy(false);
    if (err) toast.error(err.message);
    else toast.success("Paramètres enregistrés");
  };

  const testTelegram = async () => {
    if (!tgChat) return toast.error("Saisissez un identifiant de chat");
    const { data, error } = await supabase.functions.invoke("telegram-notify", {
      body: { chat_id: tgChat, text: "✅ Alerte de test FreqDash" },
    });
    if (error || data?.error) toast.error(data?.error ?? error?.message);
    else toast.success("Test Telegram envoyé");
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Connexion au bot et bankroll</p>
      </div>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="url">URL de l'API Freqtrade</Label>
            <Input id="url" placeholder="http://192.168.1.10:8080" value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} required />
            <p className="text-xs text-muted-foreground mt-1">URL de base de votre bot (sans /api/v1 à la fin).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user">Nom d'utilisateur</Label>
              <Input id="user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="pass">Mot de passe</Label>
              <Input id="pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label htmlFor="bank">Bankroll (USDT)</Label>
            <Input id="bank" type="number" step="0.01" value={form.bankroll === 0 ? "" : form.bankroll} onChange={(e) => setForm({ ...form, bankroll: e.target.value === "" ? 0 : Number(e.target.value) })} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </Card>

      <Card className="p-6 max-w-2xl mt-6">
        <h3 className="font-semibold mb-2">Alertes Telegram</h3>
        <p className="text-sm text-muted-foreground mb-4">Envoyez une notification de test pour vérifier votre identifiant de chat Telegram.</p>
        <div className="flex gap-2">
          <Input placeholder="ID du chat Telegram (ex. 123456789)" value={tgChat} onChange={(e) => setTgChat(e.target.value)} />
          <Button type="button" variant="secondary" onClick={testTelegram}>Envoyer un test</Button>
        </div>
      </Card>

      <Card className="p-6 max-w-2xl mt-6">
        <h3 className="font-semibold mb-2">Historique des trades</h3>
        <p className="text-sm text-muted-foreground">
          Tous vos trades fermés sont automatiquement archivés dans votre espace personnel. Si vous redémarrez ou reconnectez votre bot Freqtrade, l'historique reste disponible et sera fusionné avec les nouveaux trades.
        </p>
      </Card>

      <Card className="p-6 max-w-2xl mt-6 border-destructive/40">
        <h3 className="font-semibold mb-2 text-destructive">Zone dangereuse</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Efface définitivement tout l'historique archivé des trades ainsi que la configuration du bot (URL, identifiants, bankroll). Cette action est irréversible.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={wiping}>
              {wiping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Tout effacer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Effacer toutes les données ?</AlertDialogTitle>
              <AlertDialogDescription>
                Tous les trades archivés et la configuration du bot seront supprimés. Cette opération ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={wipeAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmer la suppression
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </AppLayout>
  );
}
