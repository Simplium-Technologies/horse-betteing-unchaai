"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

interface Race {
  id: string;
  name: string;
  status: string;
  openedAt: string | null;
  startedAt: string | null;
  durationMinutes: number;
  hasPredicted: boolean;
}

interface NavbarProps {
  user?: { name: string | null; phoneNumber: string; role: string } | null;
  admin?: boolean;
}

export default function Navbar({ user, admin }: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [predictionTimeLeft, setPredictionTimeLeft] = useState<number | null>(null);
  const [activeRaceName, setActiveRaceName] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const predictionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const raceRef = useRef<Race | null>(null);

  const checkRaces = useCallback(() => {
    fetch("/api/races").then((r) => r.json()).then((data) => {
      if (!data.success) return;
      const races: Race[] = data.races;
      const openRace = races.find((r) => r.status === "OPEN" && r.openedAt && !r.hasPredicted);
      if (!openRace || !openRace.openedAt) {
        raceRef.current = null;
        return;
      }
      raceRef.current = openRace;
      setActiveRaceName(openRace.name);

      const openedAt = new Date(openRace.openedAt).getTime();
      const remaining = Math.max(0, 30 - Math.floor((Date.now() - openedAt) / 1000));

      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        setCountdown(0);
        const startTime = new Date(openRace.startedAt || openRace.openedAt).getTime();
        const closeTime = startTime + openRace.durationMinutes * 60 * 1000;
        const predLeft = Math.max(0, Math.floor((closeTime - Date.now()) / 1000));
        setPredictionTimeLeft(predLeft > 0 ? predLeft : null);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (admin) return;
    checkRaces();
    const pollRef = setInterval(checkRaces, 30000);
    return () => clearInterval(pollRef);
  }, [admin, checkRaces]);

  useEffect(() => {
    if (admin || countdown === null || countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (raceRef.current) {
            const r = raceRef.current;
            const startTime = new Date(r.startedAt || r.openedAt!).getTime();
            const closeTime = startTime + r.durationMinutes * 60 * 1000;
            const predLeft = Math.max(0, Math.floor((closeTime - Date.now()) / 1000));
            setPredictionTimeLeft(predLeft > 0 ? predLeft : null);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown, admin]);

  useEffect(() => {
    if (admin || predictionTimeLeft === null || predictionTimeLeft <= 0) return;
    predictionTimerRef.current = setInterval(() => {
      setPredictionTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (predictionTimerRef.current) clearInterval(predictionTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (predictionTimerRef.current) clearInterval(predictionTimerRef.current);
    };
  }, [predictionTimeLeft, admin]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const showCountdown = !admin && countdown !== null && countdown > 0;
  const showPredictionTimer = !admin && countdown === 0 && predictionTimeLeft !== null && predictionTimeLeft > 0;

  return (
    <nav className={`${admin ? "gradient-primary" : "participant-nav"} text-white sticky top-0 z-50`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() =>
              router.push(user?.role === "ADMIN" ? "/admin" : "/dashboard")
            }
          >
            <img
              src="/logo2.png"
              alt="Unchaai Logo"
              className="h-10 w-auto group-hover:opacity-90 transition"
              style={{ mixBlendMode: "screen" }}
            />
        </div>

        {showCountdown && (
          <div className="flex items-center gap-2 bg-red-600/90 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="text-xs sm:text-sm font-bold text-white">Race will start in {countdown}s</span>
          </div>
        )}

        {showPredictionTimer && (
          <div className="flex items-center gap-2 bg-emerald-600/90 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="text-xs sm:text-sm font-bold text-white">
              Prediction closes in {predictionTimeLeft}s
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {user && (
            <>
              {!admin && user.role === "ADMIN" && (
                <button
                  onClick={() => router.push("/admin")}
                  className="text-xs font-medium bg-accent/20 text-accent-light px-3 py-2 rounded-lg hover:bg-accent/30 transition hidden sm:inline-flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Admin Panel</span>
                </button>
              )}
            </>
          )}
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <button
            onClick={handleLogout}
            className="hidden sm:inline-flex text-xs sm:text-sm text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 px-4 py-3 animate-slide-up">
          {user && !admin && user.role === "ADMIN" && (
            <button
              onClick={() => {
                router.push("/admin");
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium bg-accent/20 text-accent-light hover:bg-accent/30 transition flex items-center gap-2"
            >
              <span>⚡</span>
              <span>Admin Panel</span>
            </button>
          )}
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
