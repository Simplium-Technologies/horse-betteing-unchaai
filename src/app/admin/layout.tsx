"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

interface User {
  id: string;
  name: string | null;
  phoneNumber: string;
  role: string;
}

const tabs = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/horses", label: "Horses", icon: "🏇" },
  { href: "/admin/seasons", label: "Seasons", icon: "📅" },
  { href: "/admin/point-rules", label: "Point Rules", icon: "📋" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success && data.user.role === "ADMIN") {
          setUser(data.user);
        } else if (data.success) {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      })
      .catch((err) => {
        console.error("Admin layout auth check error:", err);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-[#17251c] rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar user={user} admin />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 animate-fade-in">
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <a
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#17251c] text-white shadow-sm"
                    : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <span className="text-sm sm:text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </a>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}
