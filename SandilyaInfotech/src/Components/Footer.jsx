import React from "react";
import { Link, useLocation } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#3a3a3a] text-[#b4b4b4] font-sans pt-20 relative">
      {/* Column Responsive Layout Grid */}
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 text-left items-start">
        {" "}
        {/* Brand Profile Info */}
        <div className="flex flex-col">
          <h3 className="text-white text-[15px] font-bold tracking-wider uppercase mb-5 font-sans">
            SANDILYA INFOTECH
          </h3>
          <p className="text-white text-[13.5px] leading-[1.65] mb-2 font-sans tracking-wide">
            Sandilya Infotech Pvt Ltd is a preferred Solution provider of
            integrated ICT solutions, delivering secure services to businesses.
          </p>

          {/* Social Icons Array */}
          <div className="flex items-center gap-2 mt-1">
            <a
              href="#facebook"
              className="w-[30px] h-[30px] bg-[#3b5998] hover:opacity-90 text-white flex items-center justify-center text-[13px] font-bold rounded-full transition"
            >
              f
            </a>

            <a
              href="#twitter"
              // className="w-[30px] h-[30px] bg-black hover:opacity-90 text-white flex items-center justify-center rounded-full transition"
              className="w-[30px] h-[30px] bg-[#3b5998] hover:opacity-90 text-white flex items-center justify-center rounded-full transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 fill-white"
              >
                <path d="M18.901 1H22.58l-8.04 9.19L24 23h-7.406l-5.8-7.584L4.15 23H.47l8.6-9.83L0 1h7.594l5.243 6.932L18.901 1Zm-1.293 19.79h2.04L6.486 3.104H4.297L17.608 20.79Z" />
              </svg>
            </a>

            <a
              href="#instagram"
              // className="w-[30px] h-[30px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-90 text-white flex items-center justify-center rounded-full transition"
              className="w-[30px] h-[30px] bg-gradient-to-tr from-[#3b5998] via-[#3b5998] to-[#3b5998] hover:opacity-90 text-white flex items-center justify-center rounded-full transition"
            >
              <svg
                className="w-3.5 h-3.5 fill-white mx-auto"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href="#linkedin"
              // className="w-[30px] h-[30px] bg-[#0077b5] hover:opacity-90 text-white flex items-center justify-center text-[12px] font-bold rounded-full transition"
              className="w-[30px] h-[30px] bg-[#3b5998] hover:opacity-90 text-white flex items-center justify-center text-[12px] font-bold rounded-full transition"
            >
              in
            </a>
          </div>
        </div>
        <div className="pl-0 lg:pl-4">
          <h3 className="text-white text-[15px] font-semibold tracking-wide mb-5 font-sans">
            Important Links
          </h3>
          <ul className="space-y-5 text-[13.5px] text-white">
            {[
              { name: "Home", path: "/" },
              { name: "About US", path: "/About" },
              { name: "Services", path: "/Services" },
              { name: "Solutions", path: "/Solutions" },
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 font-sans">
                <span className="text-[10px] text-white font-bold select-none">
                  &#10095;
                </span>

                <Link
                  to={item.path}
                  className="hover:underline transition-colors"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-white text-[15px] font-semibold tracking-wide mb-5 font-sans">
            Contact Details
          </h3>
          <ul className="space-y-[22px] text-[13.5px] text-white font-sans">
            {/* Address Element  */}
            <li className="flex items-start gap-3.5">
              <div className="w-[14px] h-[14px] mt-1 flex-shrink-0 text-white flex items-center justify-center">
                <svg
                  className="w-full h-full fill-current"
                  viewBox="0 0 384 512"
                  xmlns="http://w3.org"
                >
                  <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z" />
                </svg>
              </div>
              <span className="leading-[1.4] tracking-wide">
                505-506, 5th Floor, Devika Tower,
                <br />
                Chander Nagar, Ghaziabad, U.P. 201011, India
              </span>
            </li>

            {/* Email Element  */}
            <li className="flex items-center gap-3.5">
              <div className="w-[14px] h-[14px] flex-shrink-0 text-white flex items-center justify-center">
                <svg
                  className="w-full h-full fill-current"
                  viewBox="0 0 512 512"
                  xmlns="http://w3.org"
                >
                  <path d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c23.2.4 56.6-29.2 73.4-41.4 132.7-96.3 142.8-104.7 173.4-128.7 5.8-4.5 9.2-11.5 9.2-18.9v-19c0-26.5-21.5-48-48-48H48C21.5 64 0 85.5 0 112v19c0 7.4 3.4 14.3 9.2 18.9 30.6 23.9 40.7 32.4 173.4 128.7 16.8 12.2 50.2 41.8 73.4 41.4z" />
                </svg>
              </div>
              <a
                href="mailto:awanish@sandilyainfotech.com"
                className="hover:underline tracking-wide"
              >
                awanish@sandilyainfotech.com
              </a>
            </li>

            {/* Phone Element  */}
            <li className="flex items-center gap-3.5">
              <div className="w-[14px] h-[14px] flex-shrink-0 text-white flex items-center justify-center">
                <svg
                  className="w-full h-full fill-current"
                  viewBox="0 0 512 512"
                  xmlns="http://w3.org"
                >
                  <path d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.1l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.1 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6zM416 128a64 64 0 0 1 64 64h32a96 96 0 0 0-96-96zm0-64a128 128 0 0 1 128 128h32A160 160 0 0 0 416 32z" />
                </svg>
              </div>
              <span className="tracking-wide">9310281314</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-white text-[15px] font-semibold tracking-wide mb-5 font-sans">
            Get In Touch
          </h3>

          <p className="space-y-[22px] text-[13.5px] text-white font-sans">
            Looking for secure ICT solutions or IT consulting? Our team is ready
            to help you transform your business with innovative technology
            solutions.
          </p>

          <div>
            {/* <a
      href="mailto:awanish@sandilyainfotech.com"
      className="flex items-center gap-3 bg-[#4a4a4a] hover:bg-[#2e6cee] transition-all duration-300 rounded-lg px-4 py-3 text-white"
    >
      <span className="text-lg">📧</span>
      <span>Email Us</span>
    </a> */}

            {/* <a
      href="tel:+919310281314"
      className="flex items-center gap-3 bg-[#4a4a4a] hover:bg-[#16a34a] transition-all duration-300 rounded-lg px-4 py-3 text-white"
    >
      <span className="text-lg">📞</span>
      <span>Call Us</span>
    </a> */}

            <Link
  to="/contact"
  onClick={(e) => {
    if (location.pathname === "/contact") {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }}
  className="inline-flex items-center justify-center border border-[#2e6cee] text-[#2e6cee] bg-transparent hover:bg-[#2e6cee] hover:text-white font-medium rounded-full px-6 py-2 mt-5 transition-all duration-300"
>
  Contact Us
</Link>
          </div>
        </div>
      </div>

      {/* Absolute Bottom Copyright Panel Tray */}
      <div className="border-t border-neutral-600/30 bg-[#2d2d2d] py-6">
        <div className="max-w-[1240px] mx-auto px-6 text-center">
          <p className="text-[12.5px] text-white tracking-wide font-sans">
            Copyright &copy; 2026 Sandilya Infotech Pvt. Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
