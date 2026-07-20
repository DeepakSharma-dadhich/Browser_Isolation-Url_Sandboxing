import React from "react";

const EvidenceResponsePlan = ({ reportData }) => {
  return (
    <div className="executive-summary">

      <div className="executive-header">

        <h1 className="executive-title">
          Avarana Security Review
        </h1>

        <h2 className="executive-subtitle">
          EVIDENCE AND RESPONSE PLAN
        </h2>

        <p className="executive-date">
          {reportData.date}
        </p>

      </div>


      {/* Current Assessment */}
      <div className="report-section">

        <h2 className="report-section-title">
          Current Security Assessment
        </h2>

        <p className="report-card-description">
          The current security risk is{" "}
          <strong>
            {reportData.risk}
          </strong>
          .
        </p>

        <p className="report-card-description">
          The primary security concern for this
          reporting period is{" "}
          <strong>
            {reportData.primaryRisk}
          </strong>
          .
        </p>

      </div>


      {/* Response Priorities */}
      <div className="report-section">

        <h2 className="report-section-title">
          Response Priorities
        </h2>

        <div className="metrics-grid">

          <div className="report-card">

            <h3 className="report-card-title">
              Primary Threat
            </h3>

            <p className="report-card-value">
              {reportData.primaryRisk}
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
              Control Performance
            </h3>

            <p className="report-card-value">
              {reportData.controlPerformance}
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Risk Score
            </h3>

            <p className="report-card-value">
              {reportData.riskScore}
            </p>

          </div>

        </div>

      </div>


      {/* Evidence Summary */}
      <div className="report-section">

        <h2 className="report-section-title">
          Evidence Summary
        </h2>

        <table className="platform-table">

          <thead>

            <tr>
              <th>Indicator</th>
              <th>Count</th>
              <th>Assessment</th>
            </tr>

          </thead>

          <tbody>

            <tr>
              <td>Phishing</td>
              <td>
                {reportData.phishing}
              </td>
              <td>
                Detected
              </td>
            </tr>

            <tr>
              <td>BEC</td>
              <td>
                {reportData.bec}
              </td>
              <td>
                Monitored
              </td>
            </tr>

            <tr>
              <td>Suspicious Activity</td>
              <td>
                {reportData.suspicious}
              </td>
              <td>
                Under Review
              </td>
            </tr>

          </tbody>

        </table>

      </div>


      {/* Recommended Actions */}
      <div className="report-section">

        <h2 className="report-section-title">
          Recommended Actions
        </h2>

        <div className="summary-grid">

          <div className="report-card">

            <h3 className="report-card-title">
              Action 01
            </h3>

            <p className="report-card-description">
              Continue monitoring{" "}
              {reportData.primaryRisk} activity.
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Action 02
            </h3>

            <p className="report-card-description">
              Review suspicious messages and
              quarantine events.
            </p>

          </div>


          <div className="report-card">

            <h3 className="report-card-title">
              Action 03
            </h3>

            <p className="report-card-description">
              Maintain additional monitoring for{" "}
              {reportData.responsePriority}.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default EvidenceResponsePlan;