import React from "react";
import {
  FaProjectDiagram,
  FaRandom,
  FaChartLine,
  FaShieldAlt,
  FaWifi,
  FaPhoneAlt,
  FaServer,
  FaSearch,
  FaExchangeAlt,
} from "react-icons/fa";

const services = [
  {
    icon: <FaProjectDiagram />,
    title: "Network Planning, Design, Implementation",
    description:
      "Comprehensive services to plan, deploy, and manage enterprise-grade network infrastructures.",
  },
  {
    icon: <FaRandom />,
    title: "Campus Switching & Routing",
    description:
      "Seamless routing of voice, video, and data across your campus network with high-speed switching.",
  },
  {
    icon: <FaChartLine />,
    title: "WAN Traffic Audit & Monitoring",
    description:
      "Real-time traffic analysis, shaping, and optimization to ensure efficient WAN performance.",
  },
  {
    icon: <FaShieldAlt />,
    title: "VPN & Network Security",
    description:
      "End-to-end secure connectivity with robust VPN and network security solutions.",
  },
  {
    icon: <FaWifi />,
    title: "Wireless LAN Solutions",
    description:
      "Reliable and secure wireless solutions for seamless connectivity throughout your workspace.",
  },
  {
    icon: <FaPhoneAlt />,
    title: "IP Telephony",
    description:
      "Modern voice communication systems that integrate seamlessly with your network.",
  },
  {
    icon: <FaServer />,
    title: "Content Management & Load Balancing",
    description:
      "Third-party solutions for effective content management and balanced traffic distribution.",
  },
  {
    icon: <FaSearch />,
    title: "LAN Infra Audit & Analysis",
    description:
      "Audit and evaluation of LAN infrastructure to ensure maximum performance and reliability.",
  },
  {
    icon: <FaExchangeAlt />,
    title: "Media Conversion (UTP to Fiber)",
    description:
      "Advanced conversion tech for UTP to Fiber conversion for higher bandwidth support to enhance data transmission.",
  },
];

const WeAimSolution = () => {
  return (
    <section className="bg-white pt-1 pb-20">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Heading */}
        <h3
          className="text-center text-[#0057c2] text-[18px] mb-12"
          data-aos="fade-up"
        >
          We aim at providing a comprehensive suite that includes the following
          services
        </h3>

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

export default WeAimSolution;