import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClientForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.clientPasswordResetRequest(email.trim());
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md p-4 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t("cabinet.forgot_password.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("cabinet.forgot_password.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">{t("cabinet.forgot_password.email")}</Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          {message && <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</div>}
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("cabinet.forgot_password.submit_loading") : t("cabinet.forgot_password.submit")}
          </Button>
        </form>
        <div className="text-center text-sm">
          <Link to="/cabinet/login" className="text-muted-foreground hover:text-primary hover:underline">
            {t("cabinet.forgot_password.back_to_login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
