import Section from "../common/Section";
import Container from "../common/Container";

import StatsCard from "./StatsCard";
import statsData from "./statsData";

export default function Stats() {
  return (
    <Section className="bg-[#F8FAFC] py-20 lg:py-2">
      <Container>
        <div
          className="
    mx-auto
    max-w-6xl
    rounded-[28px]
    bg-white
    shadow-[0_15px_35px_rgba(15,23,42,.08)]
    px-11
    py-6
    md:px-12
    md:py-8
  "
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statsData.map((item) => (
              <StatsCard key={item.id} number={item.number} text={item.text} />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
