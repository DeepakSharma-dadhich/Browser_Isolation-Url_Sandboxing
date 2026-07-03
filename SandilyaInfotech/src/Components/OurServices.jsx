import React from "react";
import { Link } from "react-router-dom";
import {
  FaSitemap,
  FaShieldAlt,
  FaLaptopCode,
  FaCloud,
  FaHeadset,
  FaCogs,
  FaTools,
  FaProjectDiagram,
} from "react-icons/fa";

const services = [
  {
    icon: <FaSitemap />,
    title: "System Integration",
    desc: "End-to-end planning and management of IT infrastructure.",
    link: "/integration-service",
  },
  {
    icon: <FaProjectDiagram />,
    title: "Networking Solutions",
    desc: "Design and implementation of high-performance networks.",
    link: "/infrastructure-service",
  },
  {
    icon: <FaShieldAlt />,
    title: "Cybersecurity",
    desc: "Threat prevention, detection, and response for robust security.",
    link: "/surveillance-service",
  },
  {
    icon: <FaLaptopCode />,
    title: "IT Asset Management",
    desc: "Procurement, lifecycle tracking, and support services.",
    link: "/consulting-service",
  },
  {
    icon: <FaCloud />,
    title: "Cloud & Digital Transformation",
    desc: "Cloud migration and modern business transformation services.",
    link: "/emerging-service",
  },
  {
    icon: <FaHeadset />,
    title: "24/7 Support Services",
    desc: "Always-on IT support for uninterrupted business operations.",
    link: "/consulting-service",
  },
  {
    icon: <FaCogs />,
    title: "Solution Design & Deployment",
    desc: "Custom IT solutions tailored for your business goals.",
    link: "/solutiondesign-service",
  },
  {
    icon: <FaTools />,
    title: "Managed Services",
    desc: "End-to-end monitoring, maintenance, and IT support.",
    link: "/managed-service",
  },
];

const OurServices = ({ showHeading = true }) => {
  return (
    <section className="bg-[#f5f7fb] py-20">
      {/* <div className="max-w-[1600px] mx-auto px-16 md:px-20 lg:px-32"> */}
      <div className="container mx-auto px-8 md:px-12 lg:px-20">
        {showHeading && (
          <div className="text-center mb-20">
            <h2 className="text-[28px] md:text-[42px] font-semibold text-black">
              Our Services
            </h2>

            {/* Thin Blue Line */}
            <div className="w-[120px] h-[1px] bg-[#4564da] mx-auto mt-4 mb-7"></div>
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="group bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-[#0057c2] transition-all duration-300 cursor-pointer"
            >
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-gray-50 rounded-md group-hover:scale-110 transition-transform duration-300">
                <span className="text-[#0057c2] text-3xl">{service.icon}</span>
              </div>

              {/* Title */}
              <h3 className="text-[18px] font-medium text-[#0c2340] mb-3 group-hover:text-[#0057c2] transition-colors duration-300">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-gray-500 text-[14px] leading-6 mb-5">
                {service.desc}
              </p>

              {/* Button */}
              <Link to={service.link}
  onClick={() =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }>
                <button className="border border-[#0057c2] text-[#0057c2] px-5 py-2 rounded-full text-sm font-medium hover:bg-[#0057c2] hover:text-white transition-all duration-300">
                  Learn More
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurServices;
