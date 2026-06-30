import React from "react";
import SliderImport from "react-slick";
import banner1 from "../assets/NewImage.png";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Link } from 'react-router-dom';

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
    <section className="overflow-hidden bg-white w-full">
      <Slider {...settings}>
        <div>
          <div
            className="w-full h-[760px] relative"
            style={{
              backgroundImage: `url(${banner1})`,
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-[#031b4e]/55"></div>

            {/* Content */}
            <div className="max-w-[1400px] mx-auto h-full px-6 sm:px-12 md:px-20 relative z-10">
              <div className="flex items-center h-full">
                <div className="max-w-[620px] text-left">
                  <p className="uppercase tracking-[4px] text-cyan-300 text-sm font-semibold mb-5 font-sans">
                    MANAGE YOUR BUSINESS SERVICE WITH
                  </p>

                  <h1
                    className="
                      text-white
                      text-4xl
                      sm:text-5xl
                      md:text-6xl
                      font-black
                      leading-tight
                      mb-6
                      font-sans
                    "
                  >
                    SANDILYA INFOTECH
                  </h1>

                  <p className="text-gray-200 text-lg leading-8 mb-10 font-sans">
                    Find the right solution for your business.
                  </p>
                  <Link to="/about">
                  <button
                    className="
                      bg-[#00bcd4]
                      rounded-full
                      px-8
                      py-3
                      text-sm
                      font-bold
                      tracking-[2px]
                      text-white
                      uppercase
                      font-sans
                      hover:bg-[#0097a7]
                      active:scale-95
                      transition-all
                      duration-300
                    "
                  >
                    More Info
                  </button>
                  </Link>
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