import Section from "../common/Section";
import Container from "../common/Container";
import SectionHeader from "../common/SectionHeader";

import ApproachCard from "./ApproachCard";
import approachData from "./approachData";

export default function Approach() {
  return (
    <Section className="bg-[#F8FAFC]">

      <Container>

        <SectionHeader
          title={approachData.title}
          subtitle={approachData.subtitle}
        />

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {approachData.cards.map((item) => (
            <ApproachCard
              key={item.id}
              number={item.number}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}

        </div>

      </Container>

    </Section>
  );
}