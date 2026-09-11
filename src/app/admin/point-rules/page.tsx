"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import EmptyState from "@/components/EmptyState";

interface PointRule {
  id: string; name: string; type: string; position: number | null;
  topN: number | null; points: number; isActive: boolean;
}

export default function AdminPointRulesPage() {
  const [rules, setRules] = useState<PointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("CORRECT_POSITION");
  const [formPosition, setFormPosition] = useState("");
  const [formTopN, setFormTopN] = useState("");
  const [formPoints, setFormPoints] = useState("");

  async function fetchRules() {
    try {
      const res = await fetch("/api/admin/point-rules");
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
      } else {
        setError(data.error || "Failed to load rules");
      }
    } catch {
      setError("Failed to connect to server");
    }
    setLoading(false);
  }

  useEffect(() => { fetchRules(); }, []);

  function resetForm() {
    setFormName(""); setFormType("CORRECT_POSITION"); setFormPosition("");
    setFormTopN(""); setFormPoints(""); setEditingId(null); setShowForm(false); setError("");
  }

  function startEdit(rule: PointRule) {
    setEditingId(rule.id); setFormName(rule.name); setFormType(rule.type);
    setFormPosition(rule.position?.toString() || ""); setFormTopN(rule.topN?.toString() || "");
    setFormPoints(rule.points.toString()); setShowForm(true); setError("");
  }

  async function handleSubmit() {
    setError("");
    if (!formName.trim()) { setError("Rule name is required"); return; }
    if (!formPoints || parseInt(formPoints) < 1) { setError("Points must be at least 1"); return; }
    if (formType === "CORRECT_POSITION" && (!formPosition || parseInt(formPosition) < 1)) { setError("Position is required"); return; }
    if (formType === "TOP_N" && (!formTopN || parseInt(formTopN) < 1)) { setError("Top N is required"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: formName, type: formType, points: parseInt(formPoints) };
      if (formType === "CORRECT_POSITION") body.position = parseInt(formPosition);
      if (formType === "TOP_N") body.topN = parseInt(formTopN);
      if (editingId) body.id = editingId;
      const res = await fetch("/api/admin/point-rules", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      resetForm(); fetchRules();
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/admin/point-rules", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchRules();
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/admin/point-rules?id=${id}`, { method: "DELETE" });
    fetchRules();
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
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Point Rules</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Add Rule</Button>
      </div>

      {error && !showForm && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 font-medium mb-4 sm:mb-6">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 animate-slide-up">
          <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">{editingId ? "Edit Rule" : "New Rule"}</h3>
          <div className="space-y-3 sm:space-y-4 max-w-md">
            <Input label="Rule Name" placeholder="e.g. Correct 1st Place" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <Select
              label="Type"
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              options={[{ value: "CORRECT_POSITION", label: "Correct Position" }, { value: "TOP_N", label: "Top N Finish" }]}
            />
            {formType === "CORRECT_POSITION" && <Input label="Position" type="number" min={1} placeholder="1" value={formPosition} onChange={(e) => setFormPosition(e.target.value)} />}
            {formType === "TOP_N" && <Input label="Top N" type="number" min={1} placeholder="3" value={formTopN} onChange={(e) => setFormTopN(e.target.value)} />}
            <Input label="Points" type="number" min={1} placeholder="10" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} />
            {error && <div className="rounded-xl bg-red-50 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">{error}</div>}
            <div className="flex gap-2 sm:gap-3">
              <Button onClick={handleSubmit} loading={saving}>{editingId ? "Update" : "Create"}</Button>
              <Button variant="secondary" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <EmptyState icon="📋" title="No point rules" description="Add rules to define how points are scored." />
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden sm:block bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Condition</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Points</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-sm text-gray-900">{rule.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {rule.type === "CORRECT_POSITION" ? "Correct" : "Top N"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {rule.type === "CORRECT_POSITION"
                        ? `Predicted position #${rule.position} matches actual`
                        : `Finishes in top ${rule.topN}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#17251c]">{rule.points}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${
                        rule.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"
                      }`}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => startEdit(rule)} className="text-xs font-semibold text-[#17251c] hover:underline">Edit</button>
                        <button onClick={() => toggleActive(rule.id, rule.isActive)} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition">
                          {rule.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="text-xs font-medium text-red-400 hover:text-red-600 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-xl card-shadow border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{rule.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {rule.type === "CORRECT_POSITION" ? "Correct Position" : "Top N Finish"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {rule.type === "CORRECT_POSITION"
                        ? `Position #${rule.position}`
                        : `Top ${rule.topN}`}
                      {" · "}
                      <span className="font-bold text-[#17251c]">{rule.points} pts</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        rule.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"
                      }`}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(rule)} className="text-[10px] font-semibold text-[#17251c] px-1.5 py-1 rounded hover:bg-gray-50">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(rule.id, rule.isActive)} className="text-[10px] font-medium text-gray-400 px-1.5 py-1 rounded hover:bg-gray-50">
                      {rule.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="text-[10px] font-medium text-red-400 px-1.5 py-1 rounded hover:bg-gray-50">
                      Delete
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
