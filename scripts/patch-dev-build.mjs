import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const PROD = "com.felixgeelhaar.govee-light-management";
const DEV = `${PROD}.dev`;

const prodDir = path.join(root, `${PROD}.sdPlugin`);
const devDir = path.join(root, `${DEV}.sdPlugin`);

if (!fs.existsSync(prodDir)) {
  console.error("Production plugin folder not found. Run build first.");
  process.exit(1);
}

// Always recreate dev folder from clean prod folder
if (fs.existsSync(devDir)) {
  fs.rmSync(devDir, { recursive: true, force: true });
}

fs.cpSync(prodDir, devDir, { recursive: true });

const manifestPath = path.join(devDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function normaliseUuid(val) {
  if (typeof val !== "string") return val;

  // Collapse any accidental repeated .dev suffixes first
  val = val.replaceAll(`${DEV}.dev`, DEV);

  // If already correct, leave it alone
  if (val === DEV || val.startsWith(`${DEV}.`)) {
    return val;
  }

  // Convert prod UUID space to dev UUID space
  if (val === PROD) return DEV;
  if (val.startsWith(`${PROD}.`)) {
    return `${DEV}${val.slice(PROD.length)}`;
  }

  return val;
}

// Plugin UUID
manifest.UUID = normaliseUuid(manifest.UUID);

// Visible name
if (typeof manifest.Name === "string") {
  manifest.Name = manifest.Name.replace(/\s+DEV$/, "");
  manifest.Name = `${manifest.Name} DEV`;
}

// Visible category
if (typeof manifest.Category === "string") {
  manifest.Category = manifest.Category.replace(/\s+DEV$/, "");
  manifest.Category = `${manifest.Category} DEV`;
}

// Action UUIDs
if (Array.isArray(manifest.Actions)) {
  manifest.Actions = manifest.Actions.map((a) => ({
    ...a,
    UUID: normaliseUuid(a.UUID),
  }));
}

// Category action references
if (Array.isArray(manifest.Categories)) {
  manifest.Categories = manifest.Categories.map((c) => ({
    ...c,
    Actions: Array.isArray(c.Actions)
      ? c.Actions.map(normaliseUuid)
      : c.Actions,
  }));
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

// Patch compiled JS
function patchJsFiles(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      patchJsFiles(fullPath);
      continue;
    }

    if (!entry.name.endsWith(".js")) continue;

    let content = fs.readFileSync(fullPath, "utf8");

    // Clean accidental double-dev first
    content = content.replaceAll(`${DEV}.dev`, DEV);

    // Replace prod UUID space with dev UUID space
    content = content.replaceAll(`${PROD}.`, `${DEV}.`);
    content = content.replaceAll(`"${PROD}"`, `"${DEV}"`);
    content = content.replaceAll(`'${PROD}'`, `'${DEV}'`);

    fs.writeFileSync(fullPath, content, "utf8");
  }
}

patchJsFiles(path.join(devDir, "bin"));

console.log("Created DEV plugin build:");
console.log(devDir);
console.log(`UUID: ${manifest.UUID}`);
console.log(`Category: ${manifest.Category}`);