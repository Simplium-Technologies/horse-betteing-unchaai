"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatsCard from "@/components/StatsCard";

interface User { id: string; name: string | null; phoneNumber: string; role: string; }
interface Season { id: string; name: string; status: string; startDate: string; endDate: string; _count: { races: number }; }
interface LeaderboardEntry { rank: number; userId: string; name: string; totalPoints: number; racesPlayed: number; totalSeconds: number; }

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Leaderboard</h3>
            <button onClick={() => router.push("/leaderboard")} className="text-xs font-semibold text-[#17251c] hover:underline uppercase tracking-wider">
              View Full →
            </button>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-400">No rankings yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((entry) => {
                const medal = entry.rank <= 3 ? medals[entry.rank - 1] : null;
                return (
                  <div key={entry.userId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-sm text-gray-500 flex-shrink-0">
                      {medal || `#${entry.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{entry.name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        {entry.racesPlayed} races · {formatTotalTime(entry.totalSeconds)} total
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#17251c]">{entry.totalPoints}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider">pts</p>
                    </div>
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
