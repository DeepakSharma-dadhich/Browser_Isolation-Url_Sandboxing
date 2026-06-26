import React from 'react'
import client from "../assets/Client.jpg";

const WhatClientsSay = () => {
  const testimonials = [
    {
      id: 1,
      text: "Nam at congue diam. Etiam erat lectus, finibus eget commodo quis, tincidunt eget leo. Nullam quis vulputate orci, ac accumsan quam. Morbi fringilla congue libero, ac malesuada vulputate pharetra.",
      name: "John Doe",
      role: "DESIGNER",
      image: client
    },
    {
      id: 2,
      text: "Nam at congue diam. Etiam erat lectus, finibus eget commodo quis, tincidunt eget leo. Nullam quis vulputate orci, ac accumsan quam. Morbi fringilla congue libero, ac malesuada vulputate pharetra.",
      name: "John Doe",
      role: "DESIGNER",
      image: client
    }
  ];

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8">
        
        {/* Section Heading */}
        <div className="text-center mb-16">
          <h2 className="text-[28px] md:text-[42px] font-bold text-[#222222] tracking-wide font-sans">
            What clients say
          </h2>
          <div className="w-[120px] h-[1px] bg-[#4564da] mx-auto mt-4 mb-7"></div>
        </div>

        {/* Testimonials Responsive Grid Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {testimonials.map((item) => (
            <div 
              key={item.id}
              className="
                bg-white 
                border border-[#eeeeee]
                rounded-[5px]
                px-8 sm:px-12 
                pt-10 pb-8
                text-center
                shadow-[0_10px_30px_rgba(0,0,0,0.3)]
              "
            >
              {/* Set text color to a lighter soft gray, reduced size, and increased height parameter line pacing */}
              <p className="text-[#7a7a7a] text-[14px] leading-[1.9] font-normal font-sans mb-9 tracking-normal">
                {item.text}
              </p>

              {/* Centered Avatar Frame Element */}
              <div className="flex justify-center mb-4">
                <div className="w-[60px] h-[60px] rounded-full overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h3 className="text-[#222222] text-[29px] font-bold font-sans tracking-wide mb-0">
                {item.name}
              </h3>
              <p className="text-[#999999] text-[13px] font-medium tracking-[2.5px] font-sans uppercase">
                {item.role}
              </p>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhatClientsSay;
