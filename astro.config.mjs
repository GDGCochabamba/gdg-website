import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  integrations: [partytown()],
  vite: {
    plugins: [tailwindcss()],
  },
});