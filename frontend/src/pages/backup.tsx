import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, AlertTriangle, Loader2, RotateCcw, HardDrive, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BackupItem = { path: string; filename: string; date: string; size: number };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(path: string): string {
  const parts = path.split("/");
  if (parts.length >= 3) return parts.slice(0, 3).join(".");
  return path;
}

export function BackupPage() {
  const { state } = useAuth();
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFromPath, setRestoreFromPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [list, setList] = useState<BackupItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupCron, setAutoBackupCron] = useState("0 7 * * *");
  const [autoBackupSaving, setAutoBackupSaving] = useState(false);
  const [autoBackupSending, setAutoBackupSending] = useState(false);
  const [autoBackupMsg, setAutoBackupMsg] = useState<string | null>(null);

  const token = state.accessToken;
  if (!token) return null;

  async function loadAutoBackupSettings() {
    const t = state.accessToken;
    if (!t) return;
    try {
      const s = await api.getSettings(t);
      setAutoBackupEnabled((s as any).autoBackupEnabled ?? false);
      setAutoBackupCron((s as any).autoBackupCron || "0 7 * * *");
    } catch { /* ignore */ }
  }

  async function saveAutoBackup() {
    const t = state.accessToken;
    if (!t) return;
    setAutoBackupSaving(true);
    try {
      await api.updateSettings(t, {
        autoBackupEnabled,
        autoBackupCron: autoBackupCron.trim() || "0 7 * * *",
      } as any);
      flashAutoBackup(autoBackupEnabled ? "Авто-бэкапы включены" : "Авто-бэкапы выключены");
    } catch {
      flashAutoBackup("Ошибка сохранения");
    } finally {
      setAutoBackupSaving(false);
    }
  }

  async function sendBackupNow() {
    const t = state.accessToken;
    if (!t) return;
    setAutoBackupSending(true);
    try {
      const res = await api.sendBackupToTelegram(t);
      flashAutoBackup(res.message || "Бэкап отправлен");
      await loadList();
    } catch (e) {
      flashAutoBackup(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setAutoBackupSending(false);
    }
  }

  function flashAutoBackup(msg: string) {
    setAutoBackupMsg(msg);
    setTimeout(() => setAutoBackupMsg(null), 4000);
  }

  async function loadList() {
    const t = state.accessToken;
    if (!t) return;
    setListLoading(true);
    try {
      const res = await api.getBackupList(t);
      setList(res.items);
    } catch {
      setList([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadList();
    loadAutoBackupSettings();
  }, [state.accessToken]);

  async function handleCreateBackup() {
    const t = state.accessToken;
    if (!t) return;
    setError(null);
    setSuccess(null);
    setCreating(true);
    try {
      const { blob, filename } = await api.createBackup(t);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("Бэкап создан, сохранён на сервере и загружен.");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания бэкапа");
    } finally {
      setCreating(false);
    }
  }

  async function handleDownload(path: string) {
    const t = state.accessToken;
    if (!t) return;
    setError(null);
    try {
      const { blob, filename } = await api.downloadBackup(t, path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка скачивания");
    }
  }

  function handleRestoreFromServer(path: string) {
    setRestoreFromPath(path);
    setError(null);
  }

  async function handleRestoreFromServerConfirm() {
    const t = state.accessToken;
    if (!restoreFromPath || !t) return;
    setError(null);
    setSuccess(null);
    setRestoring(true);
    setRestoreFromPath(null);
    try {
      const result = await api.restoreBackupFromServer(t, restoreFromPath);
      setSuccess(result.message);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка восстановления");
    } finally {
      setRestoring(false);
    }
  }

  function handleRestoreSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    setSuccess(null);
    if (file) {
      if (!file.name.toLowerCase().endsWith(".sql")) {
        setError("Выберите файл бэкапа с расширением .sql");
        setRestoreFile(null);
        return;
      }
      setRestoreFile(file);
      setShowRestoreConfirm(true);
    }
  }

  async function handleRestoreConfirm() {
    const t = state.accessToken;
    if (!restoreFile || !t) return;
    setError(null);
    setSuccess(null);
    setRestoring(true);
    setShowRestoreConfirm(false);
    try {
      const result = await api.restoreBackup(t, restoreFile);
      setSuccess(result.message);
      setRestoreFile(null);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка восстановления");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Бэкапы</h1>
        <p className="text-muted-foreground mt-1">
          Создание и восстановление резервной копии базы данных. Бэкапы сохраняются на сервере по дням.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Создать бэкап
            </CardTitle>
            <CardDescription>
              Создаёт дамп БД, сохраняет его на сервере (по дням) и отдаёт файл на скачивание.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateBackup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание…
                </>
              ) : (
                "Создать и скачать бэкап"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Восстановить из файла
            </CardTitle>
            <CardDescription>
              Загрузить SQL-файл с компьютера. Текущие данные будут заменены.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="file"
              accept=".sql"
              onChange={handleRestoreSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
              disabled={restoring}
            />
            {restoring && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Восстановление…
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Авто-бэкап в Telegram
          </CardTitle>
          <CardDescription>
            Автоматическая отправка SQL-бэкапа в Telegram-группу по расписанию. Настройте топик «Авто-бэкапы» в разделе Настройки → Уведомления.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                autoBackupEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              )}>
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">{autoBackupEnabled ? "Авто-бэкапы включены" : "Авто-бэкапы выключены"}</p>
                <p className="text-xs text-muted-foreground">Бэкап отправляется в Telegram-группу по cron-расписанию</p>
              </div>
            </div>
            <button
              onClick={() => setAutoBackupEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                autoBackupEnabled ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                autoBackupEnabled ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Расписание (cron)</Label>
            <Input
              value={autoBackupCron}
              onChange={(e) => setAutoBackupCron(e.target.value)}
              placeholder="0 7 * * *"
              className="max-w-xs font-mono text-sm h-8"
            />
            <p className="text-xs text-muted-foreground">
              По умолчанию: <code className="bg-muted px-1 rounded">0 7 * * *</code> — каждый день в 7:00 UTC
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveAutoBackup} disabled={autoBackupSaving}>
              {autoBackupSaving ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button variant="outline" size="sm" onClick={sendBackupNow} disabled={autoBackupSending} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {autoBackupSending ? "Отправка…" : "Отправить сейчас"}
            </Button>
            {autoBackupMsg && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{autoBackupMsg}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Сохранённые на сервере
          </CardTitle>
          <CardDescription>
            Бэкапы по дням. Скачать или восстановить из выбранного.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка списка…
            </p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">Нет сохранённых бэкапов. Создайте первый.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">Дата</th>
                    <th className="h-10 px-4 text-left font-medium">Файл</th>
                    <th className="h-10 px-4 text-left font-medium">Размер</th>
                    <th className="h-10 px-4 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.path} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-muted-foreground">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 font-mono">{item.filename}</td>
                      <td className="px-4 py-3">{formatSize(item.size)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownload(item.path)}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Скачать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRestoreFromServer(item.path)}
                          disabled={restoring}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Восстановить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановить из загруженного файла?</DialogTitle>
            <DialogDescription>
              Текущие данные в базе будут заменены содержимым выбранного файла. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleRestoreConfirm}>Восстановить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restoreFromPath} onOpenChange={(open) => !open && setRestoreFromPath(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановить из бэкапа на сервере?</DialogTitle>
            <DialogDescription>
              База будет заменена выбранным бэкапом. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreFromPath(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleRestoreFromServerConfirm} disabled={restoring}>
              Восстановить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
