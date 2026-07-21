import { HiShieldCheck } from "react-icons/hi";

export default function HeroBadge() {
  return (
    // Added a subtle shadow/glow effect around the badge box border
    <div className="inline-flex items-center gap-4 rounded-full border border-[#28486F]/60 bg-[#10213D] px-5 py-2.5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
      <HiShieldCheck className="text-[#3B82F6] text-[20px]" />

      <span className="text-[14px] font-medium tracking-wide text-white">
        AI-Powered Email Security
      </span>

      {/* Added animate-ping layout for a living heartbeat/pulse effect */}
      <div className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E]"></span>
      </div>
    </div>
  );
}
