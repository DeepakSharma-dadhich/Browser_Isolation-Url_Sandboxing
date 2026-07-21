import Container from "../common/Container";
import HeroLeft from "./HeroLeft";
import HeroParticles from "./HeroParticles";
import HeroRight from "./HeroRight";
import HeroScroll from "./HeroScroll";
import HeroRightMobile from "./HeroRightMobile";
import HeroLeftMobile from "./HeroLeftMobile";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#08111F]">
      <HeroParticles />

      {/* Left Glow */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#1F5EFF]/15 blur-[180px]" />

      {/* Right Glow */}
      <div className="absolute top-20 right-0 h-[500px] w-[500px] rounded-full bg-[#00B8FF]/10 blur-[160px]" />

      {/* Bottom Glow */}
      <div className="absolute bottom-0 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-[#3B82F6]/10 blur-[160px]" />

      <Container>
        {/* Desktop */}
        <div className="hidden lg:flex relative min-h-[760px] items-center justify-between">
          <HeroLeft />
          <HeroRight />
        </div>
        {/* Mobile */}
        <div className="block lg:hidden py-8">
          
          <HeroRightMobile/>
          <HeroLeftMobile/>
        </div>
      </Container>
    </section>
  );
}
