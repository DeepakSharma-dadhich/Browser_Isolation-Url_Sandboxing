import Card from "../common/Card";

export default function ApproachCard({
  number,
  icon,
  title,
  description,
}) {
  return (
    <Card
      icon={icon}
      className="min-h-[380px] px-8 pt-14 pb-8 text-left"
    >
      <span className="text-5xl font-extrabold text-[#2563EB]/20">
        {number}
      </span>

      <h3 className="mt-4 text-3xl font-bold text-[#18335D]">
        {title}
      </h3>

      <p className="mt-5 text-[16px] leading-8 text-[#64748B]">
        {description}
      </p>
    </Card>
  );
}