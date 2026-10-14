require("dotenv").config();

// Inspect the router objects directly rather than a mounted app, and keep the
// mount prefixes explicit so we assert the full public paths.
const routers = [
  { mount: "/get", router: require("../routes/get.routes") },
  { mount: "/search", router: require("../routes/search.routes") },
];

const routes = [];
for (const { mount, router } of routers) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
    for (const m of methods) routes.push(`${m} ${mount}${layer.route.path}`);
  }
}

console.log("Registered contractor-facing routes:");
for (const r of routes.filter((r) => r.includes("contractor")).sort()) {
  console.log("  " + r);
}

const want = [
  "GET /get/contractors",
  "GET /search/contractors",
  "GET /get/contractor/:id",
  "GET /get/contractor-applied-jobs/:contractor_id",
  "GET /get/shortlisted/:id",
];

let ok = true;
console.log("\nAssertions:");
for (const w of want) {
  const hit = routes.includes(w);
  if (!hit) ok = false;
  console.log(`  ${hit ? "OK  " : "MISS"} ${w}`);
}

console.log(ok ? "\nROUTE SMOKE TEST PASSED" : "\nROUTE SMOKE TEST FAILED");
process.exit(ok ? 0 : 1);