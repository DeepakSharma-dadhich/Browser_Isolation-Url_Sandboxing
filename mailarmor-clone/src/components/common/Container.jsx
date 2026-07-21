import { spacing } from "../../theme";

export default function Container({
  children,
  className = "",
}) {
  return (
    <div
      className={`
        ${spacing.container}
        ${className}
      `}
    >
      {children}
    </div>
  );
}