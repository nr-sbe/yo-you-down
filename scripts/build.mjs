// Copy only public app assets. No bundler or package install required.
import { mkdir, copyFile, writeFile, cp } from "node:fs/promises";
import { config } from '../config.js';
import { validatePublicConfig } from '../runtime-config.js';
const root = new URL("../", import.meta.url);
await mkdir(new URL("dist/", root), { recursive: true });
for (const path of [
  "index.html",
  "styles.css",
  "theme.js",
  "app.js",
  "icons.js",
  "domain.js",
  "data.js",
  "config.js",
  "runtime-config.js",
  "favicon.svg",
  ".nojekyll",
])
  await copyFile(new URL(path, root), new URL(`dist/${path}`, root));
await cp(new URL('assets/',root),new URL('dist/assets/',root),{recursive:true});
const settings = validatePublicConfig({
  supabaseUrl:process.env.SUPABASE_URL || config.supabaseUrl,
  supabasePublishableKey:process.env.SUPABASE_PUBLISHABLE_KEY || config.supabasePublishableKey,
},{requireLive:process.argv.includes('--require-live')});
await writeFile(new URL('dist/config.js',root),`export const config = Object.freeze(${JSON.stringify({supabaseUrl:settings.supabaseUrl,supabasePublishableKey:settings.supabasePublishableKey},null,2)});\n`);
console.log("Static site ready in dist/");
