import React from 'react'
// import { FaCheckCircle } from "react-icons/fa";
import { IoCheckmark } from "react-icons/io5";
import emergingtechnologyImg from "../assets/emergingtechnology-image.png";

const GenerationService = () => {
  return (
    <section className="bg-white py-20">
          <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              {/* Left Content */}
              <div data-aos="fade-right" data-aos-duration="700">
                <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
                  Next Generation Solutions
                </h2>
    
                <p className="text-gray-600 text-[16px] text-justify mb-6">
                  Embrace the future with cutting-edge technologies that drive innovation and transform your operations. Our next-gen solutions integrate AI, IoT, and blockchain to help you stay ahead in a competitive digital world.
                </p>
    
                {/* Features */}
                <div>
                  <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                    <IoCheckmark className="shrink-0 text-[18px]" />
                    <span>AI-powered automation for smart decision-making</span>
                  </div>
    
                  <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                    <IoCheckmark className="shrink-0 text-[18px]" />
                    <span>IoT connectivity for smarter devices and environments</span>
                  </div>
    
                  <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                    <IoCheckmark className="shrink-0 text-[18px]" />
                    <span>Blockchain for secure and transparent transactions</span>
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
                  src={emergingtechnologyImg}
                  alt="Next Generation Solutions"
                  className="
                        w-full
                        max-w-[560px]
                        rounded-2xl
                        shadow-lg
                        object-cover
                      "
                />
              </div>
            </div>
          </div>
        </section>
  );
};

export default GenerationService
