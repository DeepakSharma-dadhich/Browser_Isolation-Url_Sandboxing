import React from "react";
import { FaHandshake, FaLightbulb, FaBullseye } from "react-icons/fa";

const cards = [
  {
    icon: <FaHandshake />,
    title: "Our Mission",
    description:
      "Our mission is to provide world-class networking and information technology products and services, and continuously develop and strengthen our expertise.",
  },
  {
    icon: <FaLightbulb />,
    title: "Our Vision",
    description:
      "We aspire to become a preferred IT system integrator by delivering innovative and customer-focused solutions with excellence.",
  },
  {
    icon: <FaBullseye />,
    title: "Our Values",
    description:
      "We are committed to honesty, transparency, innovation, and excellence in every engagement with our clients and partners.",
  },
];

const OurVision = () => {
  return (
    <section className="bg-slate-100 py-20">
        <div className="container mx-auto px-8 md:px-12 lg:px-16">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-700 mb-6">
            Our Mission, Vision & Values
          </h2>

          <p className="max-w-3xl mx-auto text-gray-600 text-base md:text-lg leading-8">
            We strive to deliver innovative technology solutions and become a
            trusted partner for organizations by understanding their business
            needs and helping them achieve sustainable growth.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <div
              key={index}
              className="
                relative
                bg-white
                rounded-3xl
                px-8
                pt-20
                pb-8
                shadow-md
                hover:shadow-2xl
                transition-all
                duration-300
                hover:-translate-y-2
                min-h-[340px]
              "
            >
              {/* Icon Box */}
              <div className="absolute -top-8 left-8 w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center shadow-sm">
                <div className="text-4xl text-blue-700">
                  {card.icon}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-3xl font-semibold text-slate-900 mb-6">
                {card.title}
              </h3>

              <p className="text-gray-600 text-lg leading-8">
                {card.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default OurVision;