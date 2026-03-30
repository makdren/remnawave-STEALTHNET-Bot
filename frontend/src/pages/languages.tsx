import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import type { LanguageInfo } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Languages,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Save,
  X,
  Check,
  ChevronLeft,
  Globe,
} from "lucide-react";

const LANG_NAMES: Record<string, string> = {
  ru: "Русский",
  en: "English",
  uk: "Українська",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  pt: "Português",
  it: "Italiano",
  pl: "Polski",
  tr: "Türkçe",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ar: "العربية",
  hi: "हिन्दी",
  fa: "فارسی",
  kk: "Қазақша",
  uz: "O'zbekcha",
};

function flattenObj(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") result[key] = v;
    else if (v && typeof v === "object") Object.assign(result, flattenObj(v as Record<string, unknown>, key));
  }
  return result;
}

function nestObj(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

type FilterMode = "all" | "untranslated" | "translated";

function LanguageEditor({
  code,
  onBack,
  token,
}: {
  code: string;
  onBack: () => void;
  token: string;
}) {
  const [masterKeys, setMasterKeys] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveOk, setSaveOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, packRes] = await Promise.all([
        api.getLanguageKeys(token),
        api.getLanguagePack(token, code),
      ]);
      if (keysRes.ok) setMasterKeys(keysRes.keys);
      if (packRes.ok) setTranslations(flattenObj(packRes.data));
    } finally {
      setLoading(false);
    }
  }, [token, code]);

  useEffect(() => { load(); }, [load]);

  const allKeys = useMemo(() => Object.keys(masterKeys).sort(), [masterKeys]);

  const groups = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const key of allKeys) {
      const group = key.split(".")[0];
      if (!g[group]) g[group] = [];
      g[group].push(key);
    }
    return g;
  }, [allKeys]);

  const filteredGroups = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [group, keys] of Object.entries(groups)) {
      const filtered = keys.filter((key) => {
        if (filter === "untranslated" && translations[key]) return false;
        if (filter === "translated" && !translations[key]) return false;
        if (search) {
          return (
            key.toLowerCase().includes(lowerSearch) ||
            (masterKeys[key] || "").toLowerCase().includes(lowerSearch) ||
            (translations[key] || "").toLowerCase().includes(lowerSearch)
          );
        }
        return true;
      });
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [groups, search, filter, translations, masterKeys]);

  const handleSave = async () => {
    setSaving(true);
    setSaveOk(false);
    try {
      const nested = nestObj(translations);
      await api.saveLanguagePack(token, code, nested);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importLanguagePack(token, code, data);
      await load();
    } catch {
      /* ignore parse errors */
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExport = async () => {
    try {
      const text = await api.exportLanguagePack(token, code);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lang-${code}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  const setTranslation = (key: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const translatedCount = allKeys.filter((k) => !!translations[k]).length;
  const totalCount = allKeys.length;
  const pct = totalCount > 0 ? Math.round((translatedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <Globe className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {LANG_NAMES[code] || code}
              <span className="ml-2 text-sm font-normal text-muted-foreground uppercase">{code}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {translatedCount} / {totalCount} ({pct}%)
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saveOk ? <Check className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {saveOk ? "Saved" : saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search keys or values..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(["all", "untranslated", "translated"] as FilterMode[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Grouped keys */}
      {Object.keys(filteredGroups).length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No keys match your filter.</p>
      ) : (
        Object.entries(filteredGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([group, keys]) => (
            <Card key={group}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                  <span className="ml-2 text-xs font-normal">({keys.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {keys.map((key) => (
                    <div key={key} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-2 px-4 py-3 items-start">
                      <div className="font-mono text-xs text-muted-foreground break-all pt-2">{key}</div>
                      <div className="text-sm text-foreground/70 bg-muted/50 rounded px-3 py-2 break-words min-h-[2.5rem]">
                        {masterKeys[key] || "—"}
                      </div>
                      <Input
                        value={translations[key] || ""}
                        onChange={(e) => setTranslation(key, e.target.value)}
                        placeholder="Translation..."
                        className={
                          translations[key]
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-orange-500/30 bg-orange-500/5"
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
      )}

      {/* Floating save */}
      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saving} className="shadow-lg">
          {saveOk ? <Check className="h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {saveOk ? "Saved!" : saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}

export default function LanguagesPage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const token = state.accessToken!;

  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [totalKeys, setTotalKeys] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadLanguages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLanguages(token);
      if (res.ok) {
        setLanguages(res.languages);
        setTotalKeys(res.totalKeys);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadLanguages(); }, [loadLanguages]);

  const handleAdd = async () => {
    const code = addCode.trim().toLowerCase();
    if (!code || code.length < 2) return;
    setAddLoading(true);
    try {
      await api.saveLanguagePack(token, code, {});
      setAddOpen(false);
      setAddCode("");
      await loadLanguages();
      setEditing(code);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteLanguage(token, deleteTarget);
      setDeleteTarget(null);
      await loadLanguages();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async (code: string) => {
    try {
      const text = await api.exportLanguagePack(token, code);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lang-${code}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  if (editing) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <LanguageEditor
          code={editing}
          token={token}
          onBack={() => {
            setEditing(null);
            loadLanguages();
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("admin.nav.languages", "Languages")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {languages.length} language{languages.length !== 1 ? "s" : ""} &middot; {totalKeys} keys
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Language
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : languages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Globe className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No language packs yet</p>
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first language
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {languages.map((lang) => {
            const pct = Math.round(lang.completeness * 100);
            return (
              <Card
                key={lang.code}
                className="group relative overflow-hidden hover:border-primary/40 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground uppercase tracking-wider">
                        {lang.code}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {LANG_NAMES[lang.code] || lang.code}
                      </span>
                    </div>
                    <span
                      className={
                        "text-sm font-semibold " +
                        (pct >= 90
                          ? "text-green-500"
                          : pct >= 50
                            ? "text-yellow-500"
                            : "text-orange-500")
                      }
                    >
                      {pct}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={
                        "h-full rounded-full transition-all duration-500 " +
                        (pct >= 90
                          ? "bg-green-500"
                          : pct >= 50
                            ? "bg-yellow-500"
                            : "bg-orange-500")
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {lang.translatedKeys} / {lang.totalKeys} keys translated
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditing(lang.code)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleExport(lang.code)}
                      title="Export JSON"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(lang.code)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Language Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Language</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lang-code">Language code</Label>
              <Input
                id="lang-code"
                placeholder="e.g. en, uk, fr, de"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 5))}
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">
                {LANG_NAMES[addCode.toLowerCase()] && (
                  <span className="text-foreground">{LANG_NAMES[addCode.toLowerCase()]}</span>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addLoading || addCode.trim().length < 2}>
              {addLoading ? "Creating..." : "Create & Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Language Pack</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete the{" "}
            <strong className="text-foreground">
              {deleteTarget && (LANG_NAMES[deleteTarget] || deleteTarget)}
            </strong>{" "}
            ({deleteTarget}) language pack? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
