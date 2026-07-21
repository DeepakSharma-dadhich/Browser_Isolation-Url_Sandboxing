export default function Section({
  children,
  className = "",
}) {
  return (
    <section
      className={`
        py-16
        md:py-20
        lg:py-28
        ${className}
      `}
    >
      {children}
    </section>
  );
}