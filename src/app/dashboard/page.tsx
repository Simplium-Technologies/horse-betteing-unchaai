"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import RaceCard from "@/components/RaceCard";
import EmptyState from "@/components/EmptyState";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWebSocket } from "@/lib/ws-client";

function formatTimeTaken(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

interface User {
  id: string;
  name: string | null;
  phoneNumber: string;
  role: string;
}

interface Stats {
  totalPoints: number;
  racesPlayed: number;
  rank: number;
  breakdown: { raceId: string; raceName: string; seasonName: string | null; status: string; points: number; submittedAt: string; raceStartedAt: string | null }[];
}

interface Race {
  id: string;
  name: string;
  durationMinutes: number;
  startedAt: string | null;
  openedAt: string | null;
  status: string;
  horseCount: number;
  hasPredicted: boolean;
  seasonId: string | null;
  seasonName: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [showRacesBreakdown, setShowRacesBreakdown] = useState(false);
  const [activeRace, setActiveRace] = useState<Race | null>(null);
  const [countdown, setCountdown] = useState(30);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetchData = useCallback(() => {
    fetch("/api/races").then((r) => r.json()).then((data) => {
      if (data.success) setRaces(data.races.slice(0, 6));
    });
    fetch("/api/auth/stats").then((r) => r.json()).then((data) => {
      if (data.success) setStats(data.stats);
    });
  }, []);

  useWebSocket((event) => {
    if (event === "race:status_changed" || event === "race:results_entered") {
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
    async function initDashboard() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json();

        if (meRes.status === 401 || (meData && !meData.success)) {
          router.push("/login");
          return;
        }

        if (meData?.user) {
          if (meData.user.role === "ADMIN") {
            router.push("/admin");
            return;
          }
          setUser(meData.user);
        }

        // Fetch stats and races without redirecting to login on secondary fetch errors
        Promise.all([
          fetch("/api/auth/stats").then((r) => r.json()).catch(() => null),
          fetch("/api/races").then((r) => r.json()).catch(() => null),
        ]).then(([statsData, racesData]) => {
          if (statsData?.success) setStats(statsData.stats);
          if (racesData?.success) setRaces(racesData.races.slice(0, 6));
        });
      } catch (err) {
        console.error("Dashboard auth check error:", err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [router]);

  useEffect(() => {
    const openedRace = races.find((r) => r.status === "OPEN" && r.openedAt && !r.hasPredicted);
    if (!openedRace || !openedRace.openedAt) {
      setActiveRace(null);
      return;
    }

    setActiveRace(openedRace);

    const openedAt = new Date(openedRace.openedAt).getTime();
    const remaining = Math.max(0, 30 - Math.floor((Date.now() - openedAt) / 1000));

    if (remaining <= 0) {
      router.push(`/races/${openedRace.id}`);
      return;
    }

    setCountdown(remaining);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - openedAt) / 1000);
      const newRemaining = Math.max(0, 30 - elapsed);
      setCountdown(newRemaining);
      if (newRemaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        router.push(`/races/${openedRace.id}`);
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [races, router]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  const availableRaces = races.filter((race) => race.status === "OPEN" || race.status === "UPCOMING");
  const currentSeason = availableRaces[0]?.seasonName || stats?.breakdown[0]?.seasonName || "Season Name";

  return (
    <div className="participant-shell min-h-screen">
      <Navbar user={user} />
      <main className="relative mx-auto max-w-6xl px-3 pb-10 pt-4 sm:px-6 sm:pt-7 animate-fade-in">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{user.name || `+91 ${user.phoneNumber}`}</h2>
        </div>
        <section className="season-card">
          <h3 className="season-card-title">{currentSeason}</h3>
          <div className="season-card-body">
            <div className="season-card-label">Races</div>
            <div className="season-card-grid">
              {races.slice(0, 4).map((race, index) => (
                <button key={race.id} onClick={() => router.push(`/races/${race.id}`)} className="season-tile">
                  {index + 1}
                </button>
              ))}
              {races.length === 0 && <p className="col-span-4 py-8 text-center text-sm text-gray-400">No races have been added yet.</p>}
            </div>
          </div>
          {races.length > 0 && (
            <>
              <div className="season-card-row">
                <span className="season-card-label">Status</span>
                <div className="season-card-grid">
                  {races.slice(0, 4).map((race) => (
                    <span key={race.id} className={`season-status ${race.status.toLowerCase()}`} title={race.status === "OPEN" ? "Active" : race.status.charAt(0) + race.status.slice(1).toLowerCase()}>
                      {race.status === "COMPLETED" && <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-500 rounded-full"><svg className="w-4 h-4 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6l3 3 4-4.5"/></svg></span>}
                      {race.status === "OPEN" && <span className="inline-block w-4 h-4 bg-emerald-500 rounded-full"></span>}
                      {race.status === "CLOSED" && <span className="inline-block w-4 h-4 bg-amber-500 rounded-full"></span>}
                      {race.status === "UPCOMING" && <span className="inline-block w-4 h-4 bg-red-500 rounded-full"></span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="season-card-row">
                <span className="season-card-label">Points</span>
                <div className="season-card-grid">
                  {races.slice(0, 4).map((race) => (
                    <span key={race.id} className="season-points">{race.hasPredicted ? stats?.breakdown.find(b => b.raceId === race.id)?.points ?? "-" : "-"}</span>
                  ))}
                </div>
              </div>
              <div className="season-card-row">
                <span className="season-card-label">Time</span>
                <div className="season-card-grid">
                  {races.slice(0, 4).map((race) => {
                    const b = stats?.breakdown.find((br) => br.raceId === race.id);
                    const time = b?.submittedAt && b.raceStartedAt
                      ? (() => {
                          const ms = new Date(b.submittedAt).getTime() - new Date(b.raceStartedAt).getTime();
                          if (ms < 0) return "-";
                          const totalSec = Math.floor(ms / 1000);
                          const min = Math.floor(totalSec / 60);
                          const sec = totalSec % 60;
                          if (min === 0) return `${sec}s`;
                          return `${min}m ${sec}s`;
                        })()
                      : "-";
                    return (
                      <span key={race.id} className="season-points">{time}</span>
                    );
                  })}
                </div>
              </div>
            </>
          )}
           <div className="flex items-stretch gap-3 mt-3">
            <div className="w-2/3 bg-[#1f3527] rounded-xl px-4 py-3 flex items-center justify-center gap-2 relative overflow-hidden">
              <p className="text-white/80 text-[10px] sm:text-xs font-semibold">Total Score</p>
              <p className="text-white font-black text-xl sm:text-2xl">{stats?.totalPoints ?? 0}</p>
            </div>
            <button onClick={() => router.push("/leaderboard")} className="w-1/3 bg-[#1f3527] rounded-xl px-4 py-3 flex flex-col items-center justify-center gap-1 hover:bg-[#2a4a35] transition relative overflow-hidden" title="View Leaderboard">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🏆</span>
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-semibold">Leaderboard</p>
            </button>
          </div>
        </section>

        {!activeRace && races.filter(r => r.status === "UPCOMING").length > 0 && (
            <section className="mt-6">
              <div className="bg-[#1f3527] rounded-2xl p-4 sm:p-5 text-center relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-white/60 text-xs sm:text-sm font-semibold uppercase tracking-wider">Next Race</p>
                  <p className="text-white text-base sm:text-lg font-bold mt-1">
                    Race shall open soon
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-white/50 text-xs">Waiting for admin to open</span>
                  </div>
                </div>
              </div>
            </section>
        )}

        {!activeRace && races.length > 0 && races.every(r => r.status === "COMPLETED") && (
            <section className="mt-6">
              <div className="bg-[#1f3527] rounded-2xl p-4 sm:p-5 text-center relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-white text-base sm:text-lg font-bold">All races are completed</p>
                  <p className="text-white/60 text-xs sm:text-sm font-semibold mt-1">Thanks for participating!</p>
                </div>
              </div>
            </section>
        )}

        {activeRace && (
          <section className="mt-6">
            <div className="countdown-prompt" style={{ cursor: "default" }}>
              <p className="countdown-prompt-label">Race Now Open</p>
              <p className="countdown-prompt-race">{activeRace.name}</p>
              <p className="countdown-prompt-sub">Predict within 30 seconds</p>
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
              <p className="countdown-seconds">Seconds</p>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
