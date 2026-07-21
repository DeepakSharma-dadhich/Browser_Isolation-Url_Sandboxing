const particles = Array.from({ length: 32 }, (_, i) => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: Math.random() * 6 + 2,
  delay: `${Math.random() * 5}s`,
  duration: `${5 + Math.random() * 5}s`,
}));

export default function HeroParticles() {
  return (
    <>
      {particles.map((particle, index) => (
        <span
          key={index}
          className="hero-particle"
          style={{
            top: particle.top,
            left: particle.left,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </>
  );
}