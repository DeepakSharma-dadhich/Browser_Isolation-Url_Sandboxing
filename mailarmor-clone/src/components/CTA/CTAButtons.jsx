import { HiCheckCircle } from "react-icons/hi2";

export default function CTAButtons({
  primaryButton,
  secondaryButton,
  benefits,
}) {
  return (
    <>
      {/* Buttons */}
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        
        <button
          className="
            rounded-xl
            bg-gradient-to-r
            from-[#7C3AED]
            to-[#F97316]
            px-6
            py-3
            text-base
            font-semibold
            text-white
            shadow-md
            transition-all
            duration-300
            hover:scale-[1.02]
          "
        >
          {primaryButton}
        </button>

        <button
          className="
            rounded-xl
            border-2
            border-[#7C3AED]
            bg-white/70
            px-6
            py-3
            text-base
            font-semibold
            text-[#6D28D9]
            transition-all
            duration-300
            hover:bg-[#F5F3FF]
          "
        >
          {secondaryButton}
        </button>
      </div>

    </>
  );
}