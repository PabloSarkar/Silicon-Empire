import type { Logo } from "../../sim/types";

const FONT_FAMILIES: Record<Logo["font"], string> = {
  sans: "Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
};

function Shape({ shape, fill }: { shape: Logo["shape"]; fill: string }) {
  switch (shape) {
    case "circle":
      return <circle cx="50" cy="50" r="48" fill={fill} />;
    case "square":
      return <rect x="4" y="4" width="92" height="92" fill={fill} />;
    case "diamond":
      return <polygon points="50,2 98,50 50,98 2,50" fill={fill} />;
    case "hexagon":
      return <polygon points="50,2 92,26 92,74 50,98 8,74 8,26" fill={fill} />;
    case "triangle":
      return <polygon points="50,4 97,92 3,92" fill={fill} />;
  }
}

/** Renders a company logo as SVG. */
export function LogoMark({ logo, size = 48 }: { logo: Logo; size?: number }) {
  const text = logo.text.trim().toUpperCase();
  const fontSize = text.length >= 3 ? 30 : text.length === 2 ? 38 : 48;
  // Triangles are bottom-heavy, so their text sits lower.
  const textY = logo.shape === "triangle" ? 66 : 50;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Logo: ${text}`}
    >
      <Shape shape={logo.shape} fill={logo.primaryColor} />
      <text
        x="50"
        y={textY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT_FAMILIES[logo.font]}
        fontWeight="bold"
        fontSize={fontSize}
        fill={logo.secondaryColor}
      >
        {text}
      </text>
    </svg>
  );
}
