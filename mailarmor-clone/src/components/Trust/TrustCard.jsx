import Card from "../common/Card";

export default function TrustCard({
  icon,
  title,
  description,
}) {
  return (
    <Card icon={icon}
        className="min-h-[260px] flex flex-col items-center"
    >
      <h3 className="mt-6 text-[22px] font-bold leading-tight text-[#18335D]">
        {title}
      </h3>

      <p className="mt-4 text-[15px] leading-7 text-[#6B7280]">
        {description}
      </p>
    </Card>
  );
}