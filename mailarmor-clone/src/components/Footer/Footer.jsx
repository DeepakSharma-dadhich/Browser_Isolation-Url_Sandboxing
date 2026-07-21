import React from "react";
import Logo from "../Navbar/Logo";

import {
  FaLinkedin,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white">
      {/* Top */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_.8fr]">

          {/* Left */}
          <div>
            <Logo />

            <p className="mt-8 text-lg font-medium text-[#D1D9E6]">
              Next-Generation Email Security for Indian SMBs
            </p>

            <p className="mt-5 max-w-[560px] text-[17px] leading-8 text-[#94A3B8]">
              Founded by defense veterans with a shared vision to make India's
              digital landscape safer through AI-powered email security,
              enterprise-grade protection, and effortless deployment.
            </p>

            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-[#334155] bg-[#162033] transition duration-300 hover:-translate-y-1 hover:border-[#3B82F6] hover:bg-[#2563EB]"
            >
              <FaLinkedin className="text-2xl" />
            </a>
          </div>

          {/* Right */}
          <div>
            <h3 className="text-3xl font-bold text-white">
              Contact Us
            </h3>

            <div className="mt-10 space-y-8">

              <div className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#162033]">
                  <FaMapMarkerAlt className="text-[#60A5FA]" />
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white">
                    Office
                  </h4>

                  <p className="mt-2 text-[#94A3B8] leading-7">
                    C-40, Tech Chambers
                    <br />
                    Knowledge Park 1
                    <br />
                    Greater Noida – 201310
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#162033]">
                  <FaPhoneAlt className="text-[#60A5FA]" />
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white">
                    Phone
                  </h4>

                  <a
                    href="tel:+918888888888"
                    className="mt-2 block text-[#94A3B8] transition hover:text-white"
                  >
                    +91 88888 88888
                  </a>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#162033]">
                  <FaEnvelope className="text-[#60A5FA]" />
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white">
                    Email
                  </h4>

                  <a
                    href="mailto:support@arkmail.ai"
                    className="mt-2 block text-[#94A3B8] transition hover:text-white"
                  >
                    support@arkmail.ai
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 px-6 py-6 text-sm text-[#94A3B8] md:flex-row">

          <p>
            © 2026 <span className="font-semibold text-white">ArkMail Technologies Pvt. Ltd.</span> All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <a href="#" className="transition hover:text-white">
              Privacy Policy
            </a>

            <a href="#" className="transition hover:text-white">
              Terms of Service
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}