import Section from "../common/Section";
import Container from "../common/Container";
import SectionHeader from "../common/SectionHeader";
import FAQItem from "./FAQItem";
import faqData from "./faqData";

export default function FAQ() {
  return (
    <Section className="bg-[#F8FAFC]">
      <Container>
        <SectionHeader
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about ArkMail and our AI-powered email security."
        />

        <div className="mt-16 space-y-5 max-w-5xl mx-auto">
          {faqData.map((item) => (
            <FAQItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}