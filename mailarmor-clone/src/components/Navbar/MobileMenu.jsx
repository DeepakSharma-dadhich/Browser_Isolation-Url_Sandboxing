import { useState } from "react";
import { HiOutlineMenuAlt3, HiOutlineX } from "react-icons/hi";
import { IoChevronDown } from "react-icons/io5";
import { FaRocket } from "react-icons/fa";

import Logo from "./Logo";
import { navLinks } from "./navbarData";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center justify-center text-[#20304A]"
      >
        <HiOutlineMenuAlt3 size={32} />
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open
            ? "opacity-100 visible"
            : "opacity-0 invisible"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[300px] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <Logo />

          <button
            onClick={() => setOpen(false)}
            className="text-[#20304A]"
          >
            <HiOutlineX size={28} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-6 pt-6">
          <ul className="space-y-6">
            {navLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between text-[17px] font-medium text-[#20304A] hover:text-[#2F80ED] transition-colors"
                >
                  {link.title}

                  {link.hasDropdown && (
                    <IoChevronDown size={18} />
                  )}
                </a>
              </li>
            ))}
          </ul>

          {/* Button */}
          <button
            className="
              mt-10
              w-full
              h-[52px]
              rounded-xl
              bg-[#2F4E85]
              text-white
              font-semibold
              flex
              items-center
              justify-center
              gap-3
              hover:bg-[#26426F]
              transition-all
            "
          >
            <FaRocket />
            Join our Waitlist
          </button>
        </nav>
      </div>
    </>
  );
}