"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWebSocket } from "@/lib/ws-client";

interface User { id: string; name: string | null; phoneNumber: string; role: string; }
interface Horse { id: string; name: string; number: number; imageUrl: string | null; description: string | null; age: string | null; breed: string | null; wins: number; totalRuns: number; }
interface RaceDetail {
  id: string; name: string; durationMinutes: number; autoClose: boolean;
  startedAt: string | null; openedAt: string | null; closedAt: string | null; status: string;
  raceHorses: { horse: Horse }[];
  results: { horseId: string; horseName: string; horseNumber: number; actualPosition: number }[];
}
interface Prediction { id: string; totalPoints: number; submittedAt: string; selections: { horseId: string; predictedPosition: number }[]; }
interface BreakdownItem { horseName: string; horseNumber: number; predicted: number; actual: number; pointsEarned: number; matchedRules: string[]; }

const statusStyles: Record<string, string> = {
  UPCOMING: "bg-blue-50 text-blue-600 border-blue-100",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-100",
  CLOSED: "bg-amber-50 text-amber-600 border-amber-100",
  COMPLETED: "bg-gray-50 text-gray-500 border-gray-100",
};

const medals = ["🥇", "🥈", "🥉"];

function formatTimeTaken(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

export default function RaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const raceId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [race, setRace] = useState<RaceDetail | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  function getSelectionsKey(userId: string, raceId: string) {
    return `pending_selections_${userId}_${raceId}`;
  }

  function saveSelectionsToStorage(userId: string, raceId: string, sel: Record<string, number>) {
    try {
      const entries = Object.entries(sel).filter(([, pos]) => pos > 0);
      if (entries.length > 0) {
        localStorage.setItem(getSelectionsKey(userId, raceId), JSON.stringify(sel));
      } else {
        localStorage.removeItem(getSelectionsKey(userId, raceId));
      }
    } catch {}
  }

  function loadSelectionsFromStorage(userId: string, raceId: string): Record<string, number> | null {
    try {
      const raw = localStorage.getItem(getSelectionsKey(userId, raceId));
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  function clearSelectionsFromStorage(userId: string, raceId: string) {
    try {
      localStorage.removeItem(getSelectionsKey(userId, raceId));
    } catch {}
  }

  const fetchRace = useCallback(async () => {
    try {
      const res = await fetch(`/api/races/${raceId}`);
      const data = await res.json();
      if (data.success) {
        const prevStatus = prevStatusRef.current;
        const newStatus = data.race.status;
        prevStatusRef.current = newStatus;

        setRace(data.race);
        setPrediction(data.prediction);
        setBreakdown(data.breakdown || []);
        if (data.prediction) {
          const s: Record<string, number> = {};
          data.prediction.selections.forEach((sel: { horseId: string; predictedPosition: number }) => { s[sel.horseId] = sel.predictedPosition; });
          setSelections(s);
          if (user) clearSelectionsFromStorage(user.id, raceId);
        } else if (user) {
          const saved = loadSelectionsFromStorage(user.id, raceId);
          if (saved && Object.keys(saved).some((k) => saved[k] > 0)) {
            setSelections(saved);
          }
        }

        if (prevStatus === "OPEN" && newStatus === "CLOSED" && !data.prediction && user) {
          const saved = loadSelectionsFromStorage(user.id, raceId);
          if (saved && Object.keys(saved).some((k) => saved[k] > 0)) {
            const selArray = Object.entries(saved)
              .filter(([, pos]) => pos > 0)
              .map(([horseId, predictedPosition]) => ({ horseId, predictedPosition }));
            if (selArray.length > 0 && new Set(selArray.map((s) => s.predictedPosition)).size === selArray.length) {
              let closeTime: string | null = null;
              if (data.race.closedAt) {
                closeTime = data.race.closedAt;
              } else if (data.race.startedAt) {
                closeTime = new Date(new Date(data.race.startedAt).getTime() + data.race.durationMinutes * 60 * 1000).toISOString();
              }
              try {
                const autoRes = await fetch(`/api/races/${raceId}/predictions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ selections: selArray, submittedAt: closeTime || new Date().toISOString() }),
                });
                const autoData = await autoRes.json();
                if (autoData.success) {
                  clearSelectionsFromStorage(user.id, raceId);
                  const refreshRes = await fetch(`/api/races/${raceId}`);
                  const refreshData = await refreshRes.json();
                  if (refreshData.success) {
                    setPrediction(refreshData.prediction);
                    setBreakdown(refreshData.breakdown || []);
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }, [raceId, user]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((meData) => {
      if (!meData.success) { router.push("/login"); return; }
      setUser(meData.user);
      fetchRace().finally(() => setLoading(false));
    }).catch(() => router.push("/login"));
  }, [raceId, router, fetchRace]);

  useWebSocket((event, data) => {
    if ((event === "race:status_changed" && data.raceId === raceId) ||
        (event === "race:results_entered" && data.raceId === raceId) ||
        (event === "race:prediction_new" && data.raceId === raceId)) {
      fetchRace();
    }
  });

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") fetchRace();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchRace]);

  useEffect(() => {
    if (!race || race.status !== "OPEN" || !race.openedAt || prediction) {
      setCountdown(null);
      return;
    }

    const openedAt = new Date(race.openedAt).getTime();
    const remaining = Math.max(0, 30 - Math.floor((Date.now() - openedAt) / 1000));

    setCountdown(remaining);

    if (remaining <= 0) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - openedAt) / 1000);
      const newRemaining = Math.max(0, 30 - elapsed);
      setCountdown(newRemaining);
      if (newRemaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [race?.status, race?.openedAt, race?.id, prediction]);

  useEffect(() => {
    if (user && race && race.status === "OPEN" && !prediction) {
      saveSelectionsToStorage(user.id, raceId, selections);
    }
  }, [selections, user, race, raceId, prediction]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  function setHorsePosition(horseId: string, pos: number) {
    setSelections((prev) => ({ ...prev, [horseId]: pos }));
  }

  function removeHorsePosition(horseId: string) {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[horseId];
      return next;
    });
  }

  async function handleSubmit() {
    setError(""); setSuccess("");
    const selArray = Object.entries(selections).filter(([, pos]) => pos > 0).map(([horseId, predictedPosition]) => ({ horseId, predictedPosition }));
    if (selArray.length === 0) { setError("Please predict at least one horse"); return; }
    if (new Set(selArray.map((s) => s.predictedPosition)).size !== selArray.length) { setError("Duplicate positions are not allowed"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/races/${raceId}/predictions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: selArray }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      if (user) clearSelectionsFromStorage(user.id, raceId);
      router.push("/dashboard");
    } catch { setError("Something went wrong"); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingSpinner />;
  if (!user || !race) return null;

  const raceStartTime = race.startedAt || race.openedAt;
  const closeTime = raceStartTime
    ? new Date(new Date(raceStartTime).getTime() + race.durationMinutes * 60 * 1000)
    : null;
  const isClosed = race.status !== "OPEN" || (closeTime ? new Date() > closeTime : false);
  const hasResults = race.results.length > 0;

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar user={user} />
      <div className="w-full px-4 sm:px-6 py-4 sm:py-8 animate-fade-in">
        <button onClick={() => router.push("/dashboard")} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition mb-3 sm:mb-4 uppercase tracking-wider">
          ← Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{race.name}</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {race.durationMinutes} min · {race.autoClose ? "Auto-close" : "Manual close"}
            </p>
            {race.status === "OPEN" && (
              <p className="text-xs sm:text-sm text-emerald-600 font-semibold mt-1">
                {closeTime
                  ? new Date() < closeTime
                    ? `Predictions close in ${Math.max(0, Math.ceil((closeTime.getTime() - Date.now()) / 60000))} min`
                    : "Predictions closing soon"
                  : "Predictions are open"}
              </p>
            )}
            {race.startedAt && (
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                Started {new Date(race.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {!race.startedAt && race.openedAt && (
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                Opened {new Date(race.openedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <Badge text={race.status} className={statusStyles[race.status] || ""} />
        </div>

        {race.status === "OPEN" && countdown !== null && countdown > 0 && !prediction && (
          <div className="bg-gradient-to-br from-[#17251c] to-[#2d4a35] rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-center text-white animate-slide-up">
            <p className="text-white/60 text-xs sm:text-sm font-semibold uppercase tracking-wider">Race Now Open</p>
            <p className="text-white/80 text-sm sm:text-base font-semibold mt-1">Predict within 30 seconds</p>
            <div className="countdown-circle" style={{ margin: "12px auto 0" }}>
              <svg viewBox="0 0 120 120" className="countdown-svg">
                <circle cx="60" cy="60" r="54" className="countdown-track" />
                <circle
                  cx="60" cy="60" r="54"
                  className="countdown-progress"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - countdown / 30)}`}
                />
              </svg>
              <div className="countdown-number">{countdown}</div>
            </div>
            <p className="countdown-seconds text-white/50 text-xs mt-1">Seconds</p>
          </div>
        )}

        {prediction && race.status === "COMPLETED" && (
          <div className="bg-gradient-to-br from-[#17251c] to-[#2d4a35] rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-white animate-slide-up">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Your Result</p>
            <p className="text-3xl sm:text-4xl font-bold mt-2">{prediction.totalPoints} <span className="text-base sm:text-lg font-normal text-white/60">points</span></p>
            {prediction.submittedAt && race.startedAt && (
              <p className="text-sm sm:text-base font-semibold text-white/70 mt-2">
                Time taken: {formatTimeTaken(race.startedAt, prediction.submittedAt)}
              </p>
            )}
          </div>
        )}

        {hasResults && prediction && race.status === "COMPLETED" && (
          <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Race Results</h3>
            <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 mb-2">
              <span className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Actual Result</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Prediction</p>
              </div>
              <span className="w-12 sm:w-16 flex-shrink-0" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((position) => {
                const actualResult = race.results.find((r) => r.actualPosition === position);
                const predictedHorseId = prediction.selections.find((s) => s.predictedPosition === position)?.horseId;
                const predictedHorse = predictedHorseId ? race.raceHorses.find((rh) => rh.horse.id === predictedHorseId)?.horse : null;
                const isCorrect = actualResult && predictedHorseId && actualResult.horseId === predictedHorseId;
                const bk = breakdown.find((b) => b.predicted === position);
                return (
                  <div key={position} className={`p-2.5 sm:p-3 rounded-xl border transition ${isCorrect ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {medals[position - 1] || `#${position}`}
                      </span>
                      <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                        <div className="min-w-0">
                          {actualResult ? (
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 truncate">
                              <span className="inline-block w-6 text-right mr-1">{actualResult.horseNumber}</span>
                              <span>({actualResult.horseName})</span>
                            </p>
                          ) : (
                            <p className="text-xs sm:text-sm text-gray-400">-</p>
                          )}
                        </div>
                        <div className="min-w-0">
                          {predictedHorse ? (
                            <p className={`text-xs sm:text-sm font-semibold truncate ${isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                              <span className="inline-block w-6 text-right mr-1">{predictedHorse.number}</span>
                              <span>({predictedHorse.name})</span>
                            </p>
                          ) : (
                            <p className="text-xs sm:text-sm text-gray-400">Not predicted</p>
                          )}
                        </div>
                      </div>
                      {bk && (
                        <span className={`text-xs sm:text-sm font-bold flex-shrink-0 ${bk.pointsEarned > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {bk.pointsEarned > 0 ? `+${bk.pointsEarned} pts` : "0 pts"}
                        </span>
                      )}
                    </div>
                    {bk && bk.matchedRules.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 ml-9 sm:ml-11">
                        {bk.matchedRules.map((rule, j) => (
                          <span key={j} className="text-[9px] sm:text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 sm:px-2 py-0.5 rounded-md">
                            {rule}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasResults && !prediction && race.status === "COMPLETED" && (
          <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Race Results</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((position) => {
                const result = race.results.find((r) => r.actualPosition === position);
                return (
                  <div key={position} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-gray-50 transition">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs sm:text-sm font-bold text-gray-500 flex-shrink-0">
                      {medals[position - 1] || `#${position}`}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 truncate">
                      {result ? (
                        <>
                          <span className="inline-block w-8 text-right mr-1">{result.horseNumber}</span>
                          <span>({result.horseName})</span>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] -mx-4 sm:-mx-6 bg-white rounded-none sm:rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6">
          <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">
            {prediction && !hasResults ? "Prediction Submitted" : isClosed && !hasResults ? "Predictions Will Start Soon" : "Your Prediction"}
          </h3>
          {prediction && !hasResults && race.status === "OPEN" && (
            <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold mb-3 sm:mb-4">Prediction already submitted.</p>
          )}

          <div className="mt-3 sm:mt-4">
            {prediction && hasResults && (
              <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 mb-2">
                <span className="flex-1" />
                <div className="flex gap-2 flex-shrink-0">
                  <span className="w-10 sm:w-14 text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase">1st</span>
                  <span className="w-10 sm:w-14 text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase">2nd</span>
                  <span className="w-10 sm:w-14 text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase">3rd</span>
                </div>
              </div>
            )}
            {!prediction && <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider text-right mb-2">Predict the rank</p>}
            <div className="border-t border-gray-200">
            {race.raceHorses.map((rh, idx) => {
              const usedPositions = new Set(Object.values(selections).filter((v) => v !== selections[rh.horse.id]));
              const placeholderImg = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Horse_racing_drawing.jpg/960px-Horse_racing_drawing.jpg";

              let horseBgClass = "";
              if (prediction && hasResults) {
                const predictedPos = prediction.selections.find((s) => s.horseId === rh.horse.id)?.predictedPosition;
                if (predictedPos) {
                  const actualResult = race.results.find((r) => r.actualPosition === predictedPos);
                  if (actualResult && actualResult.horseId === rh.horse.id) {
                    horseBgClass = "bg-emerald-50/50 border-emerald-200";
                  } else {
                    horseBgClass = "bg-red-50/50 border-red-200";
                  }
                }
              }

              return (
                <div key={rh.horse.id} className={`py-4 border-b border-gray-200 ${idx === 0 ? 'border-t-0' : ''} ${horseBgClass ? "px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl " + horseBgClass : ""}`}>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    <span className="inline-block w-10 text-right mr-1">{rh.horse.number}</span>
                    <span>({rh.horse.name})</span>
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100">
                      <img
                        src={rh.horse.imageUrl || placeholderImg}
                        alt={rh.horse.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {rh.horse.description ? (
                        rh.horse.description.split("|").map((line, i) => (
                          <p key={i} className="text-xs sm:text-sm text-gray-500">{line.trim()}</p>
                        ))
                      ) : (
                        <p className="text-xs sm:text-sm text-gray-500">Age: {rh.horse.age || "-"} · Breed: {rh.horse.breed || "-"} · Won/Run: {rh.horse.wins}/{rh.horse.totalRuns}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {[1, 2, 3].map((pos) => {
                        const isSelected = selections[rh.horse.id] === pos;
                        const isUsed = usedPositions.has(pos);

                        let btnClass = "";
                        if (prediction && hasResults) {
                          const actualResult = race.results.find((r) => r.actualPosition === pos);
                          if (isSelected && actualResult && actualResult.horseId === rh.horse.id) {
                            btnClass = "bg-emerald-500 text-white border-emerald-600";
                          } else if (isSelected) {
                            btnClass = "bg-red-500 text-white border-red-600";
                          } else {
                            btnClass = "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
                          }
                        } else {
                          btnClass = isSelected
                            ? "bg-[#17251c] text-white"
                            : isUsed
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : "bg-white border border-gray-200 text-gray-600 hover:border-[#17251c] hover:text-[#17251c] cursor-pointer";
                        }

                        return (
                          <button
                            key={pos}
                            disabled={isClosed || !!prediction || (isUsed && !isSelected)}
                            onClick={() => isSelected ? removeHorsePosition(rh.horse.id) : setHorsePosition(rh.horse.id, pos)}
                            onDoubleClick={() => isSelected && removeHorsePosition(rh.horse.id)}
                            className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl text-base sm:text-2xl font-bold transition border ${btnClass} ${isClosed ? "pointer-events-none" : ""} ${prediction && hasResults && !isSelected ? "opacity-60" : ""}`}
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
          {success && <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-emerald-600 font-medium mt-3 sm:mt-4">{success}</div>}

          <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
            {!isClosed && !prediction && (
              <Button onClick={handleSubmit} loading={saving}>
                {prediction ? "Update Prediction" : "Submit Prediction"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
