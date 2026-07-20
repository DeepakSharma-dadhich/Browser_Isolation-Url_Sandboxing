import React from "react";

const ExecutiveSummary = ({ reportData }) => {
  return (
    <div className="executive-summary">

      {/* Header */}
      <div className="executive-header">

        <h1 className="executive-title">
          Avarana Security Review
        </h1>

        <h2 className="executive-subtitle">
          EXECUTIVE SUMMARY
        </h2>

        <p className="executive-date">
          {reportData.date}
        </p>

      </div>


      {/* Risk Overview */}
      <div className="report-section">

        <div className="risk-section">

          <div>

            <h2 className="report-section-title">
              Overall Risk is {reportData.risk}
            </h2>

            <p className="report-card-description">
              Security risk is currently assessed as{" "}
              {reportData.risk.toLowerCase()} based on
              the current threat activity and detected
              email security events.
            </p>

          </div>

          <div className="risk-score">

            <span className="risk-score-value">
              {reportData.riskScore}
            </span>

            <span className="risk-score-label">
              RISK SCORE
            </span>

          </div>

        </div>

      </div>


      {/* Security Posture */}
      <div className="report-section">

        <h2 className="report-section-title">
          Security Posture
        </h2>

        <div className="metrics-grid">

          <div className="report-card">
            <h3 className="report-card-title">
              Total Mails
            </h3>

            <p className="report-card-value">
              {reportData.totalMails}
            </p>
          </div>

          <div className="report-card">
            <h3 className="report-card-title">
              Clean
            </h3>

            <p className="report-card-value">
              {reportData.clean}
            </p>
          </div>

          <div className="report-card">
            <h3 className="report-card-title">
              Quarantine
            </h3>

            <p className="report-card-value">
              {reportData.quarantine}
            </p>
          </div>

          <div className="report-card">
            <h3 className="report-card-title">
              Restored
            </h3>

            <p className="report-card-value">
              {reportData.restored}
            </p>
          </div>

        </div>

      </div>


      {/* Key Metrics */}
      <div className="report-section">

        <h2 className="report-section-title">
          Key Metrics
        </h2>

        <div className="metrics-grid">

          <div className="report-card">

            <h3 className="report-card-title">
              Primary Risk
            </h3>

            <p className="report-card-value">
              {reportData.primaryRisk}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Control Performance
            </h3>

            <p className="report-card-value">
              {reportData.controlPerformance}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Response Priority
            </h3>

            <p className="report-card-value">
              {reportData.responsePriority}
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


      {/* Mail Statistics */}
      <div className="report-section">

        <h2 className="report-section-title">
          Mail Statistics
        </h2>

        <div className="mail-grid">

          <div className="mail-card">

            <h3 className="report-card-title">
              Inbound Mails
            </h3>

            <p className="mail-count">
              {reportData.inbound}
            </p>

            <p className="report-card-description">
              External to internal flow
            </p>

          </div>


          <div className="mail-card">

            <h3 className="report-card-title">
              Internal Mails
            </h3>

            <p className="mail-count">
              {reportData.internal}
            </p>

            <p className="report-card-description">
              Internal user-to-user flow
            </p>

          </div>


          <div className="mail-card">

            <h3 className="report-card-title">
              Outbound Mails
            </h3>

            <p className="mail-count">
              {reportData.outbound}
            </p>

            <p className="report-card-description">
              Internal to external flow
            </p>

          </div>

        </div>

      </div>


      {/* Detection */}
      <div className="report-section">

        <h2 className="report-section-title">
          Detections by Type
        </h2>

        <div className="detection-list">

          <div className="detection-row">

            <span>
              Phishing
            </span>

            <div className="detection-bar">

              <div
                className="detection-bar-fill"
                style={{
                  width: `${Math.min(
                    reportData.phishing * 2,
                    100
                  )}%`,
                }}
              />

            </div>

            <span>
              {reportData.phishing}
            </span>

          </div>


          <div className="detection-row">

            <span>
              BEC
            </span>

            <div className="detection-bar">

              <div
                className="detection-bar-fill"
                style={{
                  width: `${Math.min(
                    reportData.bec * 2,
                    100
                  )}%`,
                }}
              />

            </div>

            <span>
              {reportData.bec}
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
                    reportData.suspicious * 2,
                    100
                  )}%`,
                }}
              />

            </div>

            <span>
              {reportData.suspicious}
            </span>

          </div>

        </div>

      </div>


      {/* Final Summary */}
      <div className="summary-grid">

        <div className="report-card">

          <h3 className="report-card-title">
            Current Risk
          </h3>

          <p className="report-card-description">
            The current security risk level is{" "}
            {reportData.risk.toLowerCase()} with a
            risk score of {reportData.riskScore}.
          </p>

        </div>


        <div className="report-card">

          <h3 className="report-card-title">
            Primary Threat
          </h3>

          <p className="report-card-description">
            The primary detected threat is{" "}
            {reportData.primaryRisk}.
          </p>

        </div>


        <div className="report-card">

          <h3 className="report-card-title">
            Recommended Action
          </h3>

          <p className="report-card-description">
            Continue monitoring{" "}
            {reportData.responsePriority} users
            and maintain current security controls.
          </p>

        </div>

      </div>

    </div>
  );
};

export default ExecutiveSummary;