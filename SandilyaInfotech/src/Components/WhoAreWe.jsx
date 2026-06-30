import React from "react";
import whoWeAre from "../assets/WhoWeAre.png";

const WhoAreWe = () => {
  return (
    // Changed background utility to full clean white
    <section id="who-we-are" className="bg-white py-12 md:py-16">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-8 md:px-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="w-full text-left"
            data-aos="fade-right"
            data-aos-duration="700">
            <h2
              className="
              text-[30px]
              lg:text-[42px]
              font-sans
              font-bold
              text-[#3a3a3a]
              leading-[1.3]
              mb-3
            "
            >
              Who Are We
            </h2>

            {/* Primary theme blue border divider anchor line */}
            <div className="w-[100px] h-[4px] bg-[#0170b9] mb-6"></div>

            <p className="text-[#4b4f58] font-sans text-sm md:text-[14px] leading-[1.65] mb-4 text-justify">
              Sandilya Infotech is a preferred Solution provider of integrated
              information and communications technology (ICT) solutions,
              delivering secure, converged network computing and communications
              infrastructure and services. We provide the architecture,
              deployment, integration and management of networks and systems to
              deliver leading edge solutions that create value for our customers
              and meet their business needs now and into the future. Sandilya is
              a trusted provider of multi-vendor cloud solutions, data center
              management, wireless solutions, converged network and services
              operating in the most complex and challenging business
              environments. Our relationships with the industry's leading
              technology suppliers, combined with our business understanding
              enable you to invest with confidence.
            </p>

            <p className="text-[#4b4f58] font-sans text-sm md:text-[14px] leading-[1.65] text-justify">
              Sandilya helps customers do business better by leveraging our
              industry-wide experience, deep technology expertise, comprehensive
              portfolio of services and vertically aligned business model.
            </p>
          </div>

          {/* Right Image */}
          <div className="flex justify-center w-full"
            data-aos="fade-left"
            data-aos-duration="700">
            <img
              src={whoWeAre}
              alt="Who Are We"
              className="
                w-full
                max-w-[540px]
                h-auto
                max-h-[420px]
                object-cover
                rounded-lg
                shadow-md
              "
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhoAreWe;
