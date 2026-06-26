import React from 'react'
import {
  FaRobot,
  FaSatelliteDish,
} from "react-icons/fa";
import { BsBoxes } from "react-icons/bs";

const services = [
  {
    icon: <FaRobot/>,
    title: "AI & Automation",
    description:
      "Streamline operations and decision-making through intelligent automation powered by AI and machine learning.",
  },
  {
    icon: <FaSatelliteDish/>,
    title: "IoT Integration",
    description:
      "Connect and control smart devices, collect valuable data, and optimize workflows through IoT solutions.",
  },
  {
    icon: <BsBoxes/>,
    title: "Blockchain Solutions",
    description:
      "Enhance trust, security, and transparency with decentralized blockchain technologies tailored to your needs.",
  },
];

const RelatedGenerationService = () => {
  return (
    <section className="bg-white pt-1 pb-20">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Heading
        <h3
          className="text-center text-[#0057c2] text-[18px] mb-12"
          data-aos="fade-up"
        >
          Related
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

export default RelatedGenerationService
