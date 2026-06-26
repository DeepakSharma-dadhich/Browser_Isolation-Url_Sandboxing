import React from 'react'
import {
  FaDatabase,
  FaProjectDiagram,
  FaRobot,
  FaSyncAlt,
  FaCloud,
  FaCodeBranch,
} from "react-icons/fa";

const services = [
  {
    icon: <FaDatabase/>,
    title: "Data Integration",
    description:
      "Connect and unify data from multiple systems to provide consistent, real-time access across departments.",
  },
  {
    icon: <FaProjectDiagram/>,
    title: "Enterprise Application Integration",
    description:
      "Ensure seamless communication between critical enterprise applications to improve process efficiency.",
  },
  {
    icon: <FaRobot/>,
    title: "Process Automation",
    description:
      "Automate routine business workflows and reduce manual intervention using integration tools.",
  },
  {
    icon: <FaSyncAlt/>,
    title: "Legacy System Modernization",
    description:
      "Integrate legacy systems with new platforms to enhance performance and support modern operations.",
  },
  {
    icon: <FaCloud/>,
    title: "Cloud Integration",
    description:
      "Enable hybrid environments by integrating on-premise systems with cloud-based applications and services..",
  },
  {
    icon: <FaCodeBranch/>,
    title: "Custom API Integration",
    description:
      "Develop and connect APIs to create flexible, scalable connections between internal and external systems.",
  },
];


const RelatedIntegrationService = () => {
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

export default RelatedIntegrationService
