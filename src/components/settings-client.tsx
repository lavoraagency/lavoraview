"use client";

import { useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { updateModel as updateModelAction, createTag as createTagAction, deleteTag as deleteTagAction } from "@/app/dashboard/settings/actions";

export function SettingsClient({ initialModels, initialTags }: {
  initialModels: any[]; initialTags: any[];
}) {
  const [models, setModels] = useState(initialModels);
  const [tags, setTags] = useState(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
