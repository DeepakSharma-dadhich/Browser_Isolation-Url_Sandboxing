import Section from "../common/Section";
import Container from "../common/Container";
import { CardIcon } from "../common/Card";

import {
  HiCheckCircle,
} from "react-icons/hi2";

import ApiFlow from "./ApiFlow";
import apiIntegrationData from "./apiIntegrationData";

export default function ApiIntegration() {
  const {
    icon: Icon,
    title,
    description,
    points,
    button,
  } = apiIntegrationData;

  return (
    <Section className="bg-[#F8FAFC]">
      <Container>

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left */}

          <div>

            <CardIcon icon={Icon} />

            <h2 className="mt-8 text-5xl font-bold text-[#18335D]">
              {title}
            </h2>

            <p className="mt-6 text-lg leading-9 text-[#64748B]">
              {description}
            </p>

            <ul className="mt-2 space-y-2">
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

            <button
              className="
                mt-10
                rounded-xl
                bg-[#18335D]
                px-7
                py-3
                font-semibold
                text-white
                transition
                hover:bg-[#2563EB]
              "
            >
              {button}
            </button>

          </div>

          {/* Right */}

          <ApiFlow />

        </div>

      </Container>
    </Section>
  );
}


// import Section from "../common/Section";
// import Container from "../common/Container";
// import SectionHeader from "../common/SectionHeader";

// import { HiCheckCircle } from "react-icons/hi2";

// import ApiFlow from "./ApiFlow";
// import apiIntegrationData from "./apiIntegrationData";

// export default function ApiIntegration() {
//   const {
//     icon: Icon,
//     title,
//     description,
//     points,
//     button,
//   } = apiIntegrationData;

//   return (
//     <Section className="bg-[#F8FAFC]">
//       <Container>

//         {/* Heading */}
//         <SectionHeader
//           title="MailArmor: AI Email Security for Indian SMBs (Microsoft 365 & CERT-In)"
//           subtitle="The complete email security solution designed specifically for Indian SMBs"
//         />

//         {/* Content */}
//         <div className="mt-20 grid items-center gap-16 lg:grid-cols-2">

//           {/* Left Side */}
//           <div>

//             <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#18335D] text-white shadow-xl">
//               <Icon className="text-3xl" />
//             </div>

//             <h2 className="mt-8 text-[48px] font-bold text-[#18335D]">
//               {title}
//             </h2>

//             <p className="mt-6 text-[20px] leading-9 text-[#64748B]">
//               {description}
//             </p>

//             <ul className="mt-8 space-y-5">
//               {points.map((item) => (
//                 <li
//                   key={item}
//                   className="flex items-center gap-3"
//                 >
//                   <HiCheckCircle className="text-[#18335D] text-xl" />
//                   <span className="text-[#475569]">{item}</span>
//                 </li>
//               ))}
//             </ul>

//             <button className="mt-10 rounded-xl bg-[#18335D] px-7 py-3 font-semibold text-white transition hover:bg-[#2563EB]">
//               {button}
//             </button>

//           </div>

//           {/* Right Side */}
//           <ApiFlow />

//         </div>

//       </Container>
//     </Section>
//   );
// }