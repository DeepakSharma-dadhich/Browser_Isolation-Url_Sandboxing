import Card from "../common/Card";

export default function ResearchCard({ icon, title, description, author }) {
  return (
    <Card icon={icon}
      className="min-h-[340px]"
    >
      <h3 className="mt-3 whitespace-pre-line text-[22px] md:text-[24px] font-bold leading-[1.3] text-[#18335D]">
        {title}
      </h3>

      <p className="mt-4 text-[15px] leading-7 text-[#6B7280]">{description}</p>

      <p className="mt-8 text-right text-[12px] italic text-[#9CA3AF]">
        — {author}
      </p>
    </Card>
  );
}
