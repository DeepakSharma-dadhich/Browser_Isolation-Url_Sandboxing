export default function StatsCard({
  number,
  text,
}) {
  return (
    <div className="text-center py-2">
      <h2 className="text-[30px] md:text-[40px] font-extrabold leading-none text-[#2563EB]">
        {number}
      </h2>

      <p className="mx-auto mt-2 max-w-[220px] text-[15px] md:text-[17px] leading-5 text-[#5B6578]">
        {text}
      </p>
    </div>
  );
}