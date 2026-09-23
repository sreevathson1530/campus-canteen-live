import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Integration tests share one SQLite file, so files run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-secret-test-secret-test-secret-0123",
      CANTEEN_TIMEZONE: "Asia/Kolkata",
      SMS_PROVIDER: "console",
      OTP_DEV_CODE: "1234",
    },
  },
});
