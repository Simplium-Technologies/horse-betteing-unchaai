interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  onClick?: () => void;
}

export default function StatsCard({ label, value, icon, onClick }: StatsCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 card-shadow hover:card-shadow-hover transition-shadow ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#17251c] mt-1 sm:mt-2">{value}</p>
        </div>
        {icon && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#17251c]/5 flex items-center justify-center text-base sm:text-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
