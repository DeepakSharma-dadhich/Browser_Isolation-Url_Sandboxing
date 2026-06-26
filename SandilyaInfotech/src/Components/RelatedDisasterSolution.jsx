import React from "react";
import {
  FaDatabase,
  FaProjectDiagram,
  FaSitemap,
  FaClock,
  FaCloudUploadAlt,
  FaFileMedicalAlt,
} from "react-icons/fa";

const RelatedDisasterSolution = () => {
  return (
    <section className="bg-white pt-2 pb-16">
      <div className="max-w-[1400px] mx-auto px-8 md:px-12 lg:px-20">
        {/* Heading */}
        <h2 className="text-[26px] md:text-[30px] font-medium text-center text-[#1f2937] mb-8">
          Related Disaster Recovery Solutions
        </h2>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
          >
            <FaDatabase className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Cloud Backup
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Secure, automated cloud backups for critical files, apps, and
              systems.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="100"
          >
            <FaProjectDiagram className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              DR Strategy & Planning
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Customized recovery plans to meet compliance, speed, and
              resilience needs.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="200"
          >
            <FaSitemap className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              High Availability Systems
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Deploy redundant systems to ensure continuous service during
              disruptions.
            </p>
          </div>

          {/* Card 4 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
          >
            <FaClock className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Rapid Data Recovery
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Recover your data in minutes, not days, with cutting-edge recovery
              tools.
            </p>
          </div>

          {/* Card 5 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="100"
          >
            <FaCloudUploadAlt className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Remote Disaster Recovery
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Recover remotely and restore operations even during on-site
              inaccessibility.
            </p>
          </div>

          {/* Card 6 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="200"
          >
            <FaFileMedicalAlt className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Compliance & Auditing
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Meet industry standards with auditable, regulatory-ready disaster
              recovery practices that align with defined RTO, RPO, ensuring
              minimal downtime and data loss.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RelatedDisasterSolution;