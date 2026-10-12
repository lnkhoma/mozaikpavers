// Tailwind CSS v4 through PostCSS — the setup documented by Next.js.
// Works with both bundlers: Turbopack (local development) and webpack
// (production build; see the "build" script in package.json).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
