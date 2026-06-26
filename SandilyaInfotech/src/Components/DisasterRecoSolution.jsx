import React from "react";
import disasterImg from "../assets/disaster-recovery.png";

import {
  FaSyncAlt,
  FaDatabase,
  FaShieldAlt,
  FaProjectDiagram,
  FaTools,
} from "react-icons/fa";

const DisasterRecoSolution = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
          {/* Left Content */}
          <div
            data-aos="fade-right"
            data-aos-duration="700"
          >
            <h2 className="text-[32px] lg:text-[40px] font-medium text-[#0057c2] mb-4">
              Disaster Recovery
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Minimize downtime and secure your critical IT infrastructure with
              our robust Disaster Recovery solutions. Whether you're facing
              cyberattacks, natural disasters, or system failures, our
              strategies ensure business continuity and rapid recovery.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaSyncAlt className="text-[18px]" />
                <span>Automated Backup & Restore</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaDatabase className="text-[18px]" />
                <span>Data Replication Services</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaShieldAlt className="text-[18px]" />
                <span>Secure Offsite Storage</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaProjectDiagram className="text-[18px]" />
                <span>Redundant Infrastructure</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaTools className="text-[18px]" />
                <span>DR Testing & Planning</span>
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
              src={disasterImg}
              alt="Disaster Recovery"
              className="w-full max-w-[820px] rounded-3xl shadow-lg object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default DisasterRecoSolution;