import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Video, Plus, Trash2, Save, RefreshCw, ArrowUp, ArrowDown,
  Pencil, X, Check, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Instruction {
  id: string;
  title: string;
  telegramFileId: string;
  sortOrder: number;
}

export function VideoInstructionsPage() {
  const { state } = useAuth();
  const token = state.accessToken!;

  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newFileId, setNewFileId] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFileId, setEditFileId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getVideoInstructions(token);
      setEnabled(res.enabled);
      setItems(res.items.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      setMessage("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function toggle() {
    setSaving(true);
    try {
      await api.toggleVideoInstructions(token, !enabled);
      setEnabled(!enabled);
      flash(!enabled ? "Видео-инструкции включены" : "Видео-инструкции выключены");
    } catch {
      flash("Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function addItem() {
    if (!newTitle.trim() || !newFileId.trim()) return;
    setAdding(true);
    try {
      const res = await api.addVideoInstruction(token, newTitle.trim(), newFileId.trim());
      setItems(res.items.sort((a: Instruction, b: Instruction) => a.sortOrder - b.sortOrder));
      setNewTitle("");
      setNewFileId("");
      setShowForm(false);
      flash("Инструкция добавлена");
    } catch {
      flash("Ошибка добавления");
    } finally {
      setAdding(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Удалить эту инструкцию?")) return;
    try {
      const res = await api.deleteVideoInstruction(token, id);
      setItems(res.items.sort((a: Instruction, b: Instruction) => a.sortOrder - b.sortOrder));
      flash("Удалено");
    } catch {
      flash("Ошибка удаления");
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await api.updateVideoInstruction(token, editingId, {
        title: editTitle.trim(),
        telegramFileId: editFileId.trim(),
      });
      setItems(res.items.sort((a: Instruction, b: Instruction) => a.sortOrder - b.sortOrder));
      setEditingId(null);
      flash("Сохранено");
    } catch {
      flash("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function move(id: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const newItems = [...items];
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
    setItems(newItems);
    try {
      const res = await api.reorderVideoInstructions(token, newItems.map((i) => i.id));
      setItems(res.items.sort((a: Instruction, b: Instruction) => a.sortOrder - b.sortOrder));
    } catch {
      flash("Ошибка сортировки");
    }
  }

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  function startEdit(item: Instruction) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditFileId(item.telegramFileId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
          <span className="text-sm text-muted-foreground">Загрузка…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Видео-инструкции</h1>
          <p className="text-muted-foreground mt-1">
            Кнопки с видео в разделе «Поддержка» Telegram-бота
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              {message}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between rounded-xl border bg-card/50 p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
          )}>
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-sm">Видео-инструкции в боте</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? "Кнопка «Инструкции» отображается в разделе «Поддержка»" : "Раздел скрыт от пользователей"}
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
          )}
        >
          <span className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            enabled ? "translate-x-5" : "translate-x-0"
          )} />
        </button>
      </div>

      {/* How to get file_id hint */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-700 dark:text-blue-400">Как получить file_id видео?</p>
          <p className="text-muted-foreground mt-1">
            Отправьте видео в бот. Бот ответит file_id, который нужно вставить при добавлении инструкции.
            Также можно переслать видео из любого чата — бот вернёт file_id.
          </p>
        </div>
      </div>

      {/* Instructions list */}
      <div className="space-y-2">
        {items.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Инструкции ещё не добавлены</p>
          </div>
        )}

        {items.map((item, idx) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-xl border bg-card/50 p-4 transition-all hover:bg-accent/50"
          >
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => move(item.id, "up")}
                disabled={idx === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => move(item.id, "down")}
                disabled={idx === items.length - 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Video className="h-5 w-5" />
            </div>

            {editingId === item.id ? (
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Название кнопки"
                  className="h-8 text-sm"
                />
                <Input
                  value={editFileId}
                  onChange={(e) => setEditFileId(e.target.value)}
                  placeholder="Telegram file_id"
                  className="h-8 text-sm font-mono"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveEdit} disabled={saving}>
                    <Check className="h-3 w-3" /> Сохранить
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3" /> Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground font-mono truncate mt-0.5" title={item.telegramFileId}>
                  {item.telegramFileId}
                </p>
              </div>
            )}

            {editingId !== item.id && (
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)} title="Редактировать">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(item.id)} title="Удалить">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      {showForm ? (
        <div className="rounded-xl border bg-card/50 p-4 space-y-3">
          <p className="font-medium text-sm">Новая инструкция</p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Название кнопки</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Инструкция по подключению"
              />
            </div>
            <div>
              <Label className="text-xs">Telegram file_id видео</Label>
              <Input
                value={newFileId}
                onChange={(e) => setNewFileId(e.target.value)}
                placeholder="BAACAgIAAxkBAAI..."
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addItem} disabled={adding || !newTitle.trim() || !newFileId.trim()} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {adding ? "Добавление…" : "Добавить"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setNewTitle(""); setNewFileId(""); }}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Добавить инструкцию
        </Button>
      )}
    </div>
  );
}
