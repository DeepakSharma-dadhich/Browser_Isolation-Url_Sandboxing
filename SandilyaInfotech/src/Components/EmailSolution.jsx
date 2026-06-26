import React from "react";
import emailImg from "../assets/email-security.png";

const EmailSolution = () => {
  return (
    <section className="bg-white py-16">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Email Security
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Safeguard your communication with our advanced email security
              solutions, including spam filtering, phishing protection,
              encryption, and secure email gateways.
            </p>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Email has emerged out as a significant part of the internet system
              in the present world. It is a convenient medium through which
              corporate sectors continually carry out their business
              communication and share important data. The ever-growing
              popularity has also enabled hackers to use email as an attack
              vector.
            </p>
          </div>

          {/* Right Image */}
          <div
            className="flex justify-center"
            data-aos="fade-left"
            data-aos-duration="700"
          >
            <img
              src={emailImg}
              alt="Email Security"
              className="w-full max-w-[650px] rounded-2xl shadow-lg object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmailSolution;
