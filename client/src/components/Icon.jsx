const paths = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  bookmark: <path d="M6 4h12v17l-6-4-6 4z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  external: (
    <>
      <path d="M14 4h6v6m0-6-9 9" />
      <path d="M10 4H4v16h16v-6" />
    </>
  ),
  star: (
    <path d="m12 3 2.8 5.6L21 9.5l-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.5l6.2-.9z" />
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4m-10-6 4 3-4 3z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};
export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.film}
    </svg>
  );
}
