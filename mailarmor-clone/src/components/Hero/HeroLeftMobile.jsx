import HeroBadge from "./HeroBadge";
import HeroHeading from "./HeroHeading";
import HeroButtons from "./HeroButtons";
import HeroStats from "./HeroStats";
import HeroFeatures from "./HeroFeatures";
import HeroImage from "./HeroImage";

export default function HeroLeftMobile() {
  return (
    <div className="py-8 text-center">

      <div className="flex justify-center">
        <HeroBadge />
      </div>

      <HeroHeading />

       <p className="mt-2 px-4 text-[22px] leading-8 text-[#AAB6C8]">
        Protect your business from sophisticated email threats with our{" "}
        <span className="text-[#4E8DFF] font-medium">
          AI Email Security Software
        </span>.
        Built for Indian SMBs with CERT-In compliance and local data residency.
      </p>

      <div className="mt-2 flex justify-center">
        <HeroButtons />
      </div>

      <div className="flex justify-center">
        <HeroStats />
      </div>

      <div>
        <HeroFeatures />
      </div>
        {/* <div className="mt-25 w-full max-w-[380px]">
            <HeroImage />
        </div> */}
    </div>
  );
}