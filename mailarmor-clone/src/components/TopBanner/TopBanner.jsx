import banner from "../../assets/images/TopBanner.png";

export default function TopBanner({ text }) {
  return (
    <section
      className="relative h-[380px] md:h-[450px] overflow-hidden bg-center bg-cover"
      style={{
        backgroundImage: `url(${banner})`,
      }}
    >
      <div className="absolute inset-0 bg-[#0F172A]/35" />

      <div className="relative z-10 flex h-full items-center justify-center">
        <h1 className="text-5xl font-bold text-white md:text-7xl">
          {text}
        </h1>
      </div>
    </section>
  );
}