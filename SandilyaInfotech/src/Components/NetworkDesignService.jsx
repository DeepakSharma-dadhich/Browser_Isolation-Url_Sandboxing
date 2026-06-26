import React from "react";
// import { FaCheckCircle } from "react-icons/fa";
import { IoCheckmark } from "react-icons/io5";
import networkDesignImg from "../assets/netork-design.png";

const NetworkDesignService = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Network Design & Implementation
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              We specialize in designing and implementing reliable, secure, and
              scalable network infrastructure that supports your current needs
              and future growth. From planning to execution, our expert team
              ensures every aspect is optimized for performance and resilience.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Customized Network Architecture</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>High-Speed Data Transfer</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Redundancy and Failover Design</span>
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
              src={networkDesignImg}
              alt="Network Design & Implementation"
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

export default NetworkDesignService;
