import React from 'react'
import * as SliderImport from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import customers1 from "../assets/Customers1.png";
import customers2 from "../assets/Customers2.png";
import customers3 from "../assets/Customers3.png";
import customers4 from "../assets/Customers4.png";
import customers5 from "../assets/Customers5.png";
import customers6 from "../assets/Customers6.png";

const Slider = SliderImport.default?.default || SliderImport.default || SliderImport;

// Custom Left Arrow matching the exact look in the screenshot
const PrevArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute left-[-25px] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-light select-none cursor-pointer transition z-10 text-xl"
    style={{ fontFamily: "serif" }}
    aria-label="Previous slide"
  >
    &#10094;
  </button>
);

// Custom Right Arrow matching the exact look in the screenshot
const NextArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute right-[-25px] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-light select-none cursor-pointer transition z-10 text-xl"
    style={{ fontFamily: "serif" }}
    aria-label="Next slide"
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
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    prevArrow: <PrevArrow />, // Attach custom left arrow component
    nextArrow: <NextArrow />, // Attach custom right arrow component
    appendDots: (dots) => (
      <div style={{ bottom: "-45px" }}>
        <ul className="flex items-center justify-center gap-2 custom-dots-row"> {dots} </ul>
      </div>
    ),
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 4 }
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 2, arrows: false }
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1, arrows: false }
      }
    ]
  };

  return (
    <section className="bg-white py-20 overflow-hidden">
      <div className="max-w-[1140px] mx-auto px-10 relative">

        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-[28px] md:text-[42px] font-bold text-[#222222] tracking-wide font-sans">
            Our Customers
          </h2>
          <div className="w-[120px] h-[1px] bg-[#4564da] mx-auto mt-4 mb-7"></div>
        </div>

        {/* Logo Carousel Slider */}
        <div className="px-2">
          <Slider {...settings}>
            {customers.map((logo, index) => (
              <div key={index} className="px-4 outline-none select-none">
                <div className="flex items-center justify-center h-24">
                  <img
                    src={logo}
                    alt={`Customer logo ${index + 1}`}
                    className="max-w-full max-h-full object-contain pointer-events-none"
                  />
                </div>
              </div>
            ))}
          </Slider>
        </div>

      </div>

      {/* CSS overrides to create the exact active blue dot indicator array style */}
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
          background-color: #cbd5e1 !important; /* Light grayish-blue for inactive dots */
          transition: all 0.3s ease !important;
        }
        .custom-dots-row li button:before {
          display: none !important; /* Removes default thick library dots */
        }
        .custom-dots-row li.slick-active button {
          background-color: #0086df !important; /* Exact light blue for your active slide dot */
        }
      `}</style>
    </section>
  );
};

export default OurCustomers;
