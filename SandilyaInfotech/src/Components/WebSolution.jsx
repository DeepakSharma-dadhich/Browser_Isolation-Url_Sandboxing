import React from "react";
import webImg from "../assets/web-security.png";

const WebSolution = () => {
  return (
    <section className="bg-white py-16">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* Left Image */}
          <div
            className="flex justify-center"
            data-aos="fade-right"
            data-aos-duration="700"
          >
            <img
              src={webImg}
              alt="Web Security"
              className="w-full max-w-[650px] rounded-2xl shadow-lg object-cover"
            />
          </div>

          {/* Right Content */}
          <div
            data-aos="fade-left"
            data-aos-duration="700"
          >
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Web Security
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Protect your websites and online services from cyber threats such
              as malware, phishing, and defacement. Our web security services
              include WAFs, DDoS protection, and real-time threat monitoring.
            </p>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Embrace the power of automated monitoring and analysis across your
              network. Web Security enables you to promptly address threats by
              determining the scope of damage whenever a breach occurs. This
              minimizes the scope of damage and helps you get back to normal
              operations almost immediately.
            </p>
          </div>

          

        </div>
      </div>
    </section>
  );
};

export default WebSolution;