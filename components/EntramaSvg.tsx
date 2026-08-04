export default function EntramaSvg({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="2 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 2c0 0 4 0 6 4 2 4-2 6 2 8 4 2 8 0 8 0m0-12c0 0-4 0-6 4-2 4 2 6-2 8-4 2-8 0-8 0m8-14l0 4m0 8l0 4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  )
}
