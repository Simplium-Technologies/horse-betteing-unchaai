"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, role: "PARTICIPANT" }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save name.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f0f0f0] flex flex-col px-4 py-8">
      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl gradient-primary text-3xl sm:text-4xl mb-4 sm:mb-5 shadow-lg">
            🐎
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17251c] tracking-tight">
            What should we call you?
          </h1>
          <p className="text-gray-400 mt-1.5 sm:mt-2 text-xs sm:text-sm">
            This name will be shown on the leaderboard
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl card-shadow p-5 sm:p-8 border border-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Your Name
              </label>
              <input
                type="text"
                maxLength={50}
                autoFocus
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] px-4 border border-gray-200 rounded-xl outline-none focus:border-[#17251c] text-gray-900 text-sm placeholder:text-gray-400 transition"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-xl bg-[#17251c] text-white font-semibold text-sm hover:bg-[#24372b] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
      </div>
      <p className="text-lg text-gray-500 text-center py-4 mt-auto">
        Made by <a href="https://simpliumtechnologies.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-600 hover:text-[#17251c] underline underline-offset-2 transition">Simplium Technologies</a>
      </p>
    </main>
  );
}
