import React from "react";
import {
  FaCheckCircle,
} from "react-icons/fa";
import networkImg from "../assets/network-security.png";

const NetworkSolution = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Network Security
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              We offer comprehensive network protection strategies to prevent
              unauthorized access, misuse, or theft of your business data. Our
              solutions include firewalls, intrusion detection systems, VPNs,
              and secure network architecture planning.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>High-speed, reliable network architecture</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>Secure access across devices and locations</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>Scalability for future business growth</span>
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
              src={networkImg}
              alt="Network Security"
              className="w-full max-w-[620px] rounded-2xl shadow-lg object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default NetworkSolution;