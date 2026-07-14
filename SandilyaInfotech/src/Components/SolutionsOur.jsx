import React from "react";
import CollaborationSol from "../assets/CollaborationSol.png";
import Security2 from "../assets/security2.png";
import Wireless from "../assets/wireless.png";
import CiscoMeraki from "../assets/ciscomeraki.png";
import StructuredCabling from "../assets/SCaabling.png";
import EnterpriseNetworking from "../assets/ENetworking.png";
import DigitalTransformation from "../assets/digital-transformation.png";
import DisasterRecovery from "../assets/disaster-recovery.png";
import { Link } from "react-router-dom";

import {
  FaUsers,
  FaShieldAlt,
  FaWifi,
  FaCloud,
  FaNetworkWired,
  FaExchangeAlt,
  FaSyncAlt,
  FaDatabase,
} from "react-icons/fa";

const solutions = [
  {
    image: CollaborationSol,
    title: "Collaboration Solution",
    description:
      "Collaboration describes the combination of communications and collaboration technologies. The modular elements of the Collaboration Architecture work together to deliver compelling collaboration experiences both within and among organizations.",
    icon: <FaUsers />,
    link: "/enterprise-solution",
  },
  {
    image: Security2,
    title: "Security",
    description:
      "In companies where the network is essential, special attention must be given to security to prevent virus attacks, unauthorized access, and data theft. Robust security measures not only protect sensitive information but also ensure business continuity and build trust with clients.",
    icon: <FaShieldAlt />,
    link: "/cybersecurity-solution",
  },
  {
    image: Wireless,
    title: "Wireless",
    description:
      "All corporates have a fundamental need for wireless solutions, and provides cutting-edge wireless technology to ensure seamless connectivity and enhanced productivity.",
    icon: <FaWifi />,
    link: "/enterprise-solution",
  },
  {
    image: CiscoMeraki,
    title: "Cisco Meraki",
    description:
      "Cisco Meraki operates the industry’s largest Cloud Networking services. It is the leader in managed wireless, switching & security solutions.",
    icon: <FaCloud />,
    link: "/cloud-solution",
  },
  {
    image: StructuredCabling,
    title: "Structured Cabling",
    description:
      "Structured cabling solutions of Proactive point towards the system of wiring used by organizations to facilitate easy transmission of data and information.",
    icon: <FaNetworkWired />,
    link: "/managed-solution",
  },
  {
    image: EnterpriseNetworking,
    title: "Enterprise Networking",
    description:
      "Networking Solutions are highly mandatory for success of any organization. We offer reliable stability and flexibility.",
    icon: <FaExchangeAlt />,
    link: "/enterprise-solution",
  },
  {
    image: DigitalTransformation,
    title: "Digital Transformation",
    description:
      "We offer reliable and flexible digital solutions for businesses aiming to modernize and stay ahead in the competitive digital era.",
    icon: <FaSyncAlt />,
    link: "/digital-solution",
  },
  {
    image: DisasterRecovery,
    title: "Disaster Recovery",
    description:
      "We provide reliable disaster recovery solutions to ensure your critical data is protected and restored in case of unexpected failures.",
    icon: <FaDatabase />,
    link: "/disaster-solution",
  },
];

const SolutionsOur = ({ showHeading = true }) => {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-8 md:px-12 lg:px-20">
        {showHeading && (
          <div className="text-center mb-20">
            <h2 className="text-[28px] md:text-[42px] font-semibold text-black">
              Our Solutions
            </h2>

            {/* Thin Blue Line */}
            <div className="w-[120px] h-[1px] bg-[#4564da] mx-auto mt-4 mb-7"></div>
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {solutions.map((item, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition duration-300"
            >
              {/* Image */}
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-44 w-full object-cover"
                />

                <div className="absolute bottom-0 right-4 translate-y-1/2 w-12 h-12 rounded-xl bg-white shadow flex items-center justify-center text-blue-700 text-lg">
                  {item.icon}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  {item.title}
                </h3>

                <p className="text-gray-600 leading-7 text-sm text-left">
                  {item.description}
                </p>
                <Link to={item.link} className="mt-2 flex justify-center">
                  <button className="border border-[#0057c2] text-[#0057c2] px-5 py-2 rounded-full text-sm font-medium hover:bg-[#0057c2] hover:text-white transition-all duration-300">
                    Learn More
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsOur;
