import React from "react";
import solution from "../assets/Solution.png";
import security from "../assets/Security.png";
import wifi from "../assets/Wifi.png";
import cisco from "../assets/Cisco.png";
import networking from "../assets/Networking.png";
import cabling from "../assets/Cabling.png";

const services = [
  {
    icon: solution,
    title: "Collaboration Solution",
    desc: "Collaboration describes the combination of communications and collaboration technologies. The modular elements of the Collaboration Architecture work together to deliver compelling collaboration experiences both within and among organizations.",
  },
  {
    icon: security,
    title: "Security",
    desc: "For businesses, most of the investment revolves around IT networks. Businesses use it for ordering, inventory and accounting. Security of IT network is very important. Virus, spyware, worm and ill-intentioned employee can cause a big loss.",
  },
  {
    icon: wifi,
    title: "Wireless",
    desc: "All the corporate today has the primordial necessity of wireless solutions and Proactive Data Solutions offers the ultimate wireless technology that enables everyone to get connected 'Anywhere and Anytime!'",
  },
  {
    icon: cisco,
    title: "Cisco Meraki",
    desc: "Cisco Meraki operates the industry's largest Cloud Networking services. It is the leader in managed wireless, switching & security solutions. The patented real-time communication protocols of Cisco Meraki enable administrators to manage networks from the cloud, without ever sacrificing control & responsiveness.",
  },
  {
    icon: networking,
    title: "Enterprise Networking",
    desc: "We offer reliable stability and flexibility in our networking solutions, which is coupled with delivering robust performance. We deliver simplistic solutions that are flexible. Sandilya delivers single, scalable and secure IP network and which can be customized based on the changing business needs.",
  },
  {
    icon: cabling,
    title: "Structured Cabling",
    desc: "Structured cabling solutions of Sandilya point towards the system of wiring used by organizations to facilitates easy transmission of data and information across various platforms. The effective cabling solutions allow for effective and easy transmission of video or voice information along with data transmission.",
  },
];

const OurSolutions = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-[1110px] mx-auto px-[15px]">
        {/* Heading */}
        <div className="text-center mb-20">
          <h2 className="text-[28px] md:text-[42px] font-semibold text-black">
            Our Solutions
          </h2>

          {/* Thin Blue Line */}
          <div className="w-[120px] h-[1px] bg-[#4564da] mx-auto mt-4 mb-7"></div>

          {/* <p className="max-w-[800px] mx-auto text-[#6f7684] text-[14px] leading-7 px-6 sm:px-12">
            Sed Fringilla Mauris Sit Amet Nibh. Donec Sodales Sagittis Magna.
            Sed Consequat, Leo Eget Bibendum Sodales, Augue Velit Cursus Nunc,
            Quis Gravida Magna Mi A Libero.
          </p> */}
        </div>

        {/* Services */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12">
          {services.map((item, index) => (
            <div key={index} className="flex items-start gap-4">
              {/* Icon */}
              <img
                src={item.icon}
                alt={item.title}
                className="w-[46px] h-[44px] object-contain mt-0"
              />

              {/* Content */}
              <div>
                <h3 className="text-[23px] font-medium text-black mb-3">
                  {item.title}
                </h3>

                <p className="text-[#6f7684] text-[15px] leading-7">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurSolutions;
