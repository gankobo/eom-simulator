import { defineConfig } from "vite";
import { resolve } from "node:path";

// GitHub Pages（プロジェクトサイト）でサブパス配信されても動くよう相対パスにする。
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        listing: resolve(__dirname, "listing.html"),
      },
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});
