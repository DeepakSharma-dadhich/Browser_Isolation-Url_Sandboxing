import React from "react";
import Container from "../common/Container";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import WaitlistButton from "./WaitlistButton";
import MobileMenu from "./MobileMenu";
// import shadows from "../../theme/shadows";
import spacing from "../../theme/spacing";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <Container className={`${spacing.navbarHeight} flex items-center justify-between`}>
        <Logo />
        <NavLinks />
        <WaitlistButton />
        <MobileMenu />
      </Container>
    </header>
  );
}
