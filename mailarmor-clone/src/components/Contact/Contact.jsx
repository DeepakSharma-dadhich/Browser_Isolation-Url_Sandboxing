import Section from "../common/Section";
import Container from "../common/Container";
import ContactForm from "./ContactForm";

export default function Contact() {
  return (
    <Section className="bg-[#F8FAFC] py-20">
      <Container>
        <div
          className="
    mx-auto
    w-full
    max-w-[900px]
    rounded-[24px]
    border
    border-[#E5E7EB]
    bg-white
    p-8
    md:p-10
    shadow-[0_12px_35px_rgba(15,23,42,.08)]
  "
        >
          <div className="text-center">
            <h2 className="text-4xl font-bold text-[#18335D]">
              Send Us a Message
            </h2>

            <p className="mt-4 text-lg leading-8 text-[#64748B]">
              Fill out the form below and our security experts will contact you
              within 24 hours.
            </p>
          </div>

          <ContactForm />
        </div>
      </Container>
    </Section>
  );
}
