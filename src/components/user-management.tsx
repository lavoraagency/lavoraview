"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, KeyRound, Check, X, ShieldCheck } from "lucide-react";
import { DASHBOARD_TABS } from "@/lib/auth/tabs";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  id: string;
  user_id: string;
  email: string;
  role: "owner" | "employee";
  allowed_tabs: string[];
  created_at: string;
}

export function UserManagement({ initialUsers }: { initialUsers: DashboardUser[] }) {
  const [users, setUsers] = useState<DashboardUser[]>(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-user form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);

  // Per-row edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTabs, setEditTabs] = useState<string[]>([]);
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  function toggle(list: string[], key: string): string[] {
    return list.includes(key) ? list.filter(k => k !== key) : [...list, key];
  }

  async function addUser() {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, allowed_tabs: tabs }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed to add user"); return; }
      setUsers(u => [...u, j.user]);
      setShowAdd(false); setEmail(""); setPassword(""); setTabs([]);
    } finally { setBusy(false); }
  }

  async function saveTabs(userId: string) {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed_tabs: editTabs }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed to save"); return; }
      setUsers(u => u.map(x => x.user_id === userId ? { ...x, allowed_tabs: editTabs } : x));
      setEditId(null);
    } finally { setBusy(false); }
  }

  async function savePassword(userId: string) {
    if (newPw.length < 6) { setError("Password must be at least 6 characters"); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed to set password"); return; }
      setPwUserId(null); setNewPw("");
    } finally { setBusy(false); }
  }

  async function deleteUser(userId: string, userEmail: string) {
    if (!confirm(`Delete ${userEmail}? They will lose access immediately.`)) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed to delete"); return; }
      setUsers(u => u.filter(x => x.user_id !== userId));
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Add employees with their own login and choose which tabs they can access.
        </p>
        <button
          onClick={() => { setShowAdd(s => !s); setError(null); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Add user
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {/* Add-user form */}
      {showAdd && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Email</span>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="employee@email.com"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Password</span>
              <input
                type="text" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="min. 6 characters"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
              />
            </label>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-700">Tab access</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {DASHBOARD_TABS.map(t => (
                <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tabs.includes(t.key)}
                    onChange={() => setTabs(prev => toggle(prev, t.key))}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowAdd(false)} disabled={busy} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
            <button
              onClick={addUser}
              disabled={busy || !email.trim() || password.length < 6}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="divide-y divide-gray-100">
        {users.map(u => {
          const isOwnerRow = u.role === "owner";
          const editing = editId === u.user_id;
          return (
            <div key={u.user_id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{u.email}</span>
                    {isOwnerRow && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3" /> Owner
                      </span>
                    )}
                  </div>
                  {!isOwnerRow && !editing && (
                    <div className="text-xs text-gray-500 mt-1">
                      {u.allowed_tabs.length === 0
                        ? "No tabs assigned"
                        : u.allowed_tabs
                            .map(k => DASHBOARD_TABS.find(t => t.key === k)?.label || k)
                            .join(", ")}
                    </div>
                  )}
                  {isOwnerRow && (
                    <div className="text-xs text-gray-400 mt-1">Full access to everything</div>
                  )}
                </div>
                {!isOwnerRow && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!editing && (
                      <button
                        onClick={() => { setEditId(u.user_id); setEditTabs(u.allowed_tabs); setError(null); }}
                        className="px-2 py-1 rounded-md text-xs text-gray-600 border border-gray-200 hover:bg-gray-50"
                      >
                        Edit tabs
                      </button>
                    )}
                    <button
                      onClick={() => { setPwUserId(pwUserId === u.user_id ? null : u.user_id); setNewPw(""); setError(null); }}
                      className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                      title="Set new password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteUser(u.user_id, u.email)}
                      className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Inline tab editor */}
              {editing && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {DASHBOARD_TABS.map(t => (
                      <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editTabs.includes(t.key)}
                          onChange={() => setEditTabs(prev => toggle(prev, t.key))}
                          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="text-gray-700">{t.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => setEditId(null)} disabled={busy} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-gray-600 hover:bg-gray-100"><X className="w-3.5 h-3.5" /> Cancel</button>
                    <button onClick={() => saveTabs(u.user_id)} disabled={busy} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50">
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                    </button>
                  </div>
                </div>
              )}

              {/* Inline password reset */}
              {pwUserId === u.user_id && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="New password (min. 6)"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
                  />
                  <button onClick={() => savePassword(u.user_id)} disabled={busy || newPw.length < 6} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50">Set</button>
                  <button onClick={() => { setPwUserId(null); setNewPw(""); }} className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
