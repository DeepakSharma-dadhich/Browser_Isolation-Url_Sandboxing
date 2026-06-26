import React from "react";
import {
  FaDatabase,
  FaCloud,
  FaProjectDiagram,
} from "react-icons/fa";

const RelatedNetworkDesign = () => {
  return (
    <section className="bg-white pt-1 pb-16">
      <div className="max-w-[1300px] mx-auto px-6 lg:px-20">
        {/* Heading
        <h2 className="text-[32px] font-semibold text-center text-[#0c2340] mb-8">
          Related Cloud Solutions
        </h2> */}

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-8 text-center max-w-[380px] mx-auto hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
          >
            <FaDatabase className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Data Center Solutions
            </h3>

            <p className="text-gray-500 text-[14px] leading-6">
              Design, build, and manage scalable and secure data center
              infrastructure to support your IT operations.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-8 text-center max-w-[380px] mx-auto hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="150"
          >
            <FaCloud className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Cloud Infrastructure
            </h3>

            <p className="text-gray-500 text-[14px] leading-6">
              Enable agility and scalability with robust cloud infrastructure
              using AWS, Azure, or Google Cloud.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="bg-[#f3f5f8] rounded-2xl shadow-sm px-6 py-8 text-center max-w-[380px] mx-auto hover:shadow-md transition duration-300"
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-delay="300"
          >
            <FaProjectDiagram className="text-[#0057c2] text-4xl mx-auto mb-4" />

            <h3 className="text-[18px] font-medium text-[#0c2340] mb-3">
              Structured Cabling
            </h3>

            <p className="text-gray-500 text-[14px] leading-6">
              Professional cabling solutions to ensure fast and reliable
              connectivity across your organization.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RelatedNetworkDesign;
