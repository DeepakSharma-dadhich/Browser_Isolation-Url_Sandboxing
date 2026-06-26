import React from "react";
import SliderImport from "react-slick";
import banner1 from "../assets/Hero1.png";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Slider = SliderImport.default || SliderImport;

const Hero = () => {
  const settings = {
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 5000,
    speed: 1000,
    fade: true,
    arrows: false,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  return (
    <section className="overflow-hidden bg-white w-full pb-19">
      <Slider {...settings}>
        <div>
          <div
            className="w-full h-[780px] relative"
            style={{
              backgroundImage: `url(${banner1})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-white/5"></div>

            {/* Content */}
            <div className="max-w-[1400px] mx-auto h-full px-6 sm:px-12 md:px-20 relative z-10">
              <div className="flex items-center h-full">
                <div className="max-w-xl text-left">

                  <p className="uppercase tracking-[3px] text-slate-800 text-[11px] md:text-xs font-bold mb-4 font-sans">
                    MANAGE YOUR BUSINESS SERVICE WITH
                  </p>

                  <h1
                    className="
                      text-slate-800
                      text-3xl
                      sm:text-4xl
                      md:text-5xl
                      font-black
                      leading-none
                      mb-5
                      tracking-wide
                      font-sans
                    "
                  >
                    SANDILYA INFOTECH
                  </h1>

                  <p className="text-[#1e293b] text-[11px] md:text-xs font-semibold tracking-wider mb-8 uppercase font-sans">
                    Find the right solution for your business.
                  </p>

                  <button
                    className="
                      bg-[#0097a7]
                      border border-slate-700
                      rounded-full
                      px-8
                      py-2.5
                      text-[11px]
                      font-bold
                      tracking-[2px]
                      text-slate-700
                      uppercase
                      font-sans
                      hover:bg-slate-800
                      hover:text-white
                      hover:border-slate-800
                      active:scale-95
                      transition-all
                      duration-300
                    "
                  >
                    More Info
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </Slider>
    </section>
  );
};

export default Hero;