import Section from "../common/Section";
import Container from "../common/Container";
import SectionHeader from "../common/SectionHeader";

import ComparisonTable from "./ComparisonTable";
import comparisonData from "./comparisonData";

export default function Comparison() {
  return (
    <Section className="bg-[#F8FAFC]">

      <Container>

        <SectionHeader
          title="How ArkMail Outperforms Enterprise Solutions"
          subtitle=""
        />

        <div className="mt-16">

          <ComparisonTable
            title={comparisonData.title}
            headers={comparisonData.headers}
            rows={comparisonData.rows}
          />

        </div>

      </Container>

    </Section>
  );
}