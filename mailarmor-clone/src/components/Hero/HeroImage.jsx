import heroImage from "../../assets/images/MultipleDevices.png";

export default function HeroImage() {
  return (
    <div
      className="
        relative
        
        w-[500px]
        rounded-[20px]
        overflow-hidden
        shadow-[0_30px_60px_rgba(0,0,0,.45)]
      "
    >
      <img
        src={heroImage}
        alt="Hero"
        className="block w-full"
      />

      {/* Scan Line */}
      <div className="scan-line"></div>
    </div>
  );
}