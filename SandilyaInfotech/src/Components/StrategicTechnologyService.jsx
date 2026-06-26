import React from "react";
import { IoCheckmark } from "react-icons/io5";
import strategicImg from "../assets/strategic-technology.png";

const StrategicTechnologyService = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Strategic Technology Planning
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Maximize your business outcomes through strategic IT consulting
              services. We help align technology with business goals to improve
              agility, performance, and competitiveness.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Align IT investments with business objectives</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Plan scalable, future-ready technology solutions</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Improve ROI and operational efficiency</span>
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
              src={strategicImg}
              alt="Strategic Technology Planning"
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

export default StrategicTechnologyService;
