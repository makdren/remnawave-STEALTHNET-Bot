import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClientResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = (params.get("token") || "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { loginByTelegramDeepLink } = useClientAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Invalid token");
      return;
    }
    if (password !== confirmPassword) {
      setError(t("cabinet.reset_password.passwords_mismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await api.clientPasswordResetConfirm(token, password);
      if ("requires2FA" in res) {
        loginByTelegramDeepLink({ requires2FA: true, tempToken: res.tempToken });
        navigate("/cabinet", { replace: true });
        setError("Для аккаунта включена 2FA. Войдите через страницу входа.");
        return;
      }
      loginByTelegramDeepLink({ token: res.token, client: res.client });
      navigate("/cabinet", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md p-4 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t("cabinet.reset_password.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("cabinet.reset_password.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("cabinet.reset_password.password")}</Label>
            <Input id="new-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("cabinet.reset_password.password_confirm")}</Label>
            <Input id="confirm-password" type="password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("cabinet.reset_password.submit_loading") : t("cabinet.reset_password.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
