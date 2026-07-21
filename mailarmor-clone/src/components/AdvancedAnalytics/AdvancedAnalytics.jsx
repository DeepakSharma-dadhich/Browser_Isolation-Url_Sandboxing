import Section from "../common/Section";
import Container from "../common/Container";
import { CardIcon } from "../common/Card";

import { HiCheckCircle } from "react-icons/hi2";

import AnalyticsDashboard from "./AnalyticsDashboard";
import advancedAnalyticsData from "./advancedAnalyticsData";

export default function AdvancedAnalytics() {
  const {
    icon: Icon,
    title,
    description,
    points,
  } = advancedAnalyticsData;

  return (
    <Section className="bg-[#F8FAFC]">
      <Container>

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* LEFT */}
          <AnalyticsDashboard />

          {/* RIGHT */}
          <div>

            <CardIcon icon={Icon} />

            <h2 className="mt-6 whitespace-pre-line text-5xl font-bold leading-tight text-[#18335D]">
              {title}
            </h2>

            <p className="mt-4 text-lg leading-9 text-[#64748B]">
              {description}
            </p>

            <ul className="mt-4 space-y-2">
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

        </div>

      </Container>
    </Section>
  );
}