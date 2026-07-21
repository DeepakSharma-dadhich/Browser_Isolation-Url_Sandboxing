import React from "react";
import Button from "../common/Button";
import { FaRocket } from "react-icons/fa";

export default function WaitlistButton() {
  return (
    <Button className="hidden md:flex items-center justify-center gap-2">
      {/* <span className="button-shine"></span> */}
      <FaRocket className="relative z-10 text-[20px]" />
      <span className="relative z-10">Join our Waitlist</span>
    </Button>
  );
}
