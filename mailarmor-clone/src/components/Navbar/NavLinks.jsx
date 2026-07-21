import { navLinks } from "./navbarData";
import { IoChevronDown } from "react-icons/io5";

export default function NavLinks() {
  return (
    <nav className="hidden lg:flex items-center">
      <ul className="flex items-center gap-14">
        {navLinks.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              className="flex items-center gap-2 text-[16px] font-medium text-[#20304A] hover:text-[#2F80ED] transition-all duration-300"
            >
              {link.title}

              {link.hasDropdown && (
                <IoChevronDown size={18} />
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}