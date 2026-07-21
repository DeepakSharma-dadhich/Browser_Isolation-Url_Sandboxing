const stats = [
  {
    number: "99.9%",
    label: "Detection Rate",
  },
  {
    number: "5 min",
    label: "Setup Time",
  },
  {
    number: "24/7",
    label: "Protection",
  },
  {
    number: "100+",
    label: "SMBs Trust Us",
  },
];

export default function HeroStats() {
  return (
    <div className="mt-10 flex gap-4">

      {stats.map((item) => (
        <div
          key={item.number}
          className="
            group
            w-[122px]
            h-[92px]
            rounded-[18px]
            border
            border-white/10
            bg-white/[0.04]
            backdrop-blur-xl
            flex
            flex-col
            items-center
            justify-center
            transition-all
            duration-300
            hover:-translate-y-1
            hover:border-[#3B82F6]/40
            hover:bg-white/[0.07]
            hover:shadow-[0_10px_30px_rgba(59,130,246,.18)]
          "
        >
          <h3 className="text-white text-[30px] font-bold leading-none">
            {item.number}
          </h3>

          <p className="mt-2 text-[12px] text-[#9AA8BC] text-center leading-4">
            {item.label}
          </p>
        </div>
      ))}

    </div>
  );
}