import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node", // 或 'jsdom'，取決於你的需求
  },
});
