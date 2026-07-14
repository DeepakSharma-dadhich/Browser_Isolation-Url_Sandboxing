import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import enterpriseImg from "../assets/enterprise-networking.png";

const EnterpriseNetSolution = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div data-aos="fade-right" data-aos-duration="700">
            <h2 className="text-[32px] lg:text-[px] font-medium text-[#0057c2] mb-4">
              Enterprise Networking Solution
            </h2>

            <p className="text-gray-600 text-[16px] text-justify mb-6">
              Networking Solutions are highly mandatory for success of any
              organization. At Sandilya Infotech Pvt Ltd we offer reliable
              stability and flexibility in our networking solutions; which is
              coupled with delivering robust performance. We deliver simplistic
              solutions that are flexible and can be moulded in accordance to
              client requirements. Sandilya Infotech Pvt Ltd delivers single,
              scalable and secure IP network which can be customized based on
              the changing business needs. Sandilya Infotech Pvt Ltd understands
              your business needs and provides you with best tailored solutions
              to meet the unique needs of your business. The networking
              solutions provided by us are highly scalable and will match the
              growing needs of your business. Sandilya Infotech Pvt Ltd have
              been helping their customers to realize the business benefits of
              networking through increasing productivity and business
              flexibility and reducing operational costs.
            </p>

            {/* Features */}
            <div>
              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>High-speed, reliable network architecture</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>Secure access across devices and locations</span>
              </div>

              <div className="flex items-center gap-3 text-[#0057c2] text-[16px]">
                <FaCheckCircle className="shrink-0 text-[18px]" />
                <span>Scalability for future business growth</span>
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
              src={enterpriseImg}
              alt="Enterprise Networking"
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

export default EnterpriseNetSolution;
