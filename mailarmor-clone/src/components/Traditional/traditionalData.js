import {
  HiExclamationTriangle,
  HiBuildingOffice2,
  HiMapPin,
} from "react-icons/hi2";

const traditionalData = [
  {
    id: 1,
    icon: HiExclamationTriangle,
    title: "Traditional Gateway\nLimitations",
    points: [
      "Weak against today's MX vectors, reroutes and quarantine logic.",
      "Hard to evaluate blocked mail flow.",
      "Blind spots for AI-generated attacks.",
    ],
    badge: "Typical rollout: 3–4 weeks",
  },
  {
    id: 2,
    icon: HiBuildingOffice2,
    title: "Enterprise Tools vs.\nSMB Reality",
    points: [
      "Priced for large enterprises.",
      "No India-focused protection.",
      "Complex deployment and support.",
    ],
    badge: "Support Fit: Enterprise-first",
  },
  {
    id: 3,
    icon: HiMapPin,
    title: "India-Specific\nChallenges",
    points: [
      "DPDP compliance requirements.",
      "Indian data residency.",
      "Regional-language phishing.",
    ],
    badge: "Regional Intel: Missing",
  },
];

export default traditionalData;


// import {
//   HiEnvelope,
//   HiShieldExclamation,
//   HiClock,
// } from "react-icons/hi2";

// const traditionalData = [
//   {
//     id: 1,
//     icon: HiEnvelope,
//     title: "Signature-Based\nDetection",
//     points: [
//       "Fails against zero-day phishing attacks",
//       "Cannot detect AI-generated emails",
//       "Relies on outdated threat databases",
//       "High false-negative rates",
//     ],
//     badge: "Outdated Protection",
//   },

//   {
//     id: 2,
//     icon: HiShieldExclamation,
//     title: "Secure Email\nGateway Limits",
//     points: [
//       "Complex deployment and maintenance",
//       "Expensive for growing SMBs",
//       "Misses internal email threats",
//       "Limited behavioral analysis",
//     ],
//     badge: "High Cost",
//   },

//   {
//     id: 3,
//     icon: HiClock,
//     title: "Manual Security\nProcesses",
//     points: [
//       "Slow incident response times",
//       "Human errors increase risk",
//       "No real-time AI detection",
//       "Difficult compliance reporting",
//     ],
//     badge: "Time Consuming",
//   },
// ];

// export default traditionalData;