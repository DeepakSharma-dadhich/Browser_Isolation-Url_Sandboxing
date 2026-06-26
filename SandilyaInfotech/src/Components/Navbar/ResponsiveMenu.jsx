import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { HiX, HiChevronDown } from "react-icons/hi";
import logo from "../../assets/logo.png";

const ResponsiveMenu = ({ showMenu, setShowMenu }) => {
  const [serviceOpen, setServiceOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);

  const handleClose = () => {
    setShowMenu(false);
  };

  const linkStyle = ({ isActive }) =>
    `h-[60px] px-8 flex items-center border-b border-[#e5e5e5]
    text-[18px] font-[500] tracking-[0.2px] transition-all duration-300 ${
      isActive
        ? "text-[#00aeef]"
        : "text-[#3b4358] hover:text-[#00aeef]"
    }`;

  return (
    <div
      className={`lg:hidden fixed inset-0 bg-white z-[999] overflow-y-auto transition-all duration-500 ease-in-out ${
        showMenu
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-[#e5e5e5]">
        <img
          src={logo}
          alt="Sandilya Infotech"
          className="h-[85px] w-auto object-contain"
        />

        <button
          onClick={handleClose}
          className="w-[58px] h-[58px] bg-[#4564da] text-white flex items-center justify-center rounded-sm"
        >
          <HiX size={30} />
        </button>
      </div>

      <nav>
        <ul>
          {/* Home */}
          <li>
            <NavLink to="/" className={linkStyle} onClick={handleClose}>
              Home
            </NavLink>
          </li>

          {/* About */}
          <li>
            <NavLink to="/about" className={linkStyle} onClick={handleClose}>
              About
            </NavLink>
          </li>

          {/* Services */}
          <li className="border-b border-[#e5e5e5]">
            <button
              onClick={() => setServiceOpen(!serviceOpen)}
              className="w-full h-[60px] px-8 flex items-center justify-between text-[18px] font-[500] text-[#3b4358]"
            >
              <span>Service</span>

              <HiChevronDown
                size={22}
                className={`transition-transform duration-300 ${
                  serviceOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {serviceOpen && (
              <div className="bg-[#fafafa]">
                <NavLink
                  to="/services"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Infrastructure
                </NavLink>

                <NavLink
                  to="/services"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Integration
                </NavLink>

                <NavLink
                  to="/services"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Surveillance
                </NavLink>

                <NavLink
                  to="/services"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Emerging Technology
                </NavLink>

                <NavLink
                  to="/services"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Consulting
                </NavLink>
              </div>
            )}
          </li>

          {/* Solutions */}
          <li className="border-b border-[#e5e5e5]">
            <button
              onClick={() => setSolutionOpen(!solutionOpen)}
              className="w-full h-[60px] px-8 flex items-center justify-between text-[18px] font-[500] text-[#3b4358]"
            >
              <span>Solutions</span>

              <HiChevronDown
                size={22}
                className={`transition-transform duration-300 ${
                  solutionOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {solutionOpen && (
              <div className="bg-[#fafafa]">
                <NavLink
                  to="/solutions"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Enterprise Networking
                </NavLink>

                <NavLink
                  to="/solutions"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Cloud Migration & Management
                </NavLink>

                <NavLink
                  to="/solutions"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Cybersecurity Solution
                </NavLink>

                <NavLink
                  to="/solutions"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Digital Transformation
                </NavLink>

                <NavLink
                  to="/solutions"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Disaster Recovery
                </NavLink>

                <NavLink
                  to="/solutions"
                  onClick={handleClose}
                  className="block py-3 pl-12 text-[#3b4358]"
                >
                  Managed IT Services
                </NavLink>
              </div>
            )}
          </li>

          {/* Contact */}
          <li>
            <NavLink
              to="/contact"
              className={linkStyle}
              onClick={handleClose}
            >
              Contact
            </NavLink>
          </li>

          {/* Phone */}
          <li>
            <a
              href="tel:+919310281314"
              className="h-[60px] px-8 flex items-center border-b border-[#e5e5e5] text-[18px] font-[500] text-[#00aeef]"
            >
              +91-9310281314
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default ResponsiveMenu;