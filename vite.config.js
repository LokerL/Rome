import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ["**/*.glb", "**/*.gltf"],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
