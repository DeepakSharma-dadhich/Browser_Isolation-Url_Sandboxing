import React, { useState } from "react";
import ReportPage from "../pages/ReportPage";

const Loader = () => {
  const [activeReport, setActiveReport] = useState("daily");

  // Dummy Report Data
  const reports = {
    daily: {
      title: "Daily Security Report",
      date: "20 July 2026",

      risk: "Low",
      riskScore: "8%",

      totalMails: 45,
      clean: 40,
      quarantine: 4,
      restored: 1,

      primaryRisk: "Phishing",
      controlPerformance: "98.2%",
      responsePriority: "Admin",
      totalUsers: 1,

      inbound: 5,
      internal: 40,
      outbound: 0,

      phishing: 2,
      bec: 1,
      suspicious: 1,

      targetedUsers: 1,
      threatLevel: "Low",
      mainThreat: "Phishing",

      malware: 2,
      suspiciousAttachments: 1,

      maliciousUrl: "35%",
      senderReputation: "30%",
      attachment: "20%",
      languagePattern: "15%",
    },

    weekly: {
      title: "Weekly Security Report",
      date: "13 July 2026 - 19 July 2026",

      risk: "Medium",
      riskScore: "18%",

      totalMails: 225,
      clean: 202,
      quarantine: 24,
      restored: 2,

      primaryRisk: "Credential Phishing",
      controlPerformance: "96.7%",
      responsePriority: "Admin + Finance",
      totalUsers: 1,

      inbound: 11,
      internal: 214,
      outbound: 0,

      phishing: 3,
      bec: 10,
      suspicious: 10,

      targetedUsers: 3,
      threatLevel: "Medium",
      mainThreat: "Credential Phishing",

      malware: 7,
      suspiciousAttachments: 5,

      maliciousUrl: "42%",
      senderReputation: "28%",
      attachment: "20%",
      languagePattern: "10%",
    },

    monthly: {
      title: "Monthly Security Report",
      date: "01 July 2026 - 31 July 2026",

      risk: "High",
      riskScore: "35%",

      totalMails: 950,
      clean: 820,
      quarantine: 100,
      restored: 30,

      primaryRisk: "Business Email Compromise",
      controlPerformance: "91.4%",
      responsePriority: "Finance + HR",
      totalUsers: 5,

      inbound: 85,
      internal: 780,
      outbound: 85,

      phishing: 25,
      bec: 40,
      suspicious: 35,

      targetedUsers: 12,
      threatLevel: "High",
      mainThreat: "Business Email Compromise",

      malware: 25,
      suspiciousAttachments: 20,

      maliciousUrl: "50%",
      senderReputation: "25%",
      attachment: "15%",
      languagePattern: "10%",
    },
  };

  return (
    <div className="loader-container">

      {/* Main Heading */}
      <h1 className="loader-title">
        Report Management System
      </h1>

      {/* Daily / Weekly / Monthly */}
      <div className="report-tabs">

        <button
          className={`report-tab ${
            activeReport === "daily" ? "active" : ""
          }`}
          onClick={() => setActiveReport("daily")}
        >
          Daily Report
        </button>

        <button
          className={`report-tab ${
            activeReport === "weekly" ? "active" : ""
          }`}
          onClick={() => setActiveReport("weekly")}
        >
          Weekly Report
        </button>

        <button
          className={`report-tab ${
            activeReport === "monthly" ? "active" : ""
          }`}
          onClick={() => setActiveReport("monthly")}
        >
          Monthly Report
        </button>

      </div>

      {/* Selected Report */}
      <ReportPage
        reportType={activeReport}
        reportData={reports[activeReport]}
      />

    </div>
  );
};

export default Loader;