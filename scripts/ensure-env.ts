// Creates .env from .env.example with a random JWT_SECRET, if .env doesn't exist yet.
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  console.log(".env already exists, leaving it alone.");
} else {
  copyFileSync(".env.example", ".env");
  const secret = randomBytes(32).toString("hex");
  writeFileSync(".env", readFileSync(".env", "utf8").replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${secret}"`));
  console.log("Created .env with a random JWT_SECRET.");
}
