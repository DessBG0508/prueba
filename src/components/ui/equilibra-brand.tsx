export function EquilibraBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3" aria-label="Equilibra TESH">
      <svg className="size-12 shrink-0 sm:size-14" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient
            id="equilibra-brand-gradient"
            x1="8"
            y1="8"
            x2="56"
            y2="56"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6857E4" />
            <stop offset="1" stopColor="#87FFBD" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="url(#equilibra-brand-gradient)" />
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.88"
        />
        <path
          d="M29.5 18.5c-8.2 0-14.7 6.1-14.7 14.1 0 3.7 1.3 6.7 3.6 9l-2 4h6.2v7.2h10V37.5c0-4.9 3.3-8.4 8-8.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M37.2 19.4c5.7 0 10.3 4.6 10.3 10.3 0 7.4-5.6 13.2-13 13.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M30 28c3.5-5.3 7.4-5.3 10.8 0s7.2 5.3 10.7 0"
          fill="none"
          stroke="var(--color-primary-foreground)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="min-w-0 font-display text-[1.35rem] leading-none text-primary sm:text-[1.7rem]">
        EQUILIBRA <span className="text-accent">TESH</span>
      </span>
    </div>
  );
}
