import React from "react";
import { IoCheckmark } from "react-icons/io5";
import solutionDesignImg from "../assets/solution-design.png"; // Change image path

const SolutionPageService = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[32px] font-medium text-[#0057c2] mb-4">
              Solution Design & Deployment
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              We design, develop, and deploy customized IT solutions that align
              with your business objectives. Our experts ensure seamless
              implementation, optimal performance, and scalable infrastructure
              to support your organization's growth while minimizing downtime.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Custom IT Solution Architecture</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Infrastructure Planning & Deployment</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Cloud & On-Premise Integration</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>System Migration & Configuration</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Scalable, Secure & Future-Ready Solutions</span>
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
              src={solutionDesignImg}
              alt="Solution Design & Deployment"
              className="w-full max-w-[560px] rounded-2xl shadow-lg object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionPageService;