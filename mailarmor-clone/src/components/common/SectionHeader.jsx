export default function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <h2
        className="
          text-[30px]
          md:text-[42px]
          lg:text-[50px]
          font-extrabold
          leading-tight
          text-[#102A4C]
        "
      >
        {title}
      </h2>

      <p
        className="
          mt-5
          text-[16px]
          md:text-[18px]
          leading-8
          text-[#64748B]
        "
      >
        {subtitle}
      </p>
    </div>
  );
}