import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import managedImg from "../assets/managed-it.png";

const ManagedITSolution = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Managed IT Services
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              As a Managed Service Provider (MSP), Sandilya Infotech Pvt Ltd
              proactively manages and monitors your entire IT infrastructure,
              from structured cabling to advanced technology solutions. By
              outsourcing IT operations to our team, businesses gain faster
              issue resolution, improved response times, and cost savings
              compared to maintaining an in-house IT department. Our experts
              stay up to date with the latest technologies, ensuring solutions
              that align with your business goals, boost productivity, and
              reduce overhead. We also help businesses scale effortlessly by
              providing flexible IT resources that adapt to changing demands.
              With proactive system monitoring, predictive maintenance, and
              advanced security frameworks, we minimize downtime and protect
              against evolving cyber threats. Whether it’s cloud adoption,
              disaster recovery, or compliance readiness, our managed services
              empower organizations to operate with confidence, efficiency, and
              long-term resilience.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>24/7 IT Support</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>System Monitoring & Updates</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>Data Backup & Recovery</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>Cybersecurity & Threat Protection</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>Cost Optimization</span>
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
              src={managedImg}
              alt="Enterprise Networking"
              className="
                    w-full
                    max-w-[560px]
                    rounded-2xl
                    shadow-lg
                    object-cover
                  "
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManagedITSolution;
