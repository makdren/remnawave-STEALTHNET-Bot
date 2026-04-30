import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ClientResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) return setError("Некорректная ссылка");
    if (password.length < 6) return setError("Минимум 6 символов");
    if (password !== confirm) return setError("Пароли не совпадают");
    setLoading(true);
    try {
      const res = await api.clientConfirmPasswordReset(token, password);
      localStorage.setItem("client_token", res.token);
      navigate("/cabinet", { replace: true });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally { setLoading(false); }
  }

  return <div className="min-h-svh flex items-center justify-center p-4"><form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl border bg-background/70 p-8 backdrop-blur">
    <h1 className="text-2xl font-bold">Сброс пароля</h1>
    {error && <div className="text-sm text-destructive">{error}</div>}
    <div className="space-y-2"><Label>Новый пароль</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required /></div>
    <div className="space-y-2"><Label>Повторите пароль</Label><Input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required /></div>
    <Button className="w-full" disabled={loading}>{loading ? "Сохранение..." : "Подтвердить"}</Button>
  </form></div>;
}
