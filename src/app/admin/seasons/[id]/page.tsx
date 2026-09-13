"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import EmptyState from "@/components/EmptyState";
import Badge from "@/components/Badge";
import { useWebSocket } from "@/lib/ws-client";

interface Horse { id: string; name: string; number: number; isActive: boolean; }
interface Season { id: string; name: string; startDate: string; endDate: string; status: string; }
interface Race {
  id: string; name: string; durationMinutes: number; autoClose: boolean;
  startedAt: string | null; status: string; includePoints: boolean;
  raceHorses: { horseId: string }[]; _count: { predictions: number };
}

const statusStyles: Record<string, string> = {
  UPCOMING: "bg-blue-50 text-blue-600 border-blue-100",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-100",
  CLOSED: "bg-amber-50 text-amber-600 border-amber-100",
  COMPLETED: "bg-gray-50 text-gray-500 border-gray-100",
};

export default function SeasonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const seasonId = params.id as string;
  const [season, setSeason] = useState<Season | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formName, setFormName] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formAutoClose, setFormAutoClose] = useState(false);
  const [formIncludePoints, setFormIncludePoints] = useState(true);
  const [formHorseIds, setFormHorseIds] = useState<string[]>([]);
  const [editingRace, setEditingRace] = useState<Race | null>(null);

  const refetchData = useCallback(() => {
    fetchData();
  }, []);

  useWebSocket((event) => {
    if (event === "race:status_changed") refetchData();
  });

  async function fetchData() {
    const [seasonRes, racesRes, horsesRes] = await Promise.all([
      fetch(`/api/admin/seasons/${seasonId}`),
      fetch(`/api/admin/seasons/${seasonId}/races`),
      fetch("/api/admin/horses"),
    ]);
    const seasonData = await seasonRes.json();
    const racesData = await racesRes.json();
    const horsesData = await horsesRes.json();
    if (seasonData.success) setSeason(seasonData.season);
    if (racesData.success) setRaces(racesData.races);
    if (horsesData.success) setHorses(horsesData.horses.filter((h: Horse) => h.isActive));
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [seasonId]);

  function resetForm() {
    setFormName(""); setFormDuration(""); setFormAutoClose(false); setFormIncludePoints(true); setFormHorseIds([]);
    setShowForm(false); setError(""); setEditingRace(null);
  }

  function startEditing(race: Race) {
    setEditingRace(race);
    setFormName(race.name);
    setFormDuration(String(race.durationMinutes));
    setFormAutoClose(race.autoClose);
    setFormIncludePoints(race.includePoints);
    setFormHorseIds(race.raceHorses.map((rh) => rh.horseId));
    setShowForm(true);
  }

  function toggleHorse(horseId: string) {
    setFormHorseIds((prev) => prev.includes(horseId) ? prev.filter((id) => id !== horseId) : [...prev, horseId]);
  }

  async function handleCreate() {
    setError("");
    if (!formName.trim()) { setError("Race name is required"); return; }
    if (!formDuration || Number(formDuration) < 1) { setError("Duration must be at least 1 minute"); return; }
    if (formHorseIds.length < 2) { setError("Select at least 2 horses"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/races", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, durationMinutes: Number(formDuration), autoClose: formAutoClose, includePoints: formIncludePoints, horseIds: formHorseIds, seasonId }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      resetForm(); fetchData();
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    setError("");
    if (!editingRace) return;
    if (!formName.trim()) { setError("Race name is required"); return; }
    if (!formDuration || Number(formDuration) < 1) { setError("Duration must be at least 1 minute"); return; }
    if (formHorseIds.length < 2) { setError("Select at least 2 horses"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/races", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingRace.id, name: formName, durationMinutes: Number(formDuration), autoClose: formAutoClose, includePoints: formIncludePoints, horseIds: formHorseIds }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      resetForm(); fetchData();
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    setRaces((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    try {
      const res = await fetch(`/api/admin/races/${id}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) { fetchData(); }
    } catch {
      fetchData();
    }
  }

  async function toggleIncludePoints(id: string, currentValue: boolean) {
    setRaces((prev) =>
      prev.map((r) => (r.id === id ? { ...r, includePoints: !currentValue } : r))
    );
    try {
      const res = await fetch("/api/admin/races", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, includePoints: !currentValue }),
      });
      const data = await res.json();
      if (!data.success) { fetchData(); }
    } catch {
      fetchData();
    }
  }

  function getStatusAction(race: Race): { label: string; next: string } | null {
    switch (race.status) {
      case "UPCOMING": return { label: "Open Predictions", next: "OPEN" };
      case "OPEN": return { label: "Close Predictions", next: "CLOSED" };
      case "CLOSED": return { label: "Enter Results", next: "" };
      default: return null;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#17251c] rounded-full animate-spin" />
      </div>
    );
  }

  if (!season) return <p className="text-red-500 text-sm font-medium">Season not found</p>;

  return (
    <div>
      <button onClick={() => router.push("/admin/seasons")} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition mb-3 sm:mb-4 uppercase tracking-wider">
        ← Back to Seasons
      </button>

      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">{season.name}</h2>
          <Badge text={season.status} className={statusStyles[season.status] === "ACTIVE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : season.status === "COMPLETED" ? "bg-gray-50 text-gray-500 border-gray-100" : "bg-blue-50 text-blue-600 border-blue-100"} />
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          {new Date(season.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – {new Date(season.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Races in this Season</h3>
        {season.status !== "COMPLETED" && (
          <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Add Race</Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 animate-slide-up">
          <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">{editingRace ? "Edit Race" : "New Race"}</h3>
          <div className="space-y-3 sm:space-y-4 max-w-lg">
            <Input label="Race Name" placeholder="e.g. Sunday Sprint" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <Input label="Duration (minutes)" type="number" min="1" placeholder="e.g. 30" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAutoClose}
                  onChange={(e) => setFormAutoClose(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#17251c]"></div>
              </label>
              <span className="text-xs sm:text-sm text-gray-700 font-medium">Auto-close after duration</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIncludePoints}
                  onChange={(e) => setFormIncludePoints(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#17251c]"></div>
              </label>
              <span className="text-xs sm:text-sm text-gray-700 font-medium">Include in season points</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Horses (min 2)</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 sm:max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2.5 sm:p-3">
                {horses.map((horse) => (
                  <label key={horse.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-gray-50 transition">
                    <input type="checkbox" checked={formHorseIds.includes(horse.id)} onChange={() => toggleHorse(horse.id)} className="rounded border-gray-300" />
                    <span className="text-xs sm:text-sm text-gray-700 truncate">
                      <span className="inline-block w-8 text-right mr-2">{horse.number}</span>
                      <span>({horse.name})</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{formHorseIds.length} selected</p>
            </div>
            {error && <div className="rounded-xl bg-red-50 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">{error}</div>}
            <div className="flex gap-2 sm:gap-3">
              <Button onClick={editingRace ? handleUpdate : handleCreate} loading={saving}>{editingRace ? "Save Changes" : "Create Race"}</Button>
              <Button variant="secondary" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {races.length === 0 ? (
        <EmptyState icon="🏁" title="No races in this season" description="Add your first race to get started." />
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {races.map((race) => {
            const action = getStatusAction(race);
            return (
              <div key={race.id} className="bg-white rounded-xl sm:rounded-2xl card-shadow border border-gray-100 p-3 sm:p-5 hover:card-shadow-hover transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{race.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                      {race.durationMinutes} min · {race.autoClose ? "Auto-close" : "Manual close"}
                    </p>
                    {race.startedAt && (
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                        Started {new Date(race.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                      {race.raceHorses.length} horses · {race._count.predictions} predictions
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => toggleIncludePoints(race.id, race.includePoints)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border transition ${
                          race.includePoints
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                            : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        {race.includePoints ? "✓ Points Included" : "✗ Points Excluded"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <Badge text={race.status} className={statusStyles[race.status] || ""} />
                    {race.status === "UPCOMING" && (
                      <button onClick={() => startEditing(race)} className="text-[10px] sm:text-xs font-semibold bg-white text-gray-700 border border-gray-200 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-gray-50 transition">
                        Edit
                      </button>
                    )}
                    {race.status === "CLOSED" && (
                      <button onClick={() => router.push(`/admin/races/${race.id}/results`)} className="text-[10px] sm:text-xs font-semibold bg-[#17251c] text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-[#24372b] transition">
                        Enter Results
                      </button>
                    )}
                    {action && action.next && (
                      <button onClick={() => changeStatus(race.id, action.next)} className="text-[10px] sm:text-xs font-semibold bg-[#17251c] text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-[#24372b] transition">
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
