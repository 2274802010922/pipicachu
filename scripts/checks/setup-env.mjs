import fs from "node:fs";
import { randomBytes } from "node:crypto";
const directory = "work/private";
fs.mkdirSync(directory, { recursive: true });
const path = `${directory}/v06-ip-salt.txt`;
if (!fs.existsSync(path))
  fs.writeFileSync(path, randomBytes(32).toString("hex"), { mode: 0o600 });
if (!/^[0-9a-f]{64}$/.test(fs.readFileSync(path, "utf8").trim()))
  throw Error("Invalid salt file");
console.log(
  "Salt prepared in ignored work/private/v06-ip-salt.txt; value is not logged.",
);
console.log(
  "Vercel Production + Preview: Redis REST URL/token and RATE_LIMIT_IP_SALT.",
);
console.log(
  "GitHub Actions: existing DEVNET_KEEPER_KEYPAIR plus the same Redis URL/token.",
);
