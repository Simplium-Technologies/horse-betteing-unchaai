"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import EmptyState from "@/components/EmptyState";

interface Horse {
  id: string;
  name: string;
  number: number;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
}

export default function AdminHorsesPage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchHorses() {
    const res = await fetch("/api/admin/horses");
    const data = await res.json();
    if (data.success) setHorses(data.horses);
    setLoading(false);
  }

  useEffect(() => { fetchHorses(); }, []);

  function resetForm() {
    setFormName("");
    setFormNumber("");
    setFormImageUrl("");
    setFormDescription("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(horse: Horse) {
    setEditingId(horse.id);
    setFormName(horse.name);
    setFormNumber(horse.number.toString());
    setFormImageUrl(horse.imageUrl || "");
    setFormDescription(horse.description || "");
    setShowForm(true);
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (!formName.trim()) { setError("Horse name is required"); return; }
    if (!formNumber || parseInt(formNumber) < 1) { setError("Horse number is required"); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, name: formName, number: parseInt(formNumber), imageUrl: formImageUrl || null, description: formDescription || null }
        : { name: formName, number: parseInt(formNumber), imageUrl: formImageUrl || null, description: formDescription || null };
      const res = await fetch("/api/admin/horses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      resetForm();
      fetchHorses();
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/admin/horses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchHorses();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#17251c] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Horses</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Horse
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 animate-slide-up">
          <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
            {editingId ? "Edit Horse" : "Add New Horse"}
          </h3>
          <div className="space-y-3 sm:space-y-4 max-w-md">
            <Input
              label="Horse Name"
              placeholder="e.g. Thunder Bolt"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <Input
              label="Horse Number"
              type="number"
              min={1}
              placeholder="e.g. 1"
              value={formNumber}
              onChange={(e) => setFormNumber(e.target.value)}
            />
            <Input
              label="Image URL (optional)"
              placeholder="https://..."
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
            />
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description (optional)</label>
              <textarea
                placeholder="Brief description about the horse..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:border-[#17251c] focus:ring-0 outline-none transition"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">{error}</div>
            )}
            <div className="flex gap-2 sm:gap-3">
              <Button onClick={handleSubmit} loading={saving}>{editingId ? "Update" : "Create"}</Button>
              <Button variant="secondary" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {horses.length === 0 ? (
        <EmptyState icon="🏇" title="No horses yet" description="Add your first horse to get started." />
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden sm:block bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Horse</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {horses.map((horse) => (
                  <tr key={horse.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-sm text-gray-900">
                      <span className="inline-block w-8 text-right mr-2">{horse.number}</span>
                      <span>({horse.name})</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">{horse.description || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${
                        horse.isActive
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-gray-50 text-gray-400 border-gray-100"
                      }`}>
                        {horse.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => startEdit(horse)} className="text-xs font-semibold text-[#17251c] hover:underline">
                          Edit
                        </button>
                        <button onClick={() => toggleActive(horse.id, horse.isActive)} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition">
                          {horse.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden space-y-2">
            {horses.map((horse) => (
              <div key={horse.id} className="bg-white rounded-xl card-shadow border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">
                      <span className="inline-block w-8 text-right mr-2">{horse.number}</span>
                      <span>({horse.name})</span>
                    </p>
                    {horse.description && (
                       <p className="text-[10px] text-gray-500 mt-1 leading-relaxed whitespace-pre-line">{horse.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        horse.isActive
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-gray-50 text-gray-400 border-gray-100"
                      }`}>
                        {horse.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(horse)} className="text-xs font-semibold text-[#17251c] px-2 py-1 rounded hover:bg-gray-50">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(horse.id, horse.isActive)} className="text-xs font-medium text-gray-400 px-2 py-1 rounded hover:bg-gray-50">
                      {horse.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
