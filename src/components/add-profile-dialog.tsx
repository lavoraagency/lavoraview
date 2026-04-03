"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AddProfileDialogProps {
  models: any[];
  groups: any[];
  onClose: () => void;
  onAdded: (profile: any) => void;
}

export function AddProfileDialog({ models, groups, onClose, onAdded }: AddProfileDialogProps) {
  const [username, setUsername] = useState("");
  const [modelId, setModelId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredGroups = groupId
    ? groups
    : modelId
    ? groups.filter((g: any) => g.model_id === modelId)
    : groups;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        instagram_username: username.trim().replace("@", ""),
        model_id: modelId || null,
        account_group_id: groupId || null,
        source: "manual",
        status: "working",
        is_active: true,
      })
      .select(`id, instagram_username, status, is_active, tags, models(id, name, nickname), account_groups(id, name)`)
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onAdded(data);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Profil hinzufügen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Username *</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="stephii.happyy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select
              value={modelId}
              onChange={e => { setModelId(e.target.value); setGroupId(""); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Kein Model</option>
              {models.map((m: any) => <option key={m.id} value={m.id}>{m.nickname || m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gruppe</label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Keine Gruppe</option>
              {filteredGroups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Speichern..." : "Hinzufügen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
