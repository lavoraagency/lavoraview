"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Sparkles, FileText, Database } from "lucide-react";
import { updateModel as updateModelAction, createTag as createTagAction, deleteTag as deleteTagAction, saveSystemDescription, saveAiDataSources } from "@/app/dashboard/settings/actions";
import { AI_DATA_SOURCES, DEFAULT_AI_DATA_SOURCES, type AiDataSourceKey } from "@/lib/ai-data-sources";

export function SettingsClient({ initialModels, initialTags, initialSystemDescription = "", initialAiDataSources }: {
  initialModels: any[]; initialTags: any[]; initialSystemDescription?: string; initialAiDataSources?: AiDataSourceKey[];
}) {
  const [systemDescription, setSystemDescription] = useState(initialSystemDescription);
  const [systemDescSaving, setSystemDescSaving] = useState(false);

  // AI data sources — which sections go into Claude
  const [aiSources, setAiSources] = useState<AiDataSourceKey[]>(initialAiDataSources || DEFAULT_AI_DATA_SOURCES);

  async function handleSaveSystemDesc() {
    setSystemDescSaving(true);
    const result = await saveSystemDescription(systemDescription);
    if (!result.success) showMessage("error", result.error || "Failed to save");
    else showMessage("success", "System description saved");
    setSystemDescSaving(false);
  }

  async function toggleAiSource(key: AiDataSourceKey, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...aiSources, key])) as AiDataSourceKey[]
      : aiSources.filter(k => k !== key);
    setAiSources(next);
    const result = await saveAiDataSources(next);
    if (!result.success) showMessage("error", result.error || "Failed to save");
  }

  const [models, setModels] = useState(initialModels);
  const [tags, setTags] = useState(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // AI Settings (stored in localStorage, used by Pattern Analysis)
  const [aiLanguage, setAiLanguage] = useState<"en" | "de">("en");

  useEffect(() => {
    const saved = localStorage.getItem("ai_analysis_language");
    if (saved === "de" || saved === "en") setAiLanguage(saved);
  }, []);

  function updateAiLanguage(lang: "en" | "de") {
    setAiLanguage(lang);
    localStorage.setItem("ai_analysis_language", lang);
    showMessage("success", lang === "de" ? "AI-Sprache auf Deutsch gestellt" : "AI language set to English");
  }

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function saveModel(model: any) {
    setSaving(model.id);
    const result = await updateModelAction(model.id, {
      nickname: model.nickname || null,
      max_recent_reels: model.max_recent_reels,
      viral_view_threshold: model.viral_view_threshold
    });

    if (!result.success) showMessage("error", result.error || "Fehler beim Speichern");
    else showMessage("success", `${model.nickname || model.name} gespeichert`);
    setSaving(null);
  }

  function updateModel(id: string, field: string, value: any) {
    setModels(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    const result = await createTagAction(newTagName, newTagColor);

    if (!result.success) showMessage("error", result.error || "Fehler");
    else {
      setTags(prev => [...prev, result.data]);
      setNewTagName("");
      showMessage("success", "Tag erstellt");
    }
  }

  async function deleteTag(id: string) {
    if (!confirm("Tag wirklich löschen?")) return;
    const result = await deleteTagAction(id);
    if (!result.success) showMessage("error", result.error || "Fehler");
    else {
      setTags(prev => prev.filter(t => t.id !== id));
      showMessage("success", "Tag gelöscht");
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 text-sm mt-1">Model-Konfiguration, Tags und User-Verwaltung</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Model Settings */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Model-Einstellungen</h2>
        <div className="space-y-4">
          {models.map(model => (
            <div key={model.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{model.nickname || model.name}</h3>
                  {model.nickname && <p className="text-xs text-gray-400">{model.name}</p>}
                </div>
                <button
                  onClick={() => saveModel(model)}
                  disabled={saving === model.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Save className="w-3 h-3" />
                  {saving === model.id ? "Speichern..." : "Speichern"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nickname
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={model.name}
                    value={model.nickname || ""}
                    onChange={e => updateModel(model.id, "nickname", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max. Reels pro Scrape
                    <span className="text-gray-400 font-normal ml-1">(Standard: 15)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={model.max_recent_reels ?? 15}
                    onChange={e => updateModel(model.id, "max_recent_reels", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Viral View Threshold
                    <span className="text-gray-400 font-normal ml-1">(Views/Tag ab dem viral)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={model.viral_view_threshold ?? 500}
                    onChange={e => updateModel(model.id, "viral_view_threshold", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          ))}
          {models.length === 0 && (
            <p className="text-gray-400 text-sm">Keine Models vorhanden. Führe zuerst den Google Sheet Sync aus.</p>
          )}
        </div>
      </section>

      {/* Tag Management */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tag-Verwaltung</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          {/* Create tag */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Tag Name..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createTag()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
              className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
              title="Farbe wählen"
            />
            <button
              onClick={createTag}
              disabled={!newTagName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Erstellen
            </button>
          </div>

          {/* Tags list */}
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color || "#6366f1" }} />
                  <span className="text-sm font-medium text-gray-700">{tag.name}</span>
                </div>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {tags.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">Noch keine Tags vorhanden</p>
            )}
          </div>
        </div>
      </section>

      {/* System Description */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-500" />
          System Description
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <p className="text-xs text-gray-500">
            This text is given to Claude as context when running analyses. Describe what your metrics mean, how your system works, how conversions flow, account structure etc. Leave empty to use the default description.
          </p>
          <textarea
            value={systemDescription}
            onChange={e => setSystemDescription(e.target.value)}
            rows={12}
            placeholder="e.g. 'We run multiple Instagram accounts to drive traffic to OnlyFans subscriptions. Link clicks come from bio taps...'"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{systemDescription.length} chars</span>
            <button
              onClick={handleSaveSystemDesc}
              disabled={systemDescSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-3 h-3" />
              {systemDescSaving ? "Saving..." : "Save Description"}
            </button>
          </div>
        </div>
      </section>

      {/* AI Data Sources */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-500" />
          AI Analysis Data Sources
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <p className="text-xs text-gray-500 mb-2">
            Select which data sections are included in ALL AI analyses (both Change Impact and AI Analysis Assistant). Uncheck anything you want Claude to ignore. Fewer sections = lower token cost.
          </p>
          <div className="divide-y divide-gray-100">
            {AI_DATA_SOURCES.map(src => {
              const checked = aiSources.includes(src.key);
              return (
                <label key={src.key} className="flex items-start gap-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => toggleAiSource(src.key, e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{src.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{src.description}</div>
                  </div>
                  {checked && (
                    <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded self-center">Included</span>
                  )}
                </label>
              );
            })}
          </div>
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            {aiSources.length}/{AI_DATA_SOURCES.length} sources enabled · Auto-saved
          </div>
        </div>
      </section>

      {/* AI Analysis Settings */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI-Analyse Einstellungen
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sprache der Auswertung</label>
            <p className="text-xs text-gray-500 mb-3">
              Die Video-Daten bleiben immer auf Englisch. Hier wählst du die Sprache, in der Claude die Pattern-Analyse schreibt.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => updateAiLanguage("en")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  aiLanguage === "en"
                    ? "bg-purple-500 border-purple-500 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => updateAiLanguage("de")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  aiLanguage === "de"
                    ? "bg-purple-500 border-purple-500 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                🇩🇪 Deutsch
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* User Management */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User-Verwaltung</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-4">
            Neue User über das Supabase Dashboard einladen:
          </p>
          <a
            href="https://supabase.com/dashboard/project/tzixaixkexxgdiyecire/auth/users"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Supabase Auth → User einladen
          </a>
          <p className="text-xs text-gray-400 mt-2">
            Im Supabase Dashboard kannst du unter Authentication → Users neue User per Email einladen.
          </p>
        </div>
      </section>
    </div>
  );
}
