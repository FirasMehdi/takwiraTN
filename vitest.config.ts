import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    fileParallelism: false,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL_TEST:
        process.env.DATABASE_URL_TEST ??
        "postgresql://takwria:takwria@localhost:5433/takwria_test",
      NEXTAUTH_SECRET: "test-secret",
      NEXTAUTH_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
