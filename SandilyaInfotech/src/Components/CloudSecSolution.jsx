import React from "react";
import cloudImg from "../assets/cloud-security.png";

const CloudSecSolution = () => {
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
              src={cloudImg}
              alt="Web Security"
              className="w-full max-w-[650px] rounded-2xl shadow-lg object-cover"
            />
          </div>

          {/* Right Content */}
          <div data-aos="fade-left" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Cloud Security
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Ensure the safety of your data in the cloud with our robust cloud
              security services including access controls, encryption, workload
              protection, and compliance monitoring for platforms like AWS,
              Azure, and Google Cloud.
            </p>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              The technology market world-wide is migrating to Cloud and running
              most of the important applications on cloud infrastructure. The
              cloud has become a regular part of life for all businesses;
              whether private or public. Studies show that by 2018, 31 percent
              of all data will be stored in public cloud servers and 69 percent
              will be in private cloud servers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CloudSecSolution;
