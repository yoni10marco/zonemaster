import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = "prj_e1RfzclY9DMJukJTEHJNdFJyexXy";
const TEAM_ID = "team_DmXi6jFhlhxLn82kDStr9YqX";
const ROOT = process.cwd();

const INCLUDE_ROOTS = ["src", "public"];
const INCLUDE_FILES = ["package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"];
const EXCLUDE_DIRS = new Set(["node_modules", ".next", ".git", ".agents", ".claude"]);
const BINARY_EXTENSIONS = new Set([".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff", ".woff2"]);

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
}

const files = [];
for (const root of INCLUDE_ROOTS) {
  const abs = path.join(ROOT, root);
  try {
    walk(abs, files);
  } catch {
    // root doesn't exist, skip
  }
}
for (const f of INCLUDE_FILES) {
  files.push(path.join(ROOT, f));
}

const payloadFiles = files
  .filter((absPath) => !BINARY_EXTENSIONS.has(path.extname(absPath).toLowerCase()))
  .map((absPath) => {
    const rel = path.relative(ROOT, absPath).split(path.sep).join("/");
    const buf = readFileSync(absPath);
    return { file: rel, data: buf.toString("utf-8") };
  });

console.error(`Deploying ${payloadFiles.length} files...`);

const res = await fetch(`https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "zone-master",
    project: PROJECT_ID,
    target: "production",
    files: payloadFiles,
    projectSettings: {
      framework: "nextjs",
    },
  }),
});

const json = await res.json();
if (!res.ok) {
  console.error("ERROR", res.status, JSON.stringify(json, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ id: json.id, url: json.url, readyState: json.readyState }, null, 2));
