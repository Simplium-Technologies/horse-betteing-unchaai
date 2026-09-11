"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import EmptyState from "@/components/EmptyState";

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  _count: { races: number };
}

const statusStyles: Record<string, string> = {
  UPCOMING: "bg-blue-50 text-blue-600 border-blue-100",
  ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-100",
  COMPLETED: "bg-gray-50 text-gray-500 border-gray-100",
};

export default function AdminSeasonsPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchSeasons() {
    const res = await fetch("/api/admin/seasons");
    const data = await res.json();
    if (data.success) setSeasons(data.seasons);
    setLoading(false);
  }

  useEffect(() => { fetchSeasons(); }, []);

  function resetForm() {
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(season: Season) {
    setEditingId(season.id);
    setFormName(season.name);
    setFormStartDate(season.startDate.slice(0, 16));
    setFormEndDate(season.endDate.slice(0, 16));
    setShowForm(true);
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (!formName.trim()) { setError("Season name is required"); return; }
    if (!formStartDate) { setError("Start date is required"); return; }
    if (!formEndDate) { setError("End date is required"); return; }
    if (new Date(formEndDate) <= new Date(formStartDate)) { setError("End date must be after start date"); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, name: formName, startDate: formStartDate, endDate: formEndDate }
        : { name: formName, startDate: formStartDate, endDate: formEndDate };
      const res = await fetch("/api/admin/seasons", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      resetForm();
      fetchSeasons();
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin/seasons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchSeasons();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this season?")) return;
    const res = await fetch(`/api/admin/seasons?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) { alert(data.error); return; }
    fetchSeasons();
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
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Seasons</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Season
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 animate-slide-up">
          <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
            {editingId ? "Edit Season" : "Add New Season"}
          </h3>
          <div className="space-y-3 sm:space-y-4 max-w-md">
            <Input
              label="Season Name"
              placeholder="e.g. Summer Championship 2026"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
            />
            <Input
              label="End Date & Time"
              type="datetime-local"
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
            />
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

      {seasons.length === 0 ? (
        <EmptyState icon="📅" title="No seasons yet" description="Create your first season to group races." />
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden sm:block bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Start</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">End</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Races</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {seasons.map((season) => (
                  <tr key={season.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-sm text-gray-900">{season.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(season.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(season.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{season._count.races}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${statusStyles[season.status] || ""}`}>
                        {season.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => router.push(`/admin/seasons/${season.id}`)} className="text-xs font-semibold text-[#17251c] hover:underline">
                          View
                        </button>
                        <button onClick={() => startEdit(season)} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition">
                          Edit
                        </button>
                        {season.status === "UPCOMING" && (
                          <button onClick={() => updateStatus(season.id, "ACTIVE")} className="text-xs font-medium text-emerald-600 hover:underline">
                            Activate
                          </button>
                        )}
                        {season.status === "ACTIVE" && (
                          <button onClick={() => updateStatus(season.id, "COMPLETED")} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition">
                            Complete
                          </button>
                        )}
                        {season._count.races === 0 && (
                          <button onClick={() => handleDelete(season.id)} className="text-xs font-medium text-red-400 hover:text-red-600 transition">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden space-y-2">
            {seasons.map((season) => (
              <div key={season.id} className="bg-white rounded-xl card-shadow border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{season.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${statusStyles[season.status] || ""}`}>
                        {season.status}
                      </span>
                      <span className="text-[10px] text-gray-400">{season._count.races} races</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button onClick={() => router.push(`/admin/seasons/${season.id}`)} className="text-xs font-semibold text-[#17251c] px-2 py-1 rounded hover:bg-gray-50">
                      View
                    </button>
                    <button onClick={() => startEdit(season)} className="text-xs font-medium text-gray-400 px-2 py-1 rounded hover:bg-gray-50">
                      Edit
                    </button>
                    {season.status === "UPCOMING" && (
                      <button onClick={() => updateStatus(season.id, "ACTIVE")} className="text-xs font-medium text-emerald-600 px-2 py-1 rounded hover:bg-gray-50">
                        Activate
                      </button>
                    )}
                    {season.status === "ACTIVE" && (
                      <button onClick={() => updateStatus(season.id, "COMPLETED")} className="text-xs font-medium text-gray-400 px-2 py-1 rounded hover:bg-gray-50">
                        Complete
                      </button>
                    )}
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
