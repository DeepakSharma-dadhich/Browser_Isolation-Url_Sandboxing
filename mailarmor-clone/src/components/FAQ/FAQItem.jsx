import { useState } from "react";
import { HiPlus, HiMinus } from "react-icons/hi2";

export default function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="
        rounded-2xl
        border
        border-[#E2E8F0]
        bg-white
        transition-all
        duration-300
      "
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="
          flex
          w-full
          items-center
          justify-between
          gap-5
          px-6
          py-5
          text-left
        "
      >
        <h3 className="text-lg font-semibold text-[#18335D]">
          {question}
        </h3>

        <div
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            bg-[#18335D]
            text-white
            shrink-0
          "
        >
          {open ? (
            <HiMinus className="text-lg" />
          ) : (
            <HiPlus className="text-lg" />
          )}
        </div>
      </button>

      <div
        className={`
          overflow-hidden
          transition-all
          duration-300
          ${
            open
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0"
          }
        `}
      >
        <div className="px-6 pb-6">
          <p className="leading-8 text-[#64748B]">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}