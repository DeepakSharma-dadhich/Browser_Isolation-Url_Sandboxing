import React from "react";

export default function Button({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`
w-[200px]
h-[52px]
bg-[#19335D]
hover:bg-[#152C52]
rounded-[18px]
text-[16px]
font-semibold
text-white
hover:bg-[#142B4F]
hover:shadow-[0_15px_35px_rgba(24,51,93,0.28)]
transition-all
duration-300
${className}
`}
    >
      {children}
    </button>
  );
}
