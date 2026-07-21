import Card from "../common/Card";

export default function TraditionalCard({ icon, title, points, badge }) {
  return (
    <Card icon={icon}
      className="min-h-[420px] px-7"
    >
      <h3 className="mt-3 text-center whitespace-pre-line text-[26px] font-bold leading-[1.25] text-[#18335D]">
        {title}
      </h3>

      <ul className="mt-8 space-y-4">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 text-[15px] leading-7 text-[#4B5563]"
          >
            <span className="mt-[11px] h-[5px] w-[5px] rounded-full bg-[#18335D]" />

            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-center">
        <span className="rounded-md bg-[#18335D] px-4 py-2 text-[12px] font-semibold text-white">
          {badge}
        </span>
      </div>
    </Card>
  );
}
