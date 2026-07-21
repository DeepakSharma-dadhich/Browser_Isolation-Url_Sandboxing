import Section from "../common/Section";
import Container from "../common/Container";

import ResourceColumn from "./ResourceColumn";
import resourcesData from "./resourcesData";

export default function Resources() {
  return (
    <Section className="bg-white py-20">

      <Container>

        <div className="grid gap-y-10 gap-x-10 md:grid-cols-2 xl:grid-cols-4">

          {resourcesData.map((item) => (
            <ResourceColumn
              key={item.title}
              title={item.title}
              links={item.links}
            />
          ))}

        </div>

      </Container>

    </Section>
  );
}