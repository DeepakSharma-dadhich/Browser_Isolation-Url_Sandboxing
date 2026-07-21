import Section from "../common/Section";
import Container from "../common/Container";
import SectionHeader from "../common/SectionHeader";

import CTAButtons from "./CTAButtons";
import ctaData from "./ctaData";

export default function CTA() {
  return (
    <Section
      className="
        bg-gradient-to-br
        from-[#EEF2FF]
        via-[#F5F3FF]
        to-[#FFF7ED]
      "
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeader
            title={ctaData.title}
            subtitle={ctaData.description}
          />

          <CTAButtons
            primaryButton={ctaData.primaryButton}
            secondaryButton={ctaData.secondaryButton}
            benefits={ctaData.benefits}
          />
        </div>
      </Container>
    </Section>
  );
}