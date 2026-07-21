import HeroImage from "./HeroImage";
import FloatingCard from "./FloatingCard";

import { HiShieldCheck } from "react-icons/hi2";
import { MdSecurity } from "react-icons/md";
import { FaBolt, FaLink } from "react-icons/fa";

export default function HeroRight() {
  return (
    <div className="relative w-[50%] flex items-center justify-end -translate-y-10">
      <HeroImage />
      
      {/* Links */}
  <FloatingCard
    title="Links Scanned"
    subtitle="Malicious URL blocked"
    icon={<FaLink className="text-[#A855F7]" />}
    pulseColorRGB="168,85,247"
    className="top-[-60px] left-[20px] animate-float-slow"
  />

  {/* Threat */}
  <FloatingCard
    title="Threat Blocked"
    subtitle="Phishing attempt stopped"
    icon={<HiShieldCheck className="text-[#3B82F6]" />}
    pulseColorRGB="59,130,246"
    className="top-[-90px] right-[0px] animate-float"
  />

  {/* Protected */}
  <FloatingCard
    title="99.9% Protected"
    subtitle="Real-time AI scanning"
    icon={<MdSecurity className="text-[#4ADE80]" />}
    pulseColorRGB="74,222,128"
    className="top-[200px] right-[-20px] animate-float-slow"
  />

  {/* Invoice */}
  <FloatingCard
    title="Invoice Fraud"
    subtitle="Detected & quarantined"
    icon={<FaBolt className="text-[#FB923C]" />}
    pulseColorRGB="251,146,60"
    className="bottom-[-70px] left-[60px] animate-float-fast"
  />
    </div>
  );
}
