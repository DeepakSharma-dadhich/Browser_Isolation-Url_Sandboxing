// import {
//   HiShieldCheck,
//   HiCheckBadge,
// } from "react-icons/hi2";

// const features = [
//   "CERT-In Compliant",
//   "DPDP Ready",
//   "Indian Data Residency",
// ];

// export default function HeroFeatures() {
//   return (
//     <div className="mt-8 flex items-center gap-8">
//       {features.map((item) => (
//         <div
//           key={item}
//           className="flex items-center gap-2"
//         >
//           <HiShieldCheck className="text-[#3B82F6] text-[18px]" />

//           <span className="text-[14px] text-[#C5CEDB]">
//             {item}
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// }


import { HiShieldCheck } from "react-icons/hi2";

const features = [
  "CERT-In Compliant",
  "DPDP Ready",
  "Indian Data Residency",
];

export default function HeroFeatures() {
  return (
    
    <div className="mt-8
    flex
    flex-col
    sm:flex-row
    flex-wrap
    items-center
    justify-center
    lg:justify-start
    gap-4">
      {features.map((item) => (
        <div
          key={item}
          
          className="flex items-center gap-2 shrink-0"
        >
          <HiShieldCheck className="text-[#3B82F6] text-[18px]" />

          
          <span className="text-[14px] font-medium text-[#C5CEDB] tracking-wide">
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}
