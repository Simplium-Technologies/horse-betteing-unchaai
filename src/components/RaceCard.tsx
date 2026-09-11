import Badge from "./Badge";

interface RaceCardProps {
  id: string;
  name: string;
  durationMinutes?: number;
  startedAt?: string | null;
  status: string;
  horseCount: number;
  predictionCount?: number;
  actionLabel?: string;
  onAction?: () => void;
  onClick?: () => void;
}

const statusStyles: Record<string, string> = {
  UPCOMING: "bg-blue-50 text-blue-600 border-blue-100",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-100",
  CLOSED: "bg-amber-50 text-amber-600 border-amber-100",
  COMPLETED: "bg-gray-50 text-gray-500 border-gray-100",
};

export default function RaceCard({
  name,
  durationMinutes,
  startedAt,
  status,
  horseCount,
  predictionCount,
  actionLabel,
  onAction,
  onClick,
}: RaceCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 card-shadow p-4 sm:p-5 hover:card-shadow-hover hover:border-gray-200 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-[#17251c] transition text-sm sm:text-base">
          {name}
        </h3>
        <Badge text={status} className={statusStyles[status] || ""} />
      </div>

      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate">
            {durationMinutes ? `${durationMinutes} min` : "No duration set"}
            {startedAt && (
              <> · Started {new Date(startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span>{horseCount} horses</span>
          </div>
          {predictionCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              <span>{predictionCount} predictions</span>
            </div>
          )}
        </div>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="w-full min-h-[40px] sm:min-h-[44px] rounded-xl bg-[#17251c] text-white text-sm font-medium hover:bg-[#24372b] transition-all active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
