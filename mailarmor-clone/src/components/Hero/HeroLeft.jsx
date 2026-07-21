import HeroBadge from "./HeroBadge";
import HeroHeading from "./HeroHeading";
import HeroButtons from "./HeroButtons";
import HeroStats from "./HeroStats";
import HeroFeatures from "./HeroFeatures";

export default function HeroLeft() {
  return (
    <div className="w-[46%] max-w-[600px]">
      {/* // <div className="w-full lg:w-[50%] max-w-[540px] flex flex-col justify-center transform lg:-translate-y-25 transition-transform duration-300"> */}

      <HeroBadge />

      <HeroHeading />

      <p className="mt-5 text-[20px] leading-[30px] text-[#AAB6C8] max-w-[560px]">
        Protect your business with our{" "}
        <span className="text-[#4E8DFF] font-medium">
          AI-powered Email Security
        </span>{" "}
        built for Indian SMBs, featuring CERT-In compliance and local data
        residency.
      </p>

      <HeroButtons />

      <HeroStats />

      <HeroFeatures />
    </div>
  );
}
