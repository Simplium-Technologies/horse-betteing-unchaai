"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get("phone") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Invalid OTP.");
        return;
      }

      if (data.isNewUser) {
        router.push("/complete-profile");
      } else if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setMessage("");
    try {
      setResending(true);
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to resend OTP.");
        return;
      }

      setMessage("A new OTP has been sent.");
    } catch (error) {
      console.error(error);
      setError("Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (!phoneNumber) {
      router.replace("/login");
      return;
    }

    // WebOTP API: Auto-fill OTP from SMS
    if (typeof window !== "undefined" && "OTPCredential" in window) {
      const ac = new AbortController();

      navigator.credentials
        .get({
          otp: { transport: ["sms"] },
          signal: ac.signal,
        } as any)
        .then((credential: any) => {
          if (credential && credential.code) {
            setOtp(credential.code);
          }
        })
        .catch((err: any) => {
          if (err?.name !== "AbortError") {
            console.error("WebOTP API error:", err);
          }
        });

      return () => {
        ac.abort();
      };
    }
  }, [phoneNumber, router]);

  return (
    <main className="min-h-screen bg-[#f0f0f0] flex flex-col px-4 py-8">
      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8 sm:mb-10">
          <img src="/logo2.png" alt="Unchaai Logo" className="h-16 sm:h-20 mx-auto mb-4 sm:mb-5 rounded-xl" style={{ mixBlendMode: "lighten" }} />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17251c] tracking-tight">
            Verify your number
          </h1>
          <p className="text-gray-400 mt-1.5 sm:mt-2 text-xs sm:text-sm">
            We sent a 6-digit OTP to
          </p>
          <p className="font-semibold text-gray-700 mt-1 text-xs sm:text-sm">
            +91 {phoneNumber}
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl card-shadow p-5 sm:p-8 border border-gray-50">
          <form onSubmit={handleVerify} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full min-h-[52px] sm:h-14 text-center text-xl sm:text-2xl tracking-[0.5em] font-bold border border-gray-200 rounded-xl outline-none focus:border-[#17251c] text-gray-900 placeholder:text-gray-300 transition"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-emerald-600 font-medium">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-xl bg-[#17251c] text-white font-semibold text-sm hover:bg-[#24372b] transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          <div className="flex items-center justify-between mt-5 sm:mt-6 text-xs sm:text-sm">
            <button
              onClick={() => router.push("/login")}
              className="text-gray-400 hover:text-gray-600 transition font-medium"
            >
              ← Change number
            </button>
            <button
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-[#17251c] hover:underline disabled:opacity-40"
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
      </div>
      <p className="text-xs text-gray-500 text-center py-4 mt-auto">
        Made by <a href="https://simpliumtechnologies.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-600 hover:text-[#17251c] underline underline-offset-2 transition">Simplium Technologies</a>
      </p>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#17251c] rounded-full animate-spin" />
      </div>
    }>
      <VerifyOtpForm />
    </Suspense>
  );
}
