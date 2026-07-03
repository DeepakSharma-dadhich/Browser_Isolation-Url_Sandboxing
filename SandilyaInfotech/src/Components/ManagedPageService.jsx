import React from "react";
import { IoCheckmark } from "react-icons/io5";
import managedServiceImg from "../assets/managed-services.png";

const ManagedPageService = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[32px] font-medium text-[#0057c2] mb-4">
              Managed IT Services
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Our Managed IT Services provide proactive monitoring,
              maintenance, and technical support to ensure your business
              operates efficiently. We help reduce downtime, improve system
              performance, and keep your IT infrastructure secure with
              round-the-clock management.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>24/7 Infrastructure Monitoring</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Proactive Maintenance & Updates</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Remote & On-Site Technical Support</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Backup & Disaster Recovery</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <IoCheckmark className="shrink-0 text-[18px]" />
                <span>Security & Performance Optimization</span>
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
              src={managedServiceImg}
              alt="Managed IT Services"
              className="w-full max-w-[560px] rounded-2xl shadow-lg object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManagedPageService;