"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to send OTP.");
        return;
      }

      if (data.developmentOtp) {
        setDevOtp(data.developmentOtp);
      }

      router.push(`/verify-otp?phone=${encodeURIComponent(phoneNumber)}${data.developmentOtp ? `&otp=${encodeURIComponent(data.developmentOtp)}` : ""}`);
    } catch (error) {
      console.error(error);
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
          <img src="/logo2.png" alt="Unchaai Logo" className="h-16 sm:h-20 mx-auto mb-4 sm:mb-5 rounded-xl" style={{ mixBlendMode: "lighten" }} />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17251c] tracking-tight">
            Horse Racing
          </h1>
          <p className="text-gray-400 mt-1.5 sm:mt-2 text-xs sm:text-sm">
            Predict. Score. Lead.
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl card-shadow p-5 sm:p-8 border border-gray-50">
          <div className="mb-5 sm:mb-7">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Enter your mobile number to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="flex">
                <div className="flex items-center px-3 sm:px-4 bg-gray-50 border border-gray-200 border-r-0 rounded-l-xl text-gray-500 text-sm font-medium">
                  +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 min-h-[44px] px-3 sm:px-4 border border-gray-200 rounded-r-xl outline-none focus:border-[#17251c] text-gray-900 text-sm placeholder:text-gray-400 transition"
                />
              </div>
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
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending OTP...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {devOtp && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">Your OTP</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-700 tracking-[0.3em] mt-1">{devOtp}</p>
            </div>
          )}

          <p className="text-[10px] sm:text-[11px] text-center text-gray-300 mt-5 sm:mt-6">
            By continuing, you agree to our terms and privacy policy
          </p>
        </div>
      </div>
      </div>
      <p className="text-lg text-gray-500 text-center py-4 mt-auto">
        Made by <a href="https://simpliumtechnologies.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-600 hover:text-[#17251c] underline underline-offset-2 transition">Simplium Technologies</a>
      </p>
    </main>
  );
}
