import React from "react";
import {
  FaRobot,
  FaLaptopCode,
  FaChartBar,
  FaMobileAlt,
  FaCloud,
} from "react-icons/fa";
import digitalImg from "../assets/digital-transformation.png";

const DigitalTransSolution = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Digital Transformation
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Digital transformation empowers businesses to stay competitive by
              integrating modern technologies into every aspect of operations.
              Our services help organizations streamline processes, enhance
              customer experiences, and unlock new opportunities for growth.
              By leveraging automation, advanced analytics, and cloud
              platforms, we enable you to achieve greater efficiency, agility,
              and scalability while ensuring long-term sustainability in an
              ever-evolving digital landscape.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaRobot className="text-[18px]" />
                <span>Business Process Automation</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaLaptopCode className="text-[18px]" />
                <span>AI & Machine Learning Integration</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaChartBar className="text-[18px]" />
                <span>Data-Driven Decision Making</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaMobileAlt className="text-[18px]" />
                <span>Mobile & Web Application Modernization</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCloud className="text-[18px]" />
                <span>Cloud-Based Infrastructure</span>
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
              src={digitalImg}
              alt="Digital Transformation"
              className="w-full max-w-[820px] rounded-3xl shadow-lg object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DigitalTransSolution;