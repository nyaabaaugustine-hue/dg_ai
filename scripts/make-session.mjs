import { createHmac } from "node:crypto";
import "dotenv/config";

const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 16) throw new Error("AUTH_SECRET not set");
const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
const payload = `${exp}`;
const sig = createHmac("sha256", secret).update(payload).digest("hex");
process.stdout.write(`pragya_admin=${payload}.${sig}`);
