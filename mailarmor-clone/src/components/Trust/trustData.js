import {
  HiShieldCheck,
  HiLockClosed,
  HiGlobeAsiaAustralia,
  HiCloud,
} from "react-icons/hi2";

const trustData = [
  {
    id: 1,
    icon: HiShieldCheck,
    title: "CERT-In\nCompliant",
    description:
      "Built following India's CERT-In guidelines for stronger email security and cyber resilience.",
  },
  {
    id: 2,
    icon: HiLockClosed,
    title: "DPDP\nReady",
    description:
      "Designed to help organizations align with the Digital Personal Data Protection Act requirements.",
  },
  {
    id: 3,
    icon: HiGlobeAsiaAustralia,
    title: "Indian Data\nResidency",
    description:
      "Keep sensitive email data within India to meet regulatory and business requirements.",
  },
  {
    id: 4,
    icon: HiCloud,
    title: "Microsoft 365\nIntegration",
    description:
      "Deploy quickly with Microsoft 365 using secure API-based integration without MX changes.",
  },
];

export default trustData;