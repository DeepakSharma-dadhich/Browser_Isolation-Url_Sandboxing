import React from "react";
// import { FaCheckCircle } from "react-icons/fa";
import { IoCheckmark } from "react-icons/io5";
import surveillanceImg from "../assets/surveillance-image.png";

const CompSurveillanceService = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[28px] lg:text-[30px] font-medium text-[#0057c2] mb-4 whitespace-nowrap">
              Comprehensive Surveillance Solutions
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Our surveillance solutions offer advanced video analytics, robust
              cybersecurity, and mobile surveillance to keep your environment
              safe and secure.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Real-time video monitoring and analytics</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>End-to-end cybersecurity measures</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Flexible mobile surveillance systems</span>
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
              src={surveillanceImg}
              alt="Comprehensive Surveillance Solutions"
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

export default CompSurveillanceService;
