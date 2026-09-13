"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatsCard from "@/components/StatsCard";

interface User { id: string; name: string | null; phoneNumber: string; role: string; }
interface Season { id: string; name: string; status: string; startDate: string; endDate: string; _count: { races: number }; }

interface HorseSelection {
  position: number;
  horseId: string;
  horseName: string;
  horseNumber: number;
}

interface RaceBreakdown {
  raceId: string;
  raceName: string;
  raceStatus: string;
  seasonName: string | null;
  points: number;
  submittedAt: string;
  timeTakenSeconds: number;
  selections: HorseSelection[];
  results: HorseSelection[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  phoneNumber?: string;
  totalPoints: number;
  racesPlayed: number;
  totalSeconds: number;
  breakdown?: RaceBreakdown[];
}

const statusStyles: Record<string, string> = {
  UPCOMING: "bg-blue-50 text-blue-600 border-blue-100",
  ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-100",
  COMPLETED: "bg-gray-50 text-gray-500 border-gray-100",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ horses: 0, seasons: 0, participants: 0, completedRaces: 0 });
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [showSeasons, setShowSeasons] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  function formatTotalTime(seconds: number): string {
    if (seconds === 0) return "-";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data.success) { router.push("/login"); return; }
      setUser(data.user);
    }).catch(() => router.push("/login"));

    Promise.all([
      fetch("/api/admin/horses").then((r) => r.json()),
      fetch("/api/admin/races").then((r) => r.json()),
      fetch("/api/admin/seasons").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
    ]).then(([horsesData, racesData, seasonsData, statsData, lbData]) => {
      const horses = horsesData.horses?.length || 0;
      const completedRaces = racesData.races?.filter((r: { status: string }) => r.status === "COMPLETED").length || 0;
      const seasonList = seasonsData.seasons || [];
      const participants = statsData.participants || 0;
      setStats({ horses, seasons: seasonList.length, participants, completedRaces });
      setSeasons(seasonList);
      if (lbData.success) setLeaderboard(lbData.leaderboard);
    }).catch(() => {});
  }, [router]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <section className="mb-4 sm:mb-6">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Welcome back</p>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#17251c] mt-1 tracking-tight">
          {user?.name || (user ? `+91 ${user.phoneNumber}` : "Admin")}
        </h2>
      </section>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        <StatsCard label="Total Horses" value={stats.horses} icon="🏇" onClick={() => router.push("/admin/horses")} />
        <StatsCard label="Total Seasons" value={stats.seasons} icon="📅" onClick={() => setShowSeasons(!showSeasons)} />
        <StatsCard label="Completed" value={stats.completedRaces} icon="✅" onClick={() => router.push("/admin/races")} />
        <StatsCard label="Participants" value={stats.participants} icon="👥" />
        <StatsCard label="Leaderboard" value={leaderboard.length} icon="🏆" onClick={() => setShowLeaderboard(!showLeaderboard)} />
      </div>

      {showSeasons && (
        <div className="mt-4 sm:mt-6 bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Seasons Breakdown</h3>
            <button onClick={() => router.push("/admin/seasons")} className="text-xs font-semibold text-[#17251c] hover:underline uppercase tracking-wider">
              Manage Seasons →
            </button>
          </div>
          {seasons.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-400">No seasons yet.</p>
          ) : (
            <div className="space-y-2">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  onClick={() => router.push(`/admin/seasons/${season.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{season.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                      {season._count.races} race{season._count.races !== 1 ? "s" : ""} · {new Date(season.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – {new Date(season.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold border ${statusStyles[season.status] || ""}`}>
                    {season.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showLeaderboard && (
        <div className="mt-4 sm:mt-6 bg-white rounded-2xl card-shadow border border-gray-100 p-4 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Leaderboard & Detailed Predictions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Click any participant to view predicted vs actual winning horses</p>
            </div>
            <button onClick={() => router.push("/leaderboard")} className="text-xs font-semibold text-[#17251c] hover:underline uppercase tracking-wider">
              View Public →
            </button>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-400">No rankings yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const medal = entry.rank <= 3 ? medals[entry.rank - 1] : null;
                const isExpanded = expandedUserId === entry.userId;

                return (
                  <div key={entry.userId} className="border border-gray-100 rounded-xl overflow-hidden transition bg-white">
                    <div
                      onClick={() => setExpandedUserId(isExpanded ? null : entry.userId)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition cursor-pointer select-none"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-sm text-gray-500 flex-shrink-0">
                        {medal || `#${entry.rank}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{entry.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          {entry.racesPlayed} races · {formatTotalTime(entry.totalSeconds)} total
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#17251c]">{entry.totalPoints}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider">pts</p>
                        </div>
                        <span className="text-gray-400 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-gray-50/80 border-t border-gray-100 p-3 sm:p-4 text-xs space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                          <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                            Predictions & Points Breakdown for {entry.name}
                          </p>
                          <span className="text-[10px] font-medium text-gray-500">{entry.racesPlayed} race{entry.racesPlayed !== 1 ? "s" : ""} played</span>
                        </div>

                        {entry.breakdown && entry.breakdown.length > 0 ? (
                          <div className="space-y-3">
                            {entry.breakdown.map((item, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <div>
                                    <p className="font-bold text-gray-900 text-xs sm:text-sm">{item.raceName}</p>
                                    {item.seasonName && (
                                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5">{item.seasonName}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-[#17251c] text-sm sm:text-base">+{item.points} pts</span>
                                    {item.timeTakenSeconds > 0 && (
                                      <p className="text-[10px] text-gray-400">{item.timeTakenSeconds}s response time</p>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {/* User Selections */}
                                  <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">User Chosen</span>
                                      <span className="text-[9px] text-amber-700 font-medium">Prediction</span>
                                    </div>
                                    {item.selections && item.selections.length > 0 ? (
                                      <div className="space-y-1">
                                        {item.selections.map((s) => {
                                          const actual = item.results.find((r) => r.position === s.position);
                                          const isExactMatch = actual && actual.horseId === s.horseId;
                                          const positionLabel = s.position === 1 ? "1st" : s.position === 2 ? "2nd" : "3rd";

                                          return (
                                            <div key={s.horseId} className="flex items-center justify-between text-[11px]">
                                              <span className="font-medium text-amber-950">
                                                <span className="font-bold text-amber-800 mr-1.5">{positionLabel}:</span>
                                                #{s.horseNumber} {s.horseName}
                                              </span>
                                              {isExactMatch && (
                                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[9px] flex items-center gap-0.5">
                                                  ✓ Correct
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-amber-700/60">No selection recorded</p>
                                    )}
                                  </div>

                                  {/* Actual Results */}
                                  <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Actual Winners</span>
                                      <span className="text-[9px] text-emerald-700 font-medium">Results</span>
                                    </div>
                                    {item.results && item.results.length > 0 ? (
                                      <div className="space-y-1">
                                        {item.results.map((r) => {
                                          const positionLabel = r.position === 1 ? "1st" : r.position === 2 ? "2nd" : "3rd";
                                          return (
                                            <div key={r.horseId} className="flex items-center justify-between text-[11px]">
                                              <span className="font-medium text-emerald-950">
                                                <span className="font-bold text-emerald-800 mr-1.5">{positionLabel}:</span>
                                                #{r.horseNumber} {r.horseName}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-emerald-700/60">Results not entered yet</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs py-1">No race predictions recorded yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
