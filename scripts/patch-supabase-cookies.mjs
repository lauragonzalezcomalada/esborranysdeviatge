import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "scripts/supabase-cookies.js");
const target = resolve(
  root,
  "node_modules/@nuxtjs/supabase/dist/runtime/utils/cookies.js"
);

copyFileSync(source, target);
console.log("Patched @nuxtjs/supabase cookie writer for h3 1.");
