/** @type {import('tailwindcss').Config} */
module.exports = {
content: [
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/**/*.{js,ts,jsx,tsx,mdx}",  // <-- This covers literally everything in /src!
],

  theme: {
    extend: {},
  },
  plugins: [],
}
