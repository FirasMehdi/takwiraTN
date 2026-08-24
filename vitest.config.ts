import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    fileParallelism: false,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    // Git worktrees live under .claude/worktrees/ inside the repo; without
    // this, every test file is discovered twice (once per checkout).
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.claude/**"],
    env: {
      NODE_ENV: "test",
      // La génération de créneaux suppose l'heure locale de Tunis (voir
      // README.md § Fuseau horaire) ; on pin le fuseau du runner de tests
      // pour qu'il corresponde à celui attendu en production.
      TZ: "Africa/Tunis",
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
