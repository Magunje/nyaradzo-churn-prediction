/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10231f",
        fern: "#1f6a54",
        moss: "#2f8f6b",
        sand: "#efe5d5",
        mist: "#f6f2ea",
        ember: "#a0472d",
        pine: "#143b31",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ['"Merriweather"', "serif"],
      },
      boxShadow: {
        soft: "0 20px 45px rgba(16, 35, 31, 0.12)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top left, rgba(255,255,255,0.55), transparent 35%), linear-gradient(135deg, rgba(31,106,84,0.06), rgba(160,71,45,0.08))",
      },
    },
  },
  plugins: [],
};
