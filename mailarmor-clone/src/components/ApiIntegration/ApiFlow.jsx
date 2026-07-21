import {
  HiLink,
  HiCog6Tooth,
  HiShieldCheck,
} from "react-icons/hi2";

export default function ApiFlow() {
  return (
    <div
      className="
        flex
        items-center
        justify-center
        gap-6
        rounded-2xl
        bg-[#18335D]
        px-8
        py-8
      "
    >
      <Step
        icon={HiLink}
        label="Connect"
        active
      />

      <span className="text-white text-3xl">→</span>

      <Step
        icon={HiCog6Tooth}
        label="Configure"
      />

      <span className="text-white text-3xl">→</span>

      <Step
        icon={HiShieldCheck}
        label="Protect"
      />
    </div>
  );
}

function Step({
  icon: Icon,
  label,
  active = false,
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-full
          ${
            active
              ? "bg-[#2563EB] text-white"
              : "bg-white text-[#18335D]"
          }
        `}
      >
        <Icon className="text-2xl" />
      </div>

      <span className="mt-3 text-sm text-white">
        {label}
      </span>
    </div>
  );
}