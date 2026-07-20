import React from "react";

const ExposureDetectionAnalysis = ({ reportData }) => {
  return (
    <div className="executive-summary">

      <div className="executive-header">

        <h1 className="executive-title">
          Avarana Security Review
        </h1>

        <h2 className="executive-subtitle">
          EXPOSURE AND DETECTION ANALYSIS
        </h2>

        <p className="executive-date">
          {reportData.date}
        </p>

      </div>


      {/* Exposure Overview */}
      <div className="report-section">

        <h2 className="report-section-title">
          Exposure Overview
        </h2>

        <div className="metrics-grid">

          <div className="report-card">

            <h3 className="report-card-title">
              Targeted Users
            </h3>

            <p className="report-card-value">
              {reportData.targetedUsers}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Threat Level
            </h3>

            <p className="report-card-value">
              {reportData.threatLevel}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Main Threat
            </h3>

            <p className="report-card-value">
              {reportData.mainThreat}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Total Users
            </h3>

            <p className="report-card-value">
              {reportData.totalUsers}
            </p>

          </div>

        </div>

      </div>


      {/* Attachment Threat Type */}
      <div className="report-section">

        <h2 className="report-section-title">
          Attachment Threat Type
        </h2>

        <div className="detection-list">

          <div className="detection-row">

            <span>
              Malware
            </span>

            <div className="detection-bar">

              <div
                className="detection-bar-fill"
                style={{
                  width: `${Math.min(
                    reportData.malware * 3,
                    100
                  )}%`,
                }}
              />

            </div>

            <span>
              {reportData.malware}
            </span>

          </div>


          <div className="detection-row">

            <span>
              Suspicious
            </span>

            <div className="detection-bar">

              <div
                className="detection-bar-fill"
                style={{
                  width: `${Math.min(
                    reportData.suspiciousAttachments * 3,
                    100
                  )}%`,
                }}
              />

            </div>

            <span>
              {reportData.suspiciousAttachments}
            </span>

          </div>

        </div>

      </div>


      {/* Indicator Contribution */}
      <div className="report-section">

        <h2 className="report-section-title">
          Indicator Contribution
        </h2>

        <div className="metrics-grid">

          <div className="report-card">

            <h3 className="report-card-title">
              Malicious URL
            </h3>

            <p className="report-card-value">
              {reportData.maliciousUrl}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Sender Reputation
            </h3>

            <p className="report-card-value">
              {reportData.senderReputation}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Attachment
            </h3>

            <p className="report-card-value">
              {reportData.attachment}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Language Pattern
            </h3>

            <p className="report-card-value">
              {reportData.languagePattern}
            </p>

          </div>

        </div>

      </div>


      {/* Detection Analysis */}
      <div className="report-section">

        <h2 className="report-section-title">
          Detection Analysis
        </h2>

        <p className="report-card-description">
          The current reporting period recorded{" "}
          {reportData.phishing} phishing detections,{" "}
          {reportData.bec} BEC detections and{" "}
          {reportData.suspicious} suspicious activities.
        </p>

        <p className="report-card-description">
          The primary threat identified during this
          reporting period was{" "}
          <strong>
            {reportData.mainThreat}
          </strong>
          .
        </p>

      </div>


      {/* Recommended Policy */}
      <div className="report-section">

        <h2 className="report-section-title">
          Recommended Policy
        </h2>

        <div className="summary-grid">

          <div className="report-card">

            <h3 className="report-card-title">
              URL Protection
            </h3>

            <p className="report-card-description">
              Continue URL scanning and block
              known malicious domains.
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Attachment Protection
            </h3>

            <p className="report-card-description">
              Maintain attachment inspection and
              quarantine policies.
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              User Awareness
            </h3>

            <p className="report-card-description">
              Continue security awareness training
              focused on {reportData.mainThreat}.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ExposureDetectionAnalysis;