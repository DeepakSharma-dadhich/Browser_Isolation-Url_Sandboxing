import Section from "../common/Section";
import Container from "../common/Container";
import { CardIcon } from "../common/Card";

import { HiCheckCircle } from "react-icons/hi2";

import ComplianceCards from "./ComplianceCards";
import indiaArchitectureData from "./indiaArchitectureData";

export default function IndiaArchitecture() {
  const {
    icon: Icon,
    title,
    description,
    points,
    cards,
  } = indiaArchitectureData;

  return (
    <Section className="bg-[#F8FAFC]">
      <Container>

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left */}

          <div>

            <CardIcon icon={Icon} />

            <h2 className="mt-5 text-5xl font-bold text-[#18335D]">
              {title}
            </h2>

            <p className="mt-5 text-lg leading-9 text-[#64748B]">
              {description}
            </p>

            <ul className="mt-5 space-y-2">
              {points.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3"
                >
                  <HiCheckCircle className="text-[#2563EB] text-xl" />

                  <span className="text-[#475569]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

          </div>

          {/* Right */}

          <ComplianceCards cards={cards} />

        </div>

      </Container>
    </Section>
  );
}