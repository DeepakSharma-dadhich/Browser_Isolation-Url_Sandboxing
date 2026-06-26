import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import faqImg from "../assets/faq.png";

const faqData = [
  {
    question: "What types of networking solutions do you provide?",
    answer:
      "We offer a full range of networking services including LAN/WAN setup, wireless solutions, firewall and security integration, VPN configuration, and enterprise network infrastructure design and management.",
  },
  {
    question: "How can your team help improve my existing network performance?",
    answer:
      "Our certified engineers perform detailed network assessments to identify bottlenecks, security vulnerabilities, and performance issues. Based on the findings, we optimize your network for speed, reliability, and scalability.",
  },
  {
    question: "Do you provide ongoing support and maintenance for networking systems?",
    answer:
      "Yes, we offer flexible maintenance contracts, 24/7 monitoring, and remote/on-site support to ensure your network remains secure, efficient, and up to date with the latest standards.",
  },
  {
    question: "What industries do you serve?",
    answer:
      "We cater to diverse industries including education, healthcare, IT, finance, government, and manufacturing. Our solutions are tailored to meet the specific needs of each sector for maximum efficiency and growth.",
  },
  {
    question: "Why should we choose your company as our IT partner?",
    answer:
      "Eden Techflow stands out for its customer-first approach, certified experts, and cost-effective solutions. We provide scalable, secure, and innovative IT services designed to help businesses grow and stay competitive in the digital era.",
  },
];

const FAQs = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-8 md:px-14 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side */}
          <div
            data-aos="fade-right"
            data-aos-duration="700"
          >
            <p className="text-blue-600 text-lg mb-3">
              Some Important FAQs
            </p>

            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-10">
              Common Questions
            </h2>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {faqData.map((faq, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 last:border-b-0"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className={`w-full flex items-center justify-between px-4 py-4 text-left transition-all duration-300 ${
                      activeIndex === index
                        ? "bg-blue-500 text-white"
                        : "bg-white text-blue-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-base md:text-lg font-medium max-w-[85%] leading-7">
                      Q: {faq.question}
                    </span>

                    {activeIndex === index ? (
                      <FiChevronUp size={22} />
                    ) : (
                      <FiChevronDown size={22} />
                    )}
                  </button>

                  {activeIndex === index && (
                    <div className="px-4 py-4 bg-white text-gray-600 leading-7 text-sm md:text-base">
                      <span className="font-semibold">A: </span>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Side */}
          <div
            className="flex justify-center w-full"
            data-aos="fade-left"
            data-aos-duration="700"
          >
            <img
              src={faqImg}
              alt="FAQ"
              className="w-full max-w-xl object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQs;