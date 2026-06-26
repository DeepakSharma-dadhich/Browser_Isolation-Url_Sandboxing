import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { HiMenuAlt1, HiX } from "react-icons/hi";
import ResponsiveMenu from "./ResponsiveMenu";
import logo from "../../assets/logo.png";

const Navbar = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const lastScrollY = useRef(0);

  const toggleMenu = () => {
    setShowMenu((prev) => !prev);
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = showMenu ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showMenu]);

  // Navbar scroll behavior
  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      setIsScrolled(currentScrollY > 10);

      if (!showMenu) {
        if (currentScrollY <= 20) {
          setIsVisible(true);
        } else if (currentScrollY > lastScrollY.current) {
          // Scrolling down
          setIsVisible(true);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", controlNavbar);

    return () => {
      window.removeEventListener("scroll", controlNavbar);
    };
  }, [showMenu]);

  const linkStyle = ({ isActive }) =>
    `relative text-[15px] font-medium tracking-[0.4px] transition-all duration-300 after:absolute after:left-0 after:-bottom-2 after:h-[2px] after:bg-[#00aeef] after:transition-all after:duration-300 ${
      isActive
        ? "text-[#00aeef] after:w-full"
        : "text-[#3b4358] hover:text-[#00aeef] after:w-0 hover:after:w-full"
    }`;

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        } ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-[#ececec]]"
            : "bg-white"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-[80px] flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img
              src={logo}
              alt="Sandilya Infotech"
              className="h-[60px] lg:h-[70px] w-auto object-contain"
            />
          </Link>
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center">
            <nav>
              <ul className="flex items-center gap-10 xl:gap-14">
                {/* Home */}
                <li>
                  <NavLink to="/" className={linkStyle}>
                    Home
                  </NavLink>
                </li>

                {/* About */}
                <li>
                  <NavLink to="/about" className={linkStyle}>
                    About
                  </NavLink>
                </li>

                {/* Service Dropdown */}
                <li className="relative group">
                  <NavLink to="/services" className={linkStyle}>
                    Services ▼
                  </NavLink>

                  <div
                    className="
          absolute left-1/2 -translate-x-1/2 top-full mt-4
          w-[260px]
          bg-white
          border border-gray-200
          shadow-lg
          opacity-0 invisible
          group-hover:opacity-100
          group-hover:visible
          transition-all duration-300
          z-50
        "
                  >
                    <ul className="text-[#3b4358] text-[18px]">
                      <li className="border-b border-gray-200">
                        <Link
                          to="/infrastructure-service"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Infrastructure
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/integration-service"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Integration
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/surveillance-service"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Surveillance
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/emerging-service"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Emerging Technology
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/consulting-service"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Consulting
                        </Link>
                      </li>
                    </ul>
                  </div>
                </li>

                {/* Solutions Dropdown */}
                <li className="relative group">
                  <NavLink to="/solutions" className={linkStyle}>
                    Solutions ▼
                  </NavLink>

                  <div
                    className="
          absolute left-1/2 -translate-x-1/2 top-full mt-4
          w-[260px]
          bg-white
          border border-gray-200
          shadow-lg
          opacity-0 invisible
          group-hover:opacity-100
          group-hover:visible
          transition-all duration-300
          z-50
        "
                  >
                    <ul className="text-[#3b4358] text-[18px]">
                      <li className="border-b border-gray-200">
                        <Link
                          to="/enterprise-solution"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Enterprise Networking
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/cloud-solution"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Cloud Migration & Management
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/cybersecurity-solution"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Cybersecurity Solution
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/digital-solution"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Digital Transformation
                        </Link>
                      </li>

                      <li className="border-b border-gray-200">
                        <Link
                          to="/disaster-solution"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Disaster Recovery
                        </Link>
                      </li>

                      <li>
                        <Link
                          to="/managed-solution"
                          className="block px-4 py-1 hover:bg-gray-100"
                        >
                          Managed IT Services
                        </Link>
                      </li>
                    </ul>
                  </div>
                </li>

                {/* Contact */}
                <li>
                  <NavLink to="/contact" className={linkStyle}>
                    Contact
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Phone Button */}
            <a
              href="tel:+919310281314"
              className="
      ml-10
      bg-gradient-to-r from-[#4564da] to-[#00aeef]
      text-white
      px-7
      py-3
      rounded-full
      text-[15px]
      font-medium
      transition-all
      duration-300
      shadow-md
      hover:shadow-lg
      hover:scale-105
    "
            >
              +91-9310281314
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={toggleMenu}
            className="lg:hidden text-[#0c4da2] transition-all duration-300"
            aria-label="Toggle Menu"
          >
            {showMenu ? <HiX size={30} /> : <HiMenuAlt1 size={30} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <ResponsiveMenu showMenu={showMenu} setShowMenu={setShowMenu} />
    </>
  );
};

export default Navbar;
