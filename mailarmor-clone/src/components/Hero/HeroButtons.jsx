// import { FaRocket, FaPlay } from "react-icons/fa";

// export default function HeroButtons() {
//   return (
//     <div className="mt-8 flex items-center gap-4">

//       {/* Primary Button */}
//       <button
//         className="
//           group
//           relative
//           flex
//           h-[52px]
//           w-[214px]
//           items-center
//           justify-center
//           gap-3
//           overflow-hidden
//           rounded-xl
//           bg-[#112749]
//           text-[14px]
//           font-semibold
//           text-white
//           shadow-[0_4px_20px_rgba(59,130,246,.40)]
//           transition-all
//           duration-300
//           hover:-translate-y-1
//           hover:shadow-[0_8px_30px_rgba(59,130,246,.55)]
//         "
//       >
//         {/* Continuous Shine */}
//         <span className="button-shine"></span>

//         <FaRocket className="relative z-10 text-[15px]" />

//         <span className="relative z-10">
//           Join our Waitlist
//         </span>

//         <span className="button-arrow relative z-10">
//           →
//         </span>
//       </button>

//       {/* Secondary Button */}
//       <button
//         className="
//           flex
//           h-[52px]
//           w-[166px]
//           items-center
//           justify-center
//           gap-3
//           rounded-xl
//           border-2
//           border-white/30
//           bg-transparent
//           text-[14px]
//           font-semibold
//           text-white
//           transition-all
//           duration-300
//           hover:border-[#3B82F6]
//           hover:bg-white/5
//         "
//       >
//         <FaPlay className="text-[13px]" />
//         Watch Demo
//       </button>

//     </div>
//   );
// }

import { FaPlay } from "react-icons/fa";

export default function HeroButtons() {
  return (
    <div className="mt-8 flex justify-center lg:justify-start gap-4 flex-wrap">

      {/* Button */}
      <button
        className="
          flex
          h-[52px]
          w-[166px]
          items-center
          justify-center
          gap-3
          rounded-xl
          border-2
          border-white/30
          bg-transparent
          text-[14px]
          font-semibold
          text-white
          transition-all
          duration-300
          hover:border-[#3B82F6]
          hover:bg-white/5
        "
      >
        <FaPlay className="text-[13px]" />
        Watch Demo
      </button>

    </div>
  );
}