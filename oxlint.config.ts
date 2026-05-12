import { defineConfig } from "oxlint";

export default defineConfig({
  ignorePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  plugins: ["typescript", "unicorn", "oxc", "vue"],
});
