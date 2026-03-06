import { useEffect, useState } from "react";
import { MessageSquarePlus, Inbox, Loader2, Send, ArrowLeft, CircleDot, CircleCheck, User } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TicketItem = { id: string; subject: string; status: string; createdAt: string; updatedAt: string };
type TicketMessage = { id: string; authorType: string; content: string; createdAt: string };

export function ClientTicketsPage() {
  const { state } = useClientAuth();
  const token = state.token ?? null;

  const [list, setList] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    id: string;
    subject: string;
    status: string;
    messages: TicketMessage[];
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [createSending, setCreateSending] = useState(false);

  const loadList = () => {
    if (!token) return;
    setError(null);
    api
      .getTickets(token)
      .then((r) => {
        setList(r.items);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    loadList();
    const intervalId = window.setInterval(loadList, 10000);
    return () => {
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!detailId || !token) {
      setDetail(null);
      return;
    }
    const loadDetail = () => {
      setDetailLoading(true);
      api
        .getTicket(token, detailId)
        .then((t) => setDetail({ ...t, messages: t.messages }))
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false));
    };
    loadDetail();
    const intervalId = window.setInterval(loadDetail, 10000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [detailId, token]);

  const sendReply = () => {
    if (!token || !detailId || !replyText.trim()) return;
    setReplySending(true);
    api
      .replyTicket(token, detailId, { content: replyText.trim() })
      .then((msg) => {
        setDetail((d) => (d ? { ...d, messages: [...d.messages, msg] } : d));
        setReplyText("");
      })
      .finally(() => setReplySending(false));
  };

  const createTicket = () => {
    if (!token || !newSubject.trim() || !newMessage.trim()) return;
    setCreateSending(true);
    api
      .createTicket(token, { subject: newSubject.trim(), message: newMessage.trim() })
      .then((t) => {
        setList((prev) => [{ id: t.id, subject: t.subject, status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt }, ...prev]);
        setDetailId(t.id);
        setDetail({ id: t.id, subject: t.subject, status: t.status, messages: t.messages, createdAt: t.createdAt, updatedAt: t.updatedAt });
        setShowNewForm(false);
        setNewSubject("");
        setNewMessage("");
      })
      .finally(() => setCreateSending(false));
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      const isToday = new Date().toDateString() === d.toDateString();
      if (isToday) {
        return "Сегодня, " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return s;
    }
  };

  if (loading && list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Загрузка обращений…</p>
      </div>
    );
  }

  if (error && list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2 shadow-inner">
          <MessageSquarePlus className="h-6 w-6 opacity-80" />
        </div>
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button variant="outline" onClick={loadList} className="mt-2 rounded-xl">Повторить попытку</Button>
      </div>
    );
  }

  if (detailId && detail) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] max-h-[800px] w-full rounded-[2.5rem] border border-white/10 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-[32px] shadow-2xl overflow-hidden relative">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 bg-background/30 backdrop-blur-md shrink-0 z-10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-full bg-background/50 hover:bg-background/80 transition-transform hover:scale-105" onClick={() => { setDetailId(null); setDetail(null); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold truncate text-foreground">{detail.subject}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", detail.status === "open" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                  {detail.status === "open" ? <CircleDot className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
                  {detail.status === "open" ? "Открыт" : "Закрыт"}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">Обновлён: {formatDate(detail.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
          {detail.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm font-medium">Нет сообщений</div>
          ) : (
            detail.messages.map((m) => {
              const isSupport = m.authorType === "support";
              return (
                <div key={m.id} className={cn("flex w-full flex-col", isSupport ? "items-start" : "items-end")}>
                  <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                    {isSupport && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary mb-1 shadow-sm border border-primary/20">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className={cn("flex flex-col gap-1 relative group")}>
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl shadow-sm text-[13.5px] sm:text-sm leading-relaxed",
                          isSupport
                            ? "bg-muted text-foreground rounded-bl-sm border border-border/50"
                            : "bg-primary text-primary-foreground rounded-br-sm shadow-primary/20"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words font-medium">{m.content}</p>
                      </div>
                      <span className={cn("text-[10px] text-muted-foreground px-1 font-semibold", isSupport ? "text-left" : "text-right")}>
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {detail.status === "open" && (
          <div className="p-4 sm:p-5 border-t border-border/50 bg-background/40 backdrop-blur-md shrink-0">
            <div className="flex gap-3 items-end max-w-4xl mx-auto">
              <Textarea
                placeholder="Сообщение..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="resize-none min-h-[50px] max-h-[120px] rounded-[1.5rem] bg-background/60 border-white/10 dark:border-white/5 focus-visible:ring-1 focus-visible:ring-primary shadow-inner text-sm font-medium py-3.5 px-4"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <Button
                onClick={sendReply}
                disabled={replySending || !replyText.trim()}
                className="h-[50px] w-[50px] rounded-[1.2rem] shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
                size="icon"
              >
                {replySending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
              </Button>
            </div>
            <p className="hidden sm:block text-center text-[10px] text-muted-foreground mt-2 font-medium">Нажмите Enter для отправки, Shift + Enter для переноса строки</p>
          </div>
        )}
      </div>
    );
  }

  if (detailId && detailLoading) {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center w-full rounded-[2.5rem] border border-white/10 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-[32px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        <Button variant="ghost" className="rounded-xl" onClick={() => setDetailId(null)}>Отменить загрузку</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Поддержка</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Создавайте тикеты для связи с администрацией.</p>
        </div>
        {!showNewForm && (
          <Button
            onClick={() => setShowNewForm(true)}
            className="rounded-xl shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-105 h-11 px-5"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            <span className="font-semibold text-[13px] tracking-wide">СОЗДАТЬ ТИКЕТ</span>
          </Button>
        )}
      </div>

      {showNewForm && (
        <div className="rounded-[2.5rem] border border-white/20 dark:border-white/10 bg-slate-100/60 dark:bg-slate-950/60 backdrop-blur-[32px] shadow-[0_10px_60px_rgba(0,0,0,0.15)]  overflow-hidden p-1 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="p-5 sm:p-7 relative z-10">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              Новое обращение
            </h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-subject" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Заголовок проблемы</Label>
                <Input
                  id="new-subject"
                  placeholder="О чем пойдет речь?"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  maxLength={500}
                  className="rounded-2xl h-12 bg-background/50 border-white/10 dark:border-white/5 shadow-inner font-medium text-sm px-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-message" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Детальное описание</Label>
                <Textarea
                  id="new-message"
                  placeholder="Опишите проблему или задайте вопрос..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={5}
                  className="resize-none rounded-2xl bg-background/50 border-white/10 dark:border-white/5 shadow-inner p-4 font-medium text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={createTicket}
                  disabled={createSending || !newSubject.trim() || !newMessage.trim()}
                  className="rounded-xl h-11 w-full sm:w-auto px-8 font-semibold tracking-wide"
                >
                  {createSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Отправить
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowNewForm(false); setNewSubject(""); setNewMessage(""); }}
                  className="rounded-xl h-11 w-full sm:w-auto bg-background/30 hover:bg-background/50 font-semibold"
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showNewForm && list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-[2.5rem] border border-dashed border-border/60 bg-card/20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary mb-4 border border-primary/20">
            <Inbox className="h-8 w-8 opacity-80" />
          </div>
          <h3 className="text-lg font-bold text-foreground">У вас нет обращений</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm font-medium">Здесь будет отображаться история ваших тикетов в службу поддержки.</p>
        </div>
      ) : !showNewForm ? (
        <div className="grid gap-3 sm:gap-4">
          {list.map((t) => {
            const isOpen = t.status === "open";
            return (
              <div
                key={t.id}
                onClick={() => setDetailId(t.id)}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 bg-[hsl(var(--card)/0.8)] dark:bg-[hsl(var(--card)/0.5)] backdrop-blur-[32px] p-5 sm:p-6 transition-all duration-300 hover:bg-card/90 dark:hover:bg-card/70 hover:shadow-[0_10px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer"
              >
                {isOpen && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}
                <div className="min-w-0 flex-1 pl-1">
                  <h4 className="font-bold text-base sm:text-lg text-foreground truncate group-hover:text-primary transition-colors">{t.subject}</h4>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        isOpen ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isOpen ? <CircleDot className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
                      {isOpen ? "Открыт" : "Закрыт"}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">Последнее сообщение: {formatDate(t.updatedAt)}</span>
                  </div>
                </div>
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/50 border border-white/10 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:border-primary/50 group-hover:text-primary-foreground group-hover:shadow-md">
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
