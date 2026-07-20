import React, { useRef, useState } from "react";
import html2pdf from "html2pdf.js";

import ExecutiveSummary from "../components/ExecutiveSummary";
import EvidenceResponsePlan from "../components/EvidenceResponsePlan";
import ExposureDetectionAnalysis from "../components/ExposureDetectionAnalysis";

const ReportPage = ({ reportType, reportData }) => {
  const [activeSection, setActiveSection] =
    useState("executive");

  const reportRef = useRef();

  const downloadPDF = () => {
    const element = reportRef.current;

    const options = {
      margin: 10,

      filename: `${reportData.title.replace(
        /\s+/g,
        "_"
      )}.pdf`,

      image: {
        type: "jpeg",
        quality: 0.98,
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
      },

      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },

      pagebreak: {
        mode: ["avoid-all", "css", "legacy"],
      },
    };

    html2pdf()
      .set(options)
      .from(element)
      .save();
  };

  return (
    <div className="report-page">

      {/* Report Header */}
      <div className="report-section report-header">

        <div>
          <h2 className="report-page-title">
            {reportData.title}
          </h2>

          <p className="report-card-description">
            Report Period: {reportData.date}
          </p>
        </div>

        {/* PDF Button */}
        <button
          className="pdf-button"
          onClick={downloadPDF}
        >
          Download PDF
        </button>

      </div>


      {/* Report Section Buttons */}
      <div className="report-tabs">

        <button
          className={`report-tab ${
            activeSection === "executive"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveSection("executive")
          }
        >
          Executive Summary
        </button>


        <button
          className={`report-tab ${
            activeSection === "evidence"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveSection("evidence")
          }
        >
          Evidence & Response Plan
        </button>


        <button
          className={`report-tab ${
            activeSection === "exposure"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveSection("exposure")
          }
        >
          Exposure & Detection Analysis
        </button>

      </div>


      {/* PDF Content */}
      <div ref={reportRef}>

        {/* Executive Summary */}
        {activeSection === "executive" && (
          <ExecutiveSummary
            reportType={reportType}
            reportData={reportData}
          />
        )}


        {/* Evidence & Response Plan */}
        {activeSection === "evidence" && (
          <EvidenceResponsePlan
            reportType={reportType}
            reportData={reportData}
          />
        )}


        {/* Exposure & Detection Analysis */}
        {activeSection === "exposure" && (
          <ExposureDetectionAnalysis
            reportType={reportType}
            reportData={reportData}
          />
        )}

      </div>

    </div>
  );
};

export default ReportPage;