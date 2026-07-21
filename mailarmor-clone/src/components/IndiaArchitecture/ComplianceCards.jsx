import {
  HiShieldCheck,
  HiLockClosed,
  HiFlag,
} from "react-icons/hi2";

const icons = {
  shield: HiShieldCheck,
  lock: HiLockClosed,
  flag: HiFlag,
};

export default function ComplianceCards({ cards }) {
  return (
    <div className="flex justify-center gap-4">
      {cards.map((card) => {
        const Icon = icons[card.icon];

        return (
          <div
            key={card.title}
            className="
              flex
              h-[120px]
              w-[130px]
              flex-col
              items-center
              justify-center
              rounded-4xl
              border
              border-[#2563EB]
              bg-white
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-lg
            "
          >
            <Icon className="text-4xl text-[#2563EB]" />

            <p className="mt-2 font-semibold text-[#18335D]">
              {card.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}