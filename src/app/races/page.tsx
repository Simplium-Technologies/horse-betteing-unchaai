"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import RaceCard from "@/components/RaceCard";
import EmptyState from "@/components/EmptyState";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWebSocket } from "@/lib/ws-client";

interface User { id: string; name: string | null; phoneNumber: string; role: string; }
interface Race {
  id: string; name: string; durationMinutes: number; startedAt: string | null;
  status: string;
  horseCount: number; predictionCount: number; hasPredicted: boolean;
  seasonId: string | null; seasonName: string | null;
}

export default function RacesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  const refetchData = useCallback(() => {
    fetch("/api/races").then((r) => r.json()).then((data) => {
      if (data.success) setRaces(data.races);
    });
  }, []);

  useWebSocket((event) => {
    if (event === "race:status_changed") refetchData();
  });

  useEffect(() => {
    async function initRaces() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json();

        if (meRes.status === 401 || (meData && !meData.success)) {
          router.push("/login");
          return;
        }

        if (meData?.user) setUser(meData.user);

        fetch("/api/races")
          .then((r) => r.json())
          .then((data) => {
            if (data?.success) setRaces(data.races);
          })
          .catch(() => {});
      } catch (err) {
        console.error("Races page auth error:", err);
      } finally {
        setLoading(false);
      }
    }

    initRaces();
  }, [router]);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar user={user} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 animate-fade-in">
        <button onClick={() => router.push("/dashboard")} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition mb-3 sm:mb-4 uppercase tracking-wider">
          ← Back to Dashboard
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">Races</h2>
        {races.length === 0 ? (
          <EmptyState icon="🏁" title="No races available" description="Check back later for upcoming races." />
        ) : (
          <div className="space-y-6">
            {(() => {
              const grouped = new Map<string, Race[]>();
              const noSeason: Race[] = [];

              races.forEach((race) => {
                if (race.seasonId && race.seasonName) {
                  const existing = grouped.get(race.seasonId) || [];
                  existing.push(race);
                  grouped.set(race.seasonId, existing);
                } else {
                  noSeason.push(race);
                }
              });

              return (
                <>
                  {Array.from(grouped.entries()).map(([seasonId, seasonRaces]) => (
                    <div key={seasonId}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">
                          {seasonRaces[0].seasonName}
                        </span>
                        <div className="flex-1 h-px bg-[#c9a84c]/20" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {seasonRaces.map((race) => (
                          <RaceCard
                            key={race.id} id={race.id} name={race.name}
                            durationMinutes={race.durationMinutes} startedAt={race.startedAt}
                            status={race.status} horseCount={race.horseCount} predictionCount={race.predictionCount}
                            actionLabel={race.status === "COMPLETED" ? "View Results" : race.hasPredicted ? "View" : race.status === "OPEN" ? "Predict Now" : undefined}
                            onAction={() => router.push(`/races/${race.id}`)}
                            onClick={() => router.push(`/races/${race.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {noSeason.length > 0 && (
                    <div>
                      {grouped.size > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Other Races</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {noSeason.map((race) => (
                          <RaceCard
                            key={race.id} id={race.id} name={race.name}
                            durationMinutes={race.durationMinutes} startedAt={race.startedAt}
                            status={race.status} horseCount={race.horseCount} predictionCount={race.predictionCount}
                            actionLabel={race.status === "COMPLETED" ? "View Results" : race.hasPredicted ? "View" : race.status === "OPEN" ? "Predict Now" : undefined}
                            onAction={() => router.push(`/races/${race.id}`)}
                            onClick={() => router.push(`/races/${race.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
