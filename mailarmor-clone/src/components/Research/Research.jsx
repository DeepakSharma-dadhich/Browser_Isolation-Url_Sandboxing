import Section from "../common/Section";
import Container from "../common/Container";
import SectionHeader from "../common/SectionHeader";

import ResearchCard from "./ResearchCard";
import researchData from "./researchData";

export default function Research() {
  return (
    <Section className="bg-[#F8FAFC] py-16 lg:py-28">
      <Container>

        <SectionHeader
          title="Research Confirms: API and AI Are Shaping the Future of Email Security"
          subtitle="Leading analysts and security experts validate our approach to modern email protection"
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
          {researchData.map((item) => (
            <ResearchCard key={item.id} {...item} />
          ))}
        </div>

      </Container>
    </Section>
  );
}