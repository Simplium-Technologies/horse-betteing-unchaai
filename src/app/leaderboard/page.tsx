"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWebSocket } from "@/lib/ws-client";

interface User {
  id: string;
  name: string | null;
  phoneNumber: string;
  role: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  racesPlayed: number;
  totalSeconds: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function formatTotalTime(seconds: number): string {
    if (seconds === 0) return "-";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  const refetchData = useCallback(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((data) => {
      if (data.success) setLeaderboard(data.leaderboard);
    });
  }, []);

  useWebSocket((event) => {
    if (event === "race:results_entered" || event === "race:status_changed") {
      refetchData();
    }
  });

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") refetchData();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refetchData]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
    ]).then(([meData, lbData]) => {
      if (!meData.success) { router.push("/login"); return; }
      setUser(meData.user);
      if (lbData.success) setLeaderboard(lbData.leaderboard);
      setLoading(false);
    }).catch(() => router.push("/login"));
  }, [router]);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar user={user} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-8 animate-fade-in">
        <button onClick={() => router.push("/dashboard")} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition mb-4 sm:mb-6 uppercase tracking-wider">
          ← Back to Dashboard
        </button>
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl gradient-accent flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-3 sm:mb-4 shadow-lg">
            🏆
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Leaderboard</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">See who&apos;s leading the pack</p>
        </div>

        {leaderboard.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="No rankings yet"
            description="Points will appear here once races are completed."
          />
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {leaderboard.map((entry) => {
              const isMe = entry.userId === user.id;
              const medal = entry.rank <= 3 ? medals[entry.rank - 1] : null;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                    isMe
                      ? "bg-[#17251c]/5 border-[#17251c]/20 card-shadow"
                      : "bg-white border-gray-100 card-shadow"
                  }`}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-50 flex items-center justify-center font-bold text-sm sm:text-lg text-gray-500 flex-shrink-0">
                    {medal || `#${entry.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-xs sm:text-sm ${isMe ? "text-[#17251c]" : "text-gray-900"} truncate`}>
                      {entry.name}
                      {isMe && <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs text-[#17251c]/60">(You)</span>}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-800">
                      {entry.racesPlayed} races · {formatTotalTime(entry.totalSeconds)} total
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base sm:text-lg font-bold text-[#17251c]">{entry.totalPoints}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
