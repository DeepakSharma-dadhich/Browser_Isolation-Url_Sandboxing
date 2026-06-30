import React from "react";
import * as SliderImport from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import customers1 from "../assets/cisco1.png";
import customers2 from "../assets/hp2.png";
import customers3 from "../assets/samsung3.png";
import customers4 from "../assets/checkpoint4.png";
import customers5 from "../assets/ibm5.png";
import customers6 from "../assets/paloaltonetworks6.png";
import customers7 from "../assets/qnu7.png";
import customers8 from "../assets/prostarm8.png";
import customers9 from "../assets/seceon9.png";

const Slider = SliderImport.default?.default || SliderImport.default || SliderImport;

// Left Arrow
const PrevArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute left-[-25px] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-light cursor-pointer transition z-10 text-xl"
    style={{ fontFamily: "serif" }}
    aria-label="Previous"
  >
    &#10094;
  </button>
);

// Right Arrow
const NextArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute right-[-25px] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-light cursor-pointer transition z-10 text-xl"
    style={{ fontFamily: "serif" }}
    aria-label="Next"
  >
    &#10095;
  </button>
);

const OurCustomers = () => {
  const customers = [
    customers1,
    customers2,
    customers3,
    customers4,
    customers5,
    customers6,
    customers7,
    customers8,
    customers9,
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    appendDots: (dots) => (
      <div style={{ bottom: "-45px" }}>
        <ul className="flex items-center justify-center gap-2 custom-dots-row">
          {dots}
        </ul>
      </div>
    ),
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          arrows: false,
        },
      },
    ],
  };

  return (
    <section className="bg-white py-20 overflow-hidden">
      <div className="max-w-[1140px] mx-auto px-10 relative">

        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-[28px] md:text-[42px] font-bold text-[#222222] tracking-wide font-sans">
            Our Partners
          </h2>

          <div className="w-[120px] h-[1px] bg-[#4564da] mx-auto mt-4 mb-7"></div>
        </div>

        {/* Slider */}
        <div className="px-2">
          <Slider {...settings}>
            {customers.map((logo, index) => (
              <div key={index} className="px-3 outline-none select-none">
                <div className="flex items-center justify-center h-[110px] bg-white rounded-lg">

                  <img
                    src={logo}
                    alt={`Customer ${index + 1}`}
                    className="w-[150px] h-[75px] object-contain transition-transform duration-300 hover:scale-105"
                    draggable={false}
                  />

                </div>
              </div>
            ))}
          </Slider>
        </div>

      </div>

      <style>{`
        .custom-dots-row li {
          margin: 0 !important;
          width: auto !important;
          height: auto !important;
        }

        .custom-dots-row li button {
          width: 6px !important;
          height: 6px !important;
          padding: 0 !important;
          border-radius: 50% !important;
          background: #cbd5e1 !important;
          transition: all .3s ease;
        }

        .custom-dots-row li button:before {
          display: none !important;
        }

        .custom-dots-row li.slick-active button {
          background: #0086df !important;
        }
      `}</style>
    </section>
  );
};

export default OurCustomers;