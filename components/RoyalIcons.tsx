/**
 * RoyalIcons — bộ icon khắc nét (line-engraving) đồng bộ ngôn ngữ thị giác
 * với crest UNICOACH. Một màu, stroke 1.5, thay thế toàn bộ emoji hệ điều hành.
 */
export function RoyalIcon({
  name,
  size = 26,
  color = 'var(--imperial-gold)',
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, JSX.Element> = {
    star: (
      <path d="M12 2.5l1.8 7 7 1.8-7 1.8-1.8 7-1.8-7-7-1.8 7-1.8 1.8-7z" />
    ),
    quill: (
      <>
        <path d="M20 4c-6 .5-10.5 3-13 8-1.2 2.4-1.8 5-2 8 3-.2 5.6-.8 8-2 5-2.5 7.5-7 8-13l-1-1z" />
        <path d="M5 19L15.5 8.5" />
      </>
    ),
    scroll: (
      <>
        <path d="M6 4h11a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V4z" />
        <path d="M6 4a2 2 0 00-2 2v2h4" />
        <path d="M10 9h6M10 12.5h6M10 16h4" />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8.5 7l1.2-2.5h4.6L15.5 7" />
        <circle cx="12" cy="13.5" r="3.5" />
        <path d="M17.8 10.2h.01" />
      </>
    ),
    progress: (
      <>
        <path d="M3.5 17.5L9 12l3.5 3L20 7.5" />
        <path d="M20 11V7.5H16.5" />
        <path d="M3.5 21h17" />
      </>
    ),
    telescope: (
      <>
        <path d="M3.6 11.5l14-7 2.8 5.6-14 7z" />
        <path d="M9.5 14.5L7 21M13 13l3.5 8" />
        <circle cx="11.5" cy="13.5" r="1.2" />
      </>
    ),
    candle: (
      <>
        <path d="M8 21h8" />
        <path d="M10 21v-7h4v7" />
        <path d="M12 14v-1.5" />
        <path d="M12 12.5c-1.1-1.2-1.1-2.4 0-3.6 1.1 1.2 1.1 2.4 0 3.6z" />
      </>
    ),
    books: (
      <>
        <path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2z" />
        <path d="M12 6.5v13" />
      </>
    ),
    lens: (
      <>
        <circle cx="10.5" cy="10.5" r="6" />
        <path d="M15 15l5.5 5.5" />
      </>
    ),
    laurel: (
      <>
        <path d="M6 4c0 7 2.5 12 6 15 3.5-3 6-8 6-15" />
        <path d="M6 4c2 1.5 3.5 1.5 5 .5M18 4c-2 1.5-3.5 1.5-5 .5M7 10c1.8 1 3 .8 4 0M17 10c-1.8 1-3 .8-4 0" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.star}
    </svg>
  );
}
