import Section from "../common/Section";
import Container from "../common/Container";
import SectionHeader from "../common/SectionHeader";

import TraditionalCard from "./TraditionalCard";
import traditionalData from "./traditionalData";

export default function Traditional() {
  return (
    <Section className="bg-[#F8FAFC] py-16 md:py-2 lg:py-2">
      <Container>

        <SectionHeader
          title="Why Traditional Email Security Leaves SMBs in India at Risk"
          subtitle="Understanding the critical gaps in conventional email protection"
        />

        <div className="mt-14 md:mt-16 lg:mt-20 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
          {traditionalData.map((item) => (
            <TraditionalCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              points={item.points}
              badge={item.badge}
            />
          ))}
        </div>

      </Container>
    </Section>
  );
}