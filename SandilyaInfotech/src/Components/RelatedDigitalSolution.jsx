import React from "react";
import {
  FaCogs,
  FaChartLine,
  FaUsers,
  FaCode,
  FaLock,
  FaCloudUploadAlt,
} from "react-icons/fa";

const RelatedDigitalSolution = () => {
  return (
    <section className="bg-white pt-2 pb-16">
      <div className="max-w-[1400px] mx-auto px-8 md:px-12 lg:px-20">
        {/* Heading */}
        <h2 className="text-[26px] md:text-[30px] font-medium text-center text-[#1f2937] mb-8">
          Related Digital Transformation Solutions
        </h2>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
          >
            <FaCogs className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Process Automation
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Streamline workflows and eliminate manual tasks using intelligent
              automation.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="100"
          >
            <FaChartLine className="text-[#0057c2] text-5xl mx-auto mb-5" />

            <h3 className="text-[20px] font-medium text-[#0c2340] mb-4">
              Data Analytics
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Leverage real-time insights and predictive analytics for smarter
              business decisions.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="200"
          >
            <FaUsers className="text-[#0057c2] text-5xl mx-auto mb-5" />

            <h3 className="text-[20px] font-medium text-[#0c2340] mb-4">
              Customer Experience (CX)
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Enhance engagement with personalized, omnichannel digital
              experiences.
            </p>
          </div>

          {/* Card 4 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
          >
            <FaCode className="text-[#0057c2] text-5xl mx-auto mb-5" />

            <h3 className="text-[20px] font-medium text-[#0c2340] mb-4">
              Legacy System Modernization
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Upgrade outdated systems to modern, agile, and scalable digital
              platforms.
            </p>
          </div>

          {/* Card 5 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="100"
          >
            <FaLock className="text-[#0057c2] text-5xl mx-auto mb-5" />

            <h3 className="text-[20px] font-medium text-[#0c2340] mb-4">
              Digital Security
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Ensure compliance, privacy, and cybersecurity throughout your
              transformation journey.
            </p>
          </div>

          {/* Card 6 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-7 max-w-[360px] mx-auto text-center hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="200"
          >
            <FaCloudUploadAlt className="text-[#0057c2] text-5xl mx-auto mb-5" />

            <h3 className="text-[20px] font-medium text-[#0c2340] mb-4">
              Cloud Enablement
            </h3>

            <p className="text-gray-500 text-[16px] leading-8">
              Accelerate digital initiatives through scalable and agile cloud
              infrastructure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RelatedDigitalSolution;
