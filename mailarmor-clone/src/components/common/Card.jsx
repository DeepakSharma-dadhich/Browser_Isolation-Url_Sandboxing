export function CardIcon({ icon: Icon }) {
  return (
    <div
      className="
        flex
        h-[60px]
        w-[60px]
        items-center
        justify-center
        rounded-full
        bg-gradient-to-br
        from-[#2563EB]
        via-[#3B82F6]
        to-[#06B6D4]
        text-white
        shadow-[0_15px_35px_rgba(37,99,235,.35)]
      "
    >
      <Icon className="text-[28px]" />
    </div>
  );
}

export default function Card({
  children,
  icon: Icon,
  className = "",
}) {
  return (
    <div
      className={`
        relative
        w-full
        max-w-[360px]
        rounded-[22px]
        border
        border-[#D8E4F2]
        bg-gradient-to-br
        from-white
        via-[#FAFCFF]
        to-[#F3F8FF]
        px-6
        pt-12
        pb-8
        text-center
        shadow-[0_12px_35px_rgba(15,23,42,.08)]
        transition-all
        duration-300
        hover:-translate-y-2
        hover:border-[#60A5FA]
        hover:shadow-[0_20px_45px_rgba(37,99,235,.18)]
        ${className}
      `}
    >
      {Icon && (
        <div
          className="
            absolute
            left-1/2
            top-0
            -translate-x-1/2
            -translate-y-1/2

            flex
            h-[60px]
            w-[60px]
            items-center
            justify-center

            rounded-full

            bg-gradient-to-br
            from-[#2563EB]
            via-[#3B82F6]
            to-[#06B6D4]

            text-white

            shadow-[0_15px_35px_rgba(37,99,235,.35)]
          "
        >
          <Icon className="text-[28px]" />
        </div>
      )}

      {children}
    </div>
  );
}