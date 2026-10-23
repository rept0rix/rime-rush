#!/usr/bin/env node
/**
 * Ensure /privacy and /support are CDN rewrites to the static HTML pages.
 * Nitro routeRules may emit redirects; App Store / support links expect the
 * extensionless paths to return the page (or at least resolve cleanly).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const configPath = join(process.cwd(), ".vercel/output/config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const routes = Array.isArray(config.routes) ? config.routes : [];

const wanted = [
  { src: "/privacy", dest: "/privacy.html" },
  { src: "/support", dest: "/support.html" },
];

const filtered = routes.filter((r) => {
  const src = r?.src;
  return src !== "/privacy" && src !== "/support";
});

// Insert before filesystem / catch-all so static HTML wins.
const fsIdx = filtered.findIndex((r) => r?.handle === "filesystem");
const insertAt = fsIdx >= 0 ? fsIdx : 0;
filtered.splice(insertAt, 0, ...wanted);
config.routes = filtered;
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
console.log("[patch-legal-routes] rewrote /privacy and /support → *.html");
