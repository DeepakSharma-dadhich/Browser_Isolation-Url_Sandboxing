import { HiChevronDoubleDown } from "react-icons/hi";

export default function HeroScroll() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">

      {/* Mouse */}
      <div className="relative w-[34px] h-[56px] rounded-full border-2 border-white/30">

        <span
          className="
            absolute
            left-1/2
            top-2
            h-3
            w-[3px]
            -translate-x-1/2
            rounded-full
            bg-white/70
            animate-scrollWheel
          "
        />
      </div>

      {/* Text */}
      <p className="mt-6 text-[13px] tracking-[6px] uppercase text-white/45">
        Scroll To Explore
      </p>

      {/* Arrow */}
      <HiChevronDoubleDown className="mt-3 text-[22px] text-white/25 animate-bounceSlow" />

    </div>
  );
}