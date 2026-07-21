import Section from "../common/Section";
import Container from "../common/Container";
import SectionHeader from "../common/SectionHeader";

import TrustCard from "./TrustCard";
import trustData from "./trustData";

export default function Trust() {
  return (
    <Section className="bg-white py-16 md:py-24 lg:py-28">
      <Container>

        <SectionHeader
          title="Trusted by SMBs Across India"
          subtitle="Built with security, compliance and enterprise standards in mind."
        />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustData.map((item) => (
            <TrustCard
              key={item.id}
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