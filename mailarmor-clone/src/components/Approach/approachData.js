import {
  HiLink,
  HiCpuChip,
  HiFlag,
} from "react-icons/hi2";

const approachData = {
  title: "From Research to Reality: MailArmor's Approach",

  subtitle:
    "MailArmor delivers enterprise-grade AI email security for Indian SMBs with instant API Integration, advanced analytics, and CERT-In compliant architecture at SMB-friendly pricing.",

  cards: [
    {
      id: 1,
      number: "01",
      icon: HiLink,
      title: "Next-Gen API Integration",
      description:
        "MailArmor connects to Microsoft 365 via Graph API and deploys in 5 minutes, compared to the weeks required by traditional email gateways.",
    },
    {
      id: 2,
      number: "02",
      icon: HiCpuChip,
      title: "Essential Advanced Analytics",
      description:
        "MailArmor combines Natural Language Processing (NLP), Large Language Models (LLM), and Social Graph Analysis to detect phishing, malware, ransomware, and business email compromise (BEC).",
    },
    {
      id: 3,
      number: "03",
      icon: HiFlag,
      title: "India First Advantage for SMBs",
      description:
        "MailArmor is India-first, with CERT-In and DPDP compliance, local data residency in Mumbai, and regional threat intelligence that global vendors often lack.",
    },
  ],
};

export default approachData;
