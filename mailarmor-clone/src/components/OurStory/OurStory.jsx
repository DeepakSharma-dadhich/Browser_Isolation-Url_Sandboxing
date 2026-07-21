import Section from "../common/Section";
import Container from "../common/Container";
import data from "./ourStoryData";

export default function OurStory() {
  const MissionIcon = data.mission.icon;
  const VisionIcon = data.vision.icon;

  return (
    <Section className="bg-white py-24">
      <Container>

        <div className="grid gap-16 lg:grid-cols-2">

          {/* Left */}
          <div>

            <h2 className="text-5xl font-bold text-[#18335D]">
              {data.title}
            </h2>

            <p className="mt-10 text-[21px] leading-[2] text-[#475569]">
              {data.description1}
            </p>

            <p className="mt-10 text-[21px] leading-[2] text-[#475569]">
              {data.description2}
            </p>

          </div>

          {/* Right */}
          <div className="space-y-8">

            {/* Mission */}

            <div
              className="
                rounded-[28px]
                border
                border-[#E2E8F0]
                bg-white
                p-10
                shadow-[0_10px_30px_rgba(15,23,42,.08)]
              "
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#18335D] text-white">
                <MissionIcon className="text-3xl" />
              </div>

              <h3 className="mt-8 text-4xl font-bold text-[#18335D]">
                {data.mission.title}
              </h3>

              <p className="mt-5 text-[19px] leading-9 text-[#64748B]">
                {data.mission.description}
              </p>
            </div>

            {/* Vision */}

            <div
              className="
                rounded-[28px]
                border
                border-[#E2E8F0]
                bg-white
                p-10
                shadow-[0_10px_30px_rgba(15,23,42,.08)]
              "
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#18335D] text-white">
                <VisionIcon className="text-3xl" />
              </div>

              <h3 className="mt-8 text-4xl font-bold text-[#18335D]">
                {data.vision.title}
              </h3>

              <p className="mt-5 text-[19px] leading-9 text-[#64748B]">
                {data.vision.description}
              </p>
            </div>

          </div>

        </div>

      </Container>
    </Section>
  );
}