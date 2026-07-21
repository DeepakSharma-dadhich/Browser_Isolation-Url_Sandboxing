import HeroImage from "./HeroImage";
import FloatingCard from "./FloatingCard";

import { HiShieldCheck } from "react-icons/hi2";
import { MdSecurity } from "react-icons/md";
import { FaBolt, FaLink } from "react-icons/fa";

export default function HeroRightMobile() {
  return (
    <div className="relative mt-20 flex justify-center">

      {/* Hero Image */}
      <div className="w-full max-w-[500px]">
        <HeroImage />
      </div>

      {/* Top Left */}
      <FloatingCard
        title="Links Scanned"
        subtitle="Malicious URL blocked"
        icon={<FaLink className="text-[#A855F7]" />}
        pulseColorRGB="168, 85, 247"
        className="
          absolute
          top-[-50px]
          left-0
          min-w-[170px]
          scale-[0.72]
        "
      />

      {/* Top Right */}
      <FloatingCard
        title="Threat Blocked"
        subtitle="Phishing attempt stopped"
        icon={<HiShieldCheck className="text-[#3B82F6]" />}
        pulseColorRGB="59,130,246"
        className="
          absolute
          top-[-80px]
          right-0
          min-w-[185px]
          scale-[0.72]
        "
      />

      {/* Bottom Left */}
      <FloatingCard
        title="Invoice Fraud"
        subtitle="Detected & quarantined"
        icon={<FaBolt className="text-[#FB923C]" />}
        pulseColorRGB="251,146,60"
        className="
          absolute
          bottom-0
          left-[-20px]
          min-w-[180px]
          scale-[0.72]
        "
      />

      {/* Bottom Right */}
      <FloatingCard
        title="99.9% Protected"
        subtitle="Real-time AI scanning"
        icon={<MdSecurity className="text-[#4ADE80]" />}
        pulseColorRGB="74,222,128"
        className="
          absolute
          bottom-2
          right-0
          min-w-[190px]
          scale-[0.72]
        "
      />

    </div>
  );
}