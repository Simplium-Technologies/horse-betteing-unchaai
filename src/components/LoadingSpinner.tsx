export default function LoadingSpinner() {
  return (
    <main className="min-h-screen bg-[#f0f0f0] flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-2.5 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 sm:border-3 border-gray-200 border-t-[#17251c] rounded-full animate-spin" />
        <p className="text-xs sm:text-sm text-gray-400 animate-pulse-soft">Loading...</p>
      </div>
    </main>
  );
}
