// The wordmark from the brand guidelines: geometric lowercase "mofi" with the green dot.
export function Wordmark({ width = 76, inverted = false }: { width?: number; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 380 170" width={width} height={(width * 170) / 380} role="img" aria-label="Mofi">
      <g fill="none" stroke={inverted ? "#fff" : "#0a0a0b"} strokeWidth="22" strokeLinejoin="round">
        <path d="M11 160V105A34 34 0 0 1 79 105V160" />
        <path d="M79 105A34 34 0 0 1 147 105V160" />
        <circle cx="222" cy="110" r="39" />
        <path d="M305 160V45A24 24 0 0 1 329 21H340" />
        <path d="M286 71H332" />
        <path d="M364 160V60" />
      </g>
      <circle cx="364" cy="24" r="14" fill="#16a34a" />
    </svg>
  );
}
