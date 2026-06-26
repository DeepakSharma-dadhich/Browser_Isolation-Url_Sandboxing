import React from 'react'
import {
  FaVideo,
  FaShieldAlt,
  FaMobileAlt,
} from "react-icons/fa";

const services = [
  {
    icon: <FaVideo/>,
    title: "Video Analytics",
    description:
      "Advanced algorithms to analyze video feeds for enhanced security and operational insights.",
  },
  {
    icon: <FaShieldAlt/>,
    title: "Cyber Security",
    description:
      "Protect your digital assets with cutting-edge cybersecurity solutions tailored to your needs.",
  },
  {
    icon: <FaMobileAlt/>,
    title: "Mobile Surveillance",
    description:
      "Monitor your premises on the go with mobile-friendly surveillance systems.",
  },
];
const RelatedCompSurveillanceService = () => {
  return (
    <section className="bg-white pt-1 pb-20">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Heading
        <h3
          className="text-center text-[#0057c2] text-[18px] mb-12"
          data-aos="fade-up"
        >
          We aim at providing a comprehensive suite that includes the following
          services
        </h3> */}

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[920px] mx-auto">
          {services.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-md px-6 py-8 text-center shadow-sm hover:shadow-md transition duration-300"
              data-aos="zoom-in"
              data-aos-delay={index * 100}
            >
              <div className="text-[#0057c2] text-4xl flex justify-center mb-5">
                {item.icon}
              </div>

              <h4 className="text-[#0057c2] text-[18px] font-medium leading-7 mb-3">
                {item.title}
              </h4>

              <p className="text-gray-500 text-sm leading-6">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedCompSurveillanceService
