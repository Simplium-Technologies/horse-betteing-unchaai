"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/Button";

interface Horse { id: string; name: string; number: number; imageUrl: string | null; description: string | null; age: string | null; breed: string | null; wins: number; totalRuns: number; }
interface Race { name: string; status: string; raceHorses: { horse: Horse }[]; }

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const raceId = params.id as string;
  const [race, setRace] = useState<Race | null>(null);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/races/${raceId}`).then((r) => r.json()).then((data) => {
      if (data.success) setRace(data.race);
      setLoading(false);
    });
  }, [raceId]);

  function setPosition(horseId: string, pos: number) {
    setPositions((prev) => ({ ...prev, [horseId]: pos }));
  }

  async function handleSubmit() {
    setError("");
    const results = Object.entries(positions)
      .filter(([, pos]) => pos > 0)
      .map(([horseId, actualPosition]) => ({ horseId, actualPosition }));
    if (results.length !== 3 || new Set(results.map((r) => r.actualPosition)).size !== 3 || ![1, 2, 3].every((position) => results.some((result) => result.actualPosition === position))) {
      setError("Please set the 1st, 2nd, and 3rd positions");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/races/${raceId}/results`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      router.push("/admin/races");
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#17251c] rounded-full animate-spin" />
      </div>
    );
  }
  if (!race) return <p className="text-red-500 text-sm font-medium">Race not found</p>;

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Enter Results</h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{race.name}</p>
      </div>

      <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 max-w-lg animate-slide-up">
        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">
          Select the horses that finished 1st, 2nd, and 3rd
        </p>

        <div className="mt-3 sm:mt-4">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider text-right mb-2">Enter the result</p>
          <div className="divide-y divide-gray-100">
            {race.raceHorses.map((rh) => {
              const usedPositions = new Set(Object.values(positions).filter((v) => v !== positions[rh.horse.id]));
              return (
                <div key={rh.horse.id} className="py-3 sm:py-4 first:pt-0 last:pb-0">
                  <p className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    {rh.horse.number} ({rh.horse.name})
                  </p>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100">
                      <img src={rh.horse.imageUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Horse_racing_drawing.jpg/960px-Horse_racing_drawing.jpg"} alt={rh.horse.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="space-y-0.5">
                        {rh.horse.description ? rh.horse.description.split("|").map((line, i) => <p key={i} className="text-xs sm:text-sm text-gray-700">{line.trim()}</p>) : <>
                          <p className="text-xs sm:text-sm text-gray-700">Age: {rh.horse.age || "-"}</p>
                          <p className="text-xs sm:text-sm text-gray-700">Breed: {rh.horse.breed || "-"}</p>
                          <p className="text-xs sm:text-sm text-gray-700">Won/Run: {rh.horse.wins} / {rh.horse.totalRuns}</p>
                        </>}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:gap-2.5">
                      {[1, 2, 3].map((pos) => {
                        const isSelected = positions[rh.horse.id] === pos;
                        const isUsed = usedPositions.has(pos);
                        return (
                          <button
                            key={pos}
                            disabled={isUsed && !isSelected}
                            onClick={() => isSelected ? setPosition(rh.horse.id, 0) : setPosition(rh.horse.id, pos)}
                            onDoubleClick={() => isSelected && setPosition(rh.horse.id, 0)}
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg text-sm sm:text-base font-bold transition ${
                              isSelected
                                ? "bg-[#17251c] text-white"
                                : isUsed
                                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#17251c] hover:text-[#17251c] cursor-pointer"
                            }`}
                          >
                            {pos}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 font-medium mt-3 sm:mt-4">{error}</div>}

        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
          <Button onClick={handleSubmit} loading={saving}>Save Results</Button>
          <Button variant="secondary" onClick={() => router.push("/admin/races")}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
