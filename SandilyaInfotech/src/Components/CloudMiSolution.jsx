import React from "react";
import {
  FaCloudUploadAlt,
  FaTools,
  FaLock,
  FaTachometerAlt,
  FaHeadset,
} from "react-icons/fa";
import cloudImg from "../assets/cloud-migration.png";

const CloudMiSolution = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left Content */}
          <div
            data-aos="fade-right"
            data-aos-duration="700"
          >
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Cloud Migration & Management
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Harness cloud capabilities with our comprehensive migration and
              management services. We help you seamlessly transition
              applications, data, and workloads to secure cloud platforms,
              ensuring cost efficiency, scalability, and compliance.

              After migration, our team provides robust monitoring,
              optimization, and ongoing support to maintain peak performance
              and uninterrupted uptime.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCloudUploadAlt />
                <span>Seamless Cloud Migration</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaTools />
                <span>Ongoing Cloud Management</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaLock />
                <span>Security & Compliance Monitoring</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaTachometerAlt />
                <span>Performance Optimization</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaHeadset />
                <span>24/7 Cloud Support</span>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div
            className="flex justify-center"
            data-aos="fade-left"
            data-aos-duration="700"
          >
            <img
              src={cloudImg}
              alt="Cloud Migration & Management"
              className="w-full max-w-[620px] rounded-2xl shadow-lg object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default CloudMiSolution;