#!/usr/bin/env node
/**
 * Test taxonomy assert + registry writer.
 *
 *   node scripts/dev/assert-test-taxonomy.mjs           # validate
 *   node scripts/dev/assert-test-taxonomy.mjs --write   # regenerate tests/registry.yaml
 *
 * SoT: documentation/TEST_TAXONOMY.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const REGISTRY = path.join(ROOT, "tests/registry.yaml");
const WRITE = process.argv.includes("--write");

const CONTAINERS = [
  "C-UNIT",
  "C-UI",
  "C-PHOTO",
  "C-BILLING",
  "C-AUTHZ",
  "C-JOURNEY",
  "C-SIM",
  "C-MAESTRO-SMOKE",
  "C-MAESTRO-FIELD",
  "C-MAESTRO-ORG",
  "C-MAESTRO-REPORT",
  "C-MAESTRO-QA01",
  "C-MAESTRO-MARKETING",
  "C-DEST",
  "C-EDGE",
  "C-HUMAN",
  "C-ARCHIVED",
];

/** @param {string} file */
function classifyJest(file) {
  const f = file.replace(/\\/g, "/");
  if (f.startsWith("archived-tests/")) return "C-ARCHIVED";
  if (f.startsWith("tests/edge/")) return "C-EDGE";
  if (f.startsWith("tests/dual-plane/")) return "C-DEST";
  if (f.includes("/billing/")) return "C-BILLING";
  if (
    /taskDelegationPermissions|projectMembership|createProjectTeam|inviteUser|inviteSignInLink|seatUsage|userProjectAssignment/.test(
      f,
    )
  ) {
    return "C-AUTHZ";
  }
  if (
    /captureSession|mediaLibrary|photo-flow|PhotoSelection|libraryPicker|Photokit|photoPreview|bakePhoto|InAppLibraryPicker|photoFlowNavigation|SelectedPhotoThumb|fileUploadService/.test(
      f,
    )
  ) {
    return "C-PHOTO";
  }
  if (f.includes("src/__tests__/journeys/") || f.includes("src/__tests__/integration/")) {
    return "C-JOURNEY";
  }
  if (f.includes("src/__tests__/simulation/") || f.includes("src/__tests__/parity/")) {
    return "C-SIM";
  }
  if (
    /\/(components|screens|navigation|ui\/viewAdapters|ui\/mappers)\//.test(f) ||
    f.includes("src/__tests__/unit/")
  ) {
    return "C-UI";
  }
  if (/\/(state|api|utils|types|auth|config|theme|legal|test-utils)\//.test(f)) {
    return "C-UNIT";
  }
  return "C-UNIT";
}

/** @param {string} file */
function classifyMaestro(file) {
  const f = file.replace(/\\/g, "/");
  if (f.includes("/_shared/")) return "C-MAESTRO-FIELD"; // helpers — tagged shared in registry
  if (f.includes("/smoke/")) return "C-MAESTRO-SMOKE";
  if (f.includes("/qa01/")) return "C-MAESTRO-QA01";
  if (f.includes("/marketing/")) return "C-MAESTRO-MARKETING";
  if (f.includes("/destination/")) return "C-DEST";
  if (f.includes("/org/")) return "C-MAESTRO-ORG";
  if (f.includes("/report/")) return "C-MAESTRO-REPORT";
  if (
    f.includes("/create-task-photo/") ||
    f.includes("/update-progress-photo/") ||
    f.includes("/dual-user/") ||
    f.includes("/task-core/") ||
    f.includes("/journeys/") ||
    f.includes("/perf/")
  ) {
    return "C-MAESTRO-FIELD";
  }
  return "C-MAESTRO-FIELD";
}

/** @param {string} file */
function classifyScript(file) {
  const f = file.replace(/\\/g, "/");
  if (f.includes("probe-") || f.includes("assert-schema") || f.includes("headed-prod")) {
    if (f.includes("stripe") || /checkout|billing|webhook/.test(f)) return "C-EDGE";
    return "C-DEST";
  }
  if (f.startsWith("scripts/stripe/")) return "C-EDGE";
  return "C-DEST";
}

function walk(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, pred, acc);
    else if (pred(p)) acc.push(path.relative(ROOT, p).replace(/\\/g, "/"));
  }
  return acc;
}

function isJestTest(p) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p);
}

function buildRegistry() {
  const jestFiles = [
    ...walk(path.join(ROOT, "src"), (p) => isJestTest(p)),
    ...walk(path.join(ROOT, "__tests__"), (p) => isJestTest(p)),
    ...walk(path.join(ROOT, "tests"), (p) => isJestTest(p)),
    ...walk(path.join(ROOT, "archived-tests"), (p) => isJestTest(p)),
  ].sort();

  const maestroFiles = walk(
    path.join(ROOT, "maestro/flows"),
    (p) => p.endsWith(".yaml"),
  ).sort();

  const scriptFiles = [
    ...walk(path.join(ROOT, "scripts/supabase"), (p) =>
      /\.(py|mjs|cjs|js)$/.test(p) &&
      /(probe-|assert-|headed-|smoke-)/.test(path.basename(p)),
    ),
    ...walk(path.join(ROOT, "scripts/stripe"), (p) => /\.py$/.test(p)),
  ].sort();

  /** @type {Record<string, string[]>} */
  const by = Object.fromEntries(CONTAINERS.map((c) => [c, []]));
  /** @type {{path:string,container:string,kind:string}[]} */
  const entries = [];

  for (const f of jestFiles) {
    const c = classifyJest(f);
    by[c].push(f);
    entries.push({ path: f, container: c, kind: "jest" });
  }
  for (const f of maestroFiles) {
    const c = f.includes("/_shared/") ? "C-MAESTRO-FIELD" : classifyMaestro(f);
    // tag shared helpers under a virtual note via kind
    const kind = f.includes("/_shared/") ? "maestro-shared" : "maestro";
    const container = f.includes("/_shared/") ? "C-MAESTRO-FIELD" : c;
    by[container].push(f);
    entries.push({ path: f, container, kind });
  }
  for (const f of scriptFiles) {
    const c = classifyScript(f);
    by[c].push(f);
    entries.push({ path: f, container: c, kind: "script" });
  }

  return { by, entries, generatedAt: new Date().toISOString() };
}

function toYaml(reg) {
  const lines = [
    `# AUTO-GENERATED by scripts/dev/assert-test-taxonomy.mjs — do not hand-edit.`,
    `# SoT: documentation/TEST_TAXONOMY.md`,
    `# Regenerated: ${reg.generatedAt}`,
    ``,
    `containers:`,
  ];
  for (const id of CONTAINERS) {
    const files = reg.by[id] || [];
    lines.push(`  ${id}:`);
    lines.push(`    count: ${files.length}`);
    lines.push(`    files:`);
    if (files.length === 0) {
      lines.push(`      []`);
      continue;
    }
    for (const f of files) {
      lines.push(`      - ${JSON.stringify(f)}`);
    }
  }
  lines.push(`totals:`);
  lines.push(`  jest: ${reg.entries.filter((e) => e.kind === "jest").length}`);
  lines.push(
    `  maestro: ${reg.entries.filter((e) => e.kind === "maestro" || e.kind === "maestro-shared").length}`,
  );
  lines.push(`  script: ${reg.entries.filter((e) => e.kind === "script").length}`);
  lines.push("");
  return lines.join("\n");
}

/** New-file naming: domain.capability[.facet].test.ts(x) — at least one dot before .test */
function jestNameOk(file) {
  const base = path.basename(file);
  // allow *.parity.test.ts and *.contract.test.ts
  return /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9_-]+)+\.test\.(tsx?|jsx?)$/.test(base);
}

function maestroRootOrphans() {
  const flows = path.join(ROOT, "maestro/flows");
  return fs
    .readdirSync(flows)
    .filter((n) => n.endsWith(".yaml"))
    .map((n) => `maestro/flows/${n}`);
}

/** Collect maestro/flows YAML string literals from text. */
function extractMaestroYamlRefs(text) {
  const out = new Set();
  const re = /maestro\/flows\/[A-Za-z0-9_./-]+\.ya?ml/g;
  let m;
  while ((m = re.exec(text))) out.add(m[0].replace(/\\/g, "/"));
  return out;
}

/**
 * Hygiene: every maestro/flows YAML path referenced in package.json,
 * scripts/, and runFlow: lines must resolve on disk.
 */
function assertReferencedMaestroFlows() {
  /** @type {{ref:string, from:string}[]} */
  const refs = [];

  const pkgPath = path.join(ROOT, "package.json");
  if (fs.existsSync(pkgPath)) {
    for (const ref of extractMaestroYamlRefs(fs.readFileSync(pkgPath, "utf8"))) {
      refs.push({ ref, from: "package.json" });
    }
  }

  for (const rel of walk(
    path.join(ROOT, "scripts"),
    (p) => /\.(sh|bash|mjs|cjs|js|ts|py|yml|yaml|md)$/.test(p),
  )) {
    const abs = path.join(ROOT, rel);
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    for (const ref of extractMaestroYamlRefs(text)) {
      refs.push({ ref, from: rel });
    }
  }

  // runFlow: relative includes inside maestro/flows/**/*.yaml
  for (const rel of walk(
    path.join(ROOT, "maestro/flows"),
    (p) => p.endsWith(".yaml") || p.endsWith(".yml"),
  )) {
    const abs = path.join(ROOT, rel);
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    // Inline form: `- runFlow: ../_shared/_logout.yaml`
    const inlineRe = /^\s*-\s*runFlow:\s*([^\s#]+?\.(?:ya?ml))/gm;
    let m;
    while ((m = inlineRe.exec(text))) {
      const target = m[1].replace(/^["']|["']$/g, "");
      if (target.startsWith("http") || target.includes("${")) continue;
      const resolved = path
        .normalize(path.join(path.dirname(abs), target))
        .replace(/\\/g, "/");
      const relResolved = path.relative(ROOT, resolved).replace(/\\/g, "/");
      if (relResolved.startsWith("maestro/flows/")) {
        refs.push({ ref: relResolved, from: `${rel} (runFlow)` });
      }
    }
    // Block form: `runFlow:\n  file: foo.yaml` (rare)
    const fileRe = /^\s*file:\s*([^\s#]+?\.(?:ya?ml))/gm;
    while ((m = fileRe.exec(text))) {
      const target = m[1].replace(/^["']|["']$/g, "");
      const resolved = path
        .normalize(path.join(path.dirname(abs), target))
        .replace(/\\/g, "/");
      const relResolved = path.relative(ROOT, resolved).replace(/\\/g, "/");
      if (relResolved.startsWith("maestro/flows/")) {
        refs.push({ ref: relResolved, from: `${rel} (runFlow file:)` });
      }
    }
  }

  /** @type {string[]} */
  const missing = [];
  const seen = new Set();
  for (const { ref, from } of refs) {
    const key = `${ref}@@${from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const abs = path.join(ROOT, ref);
    if (!fs.existsSync(abs)) {
      missing.push(`${ref}  (from ${from})`);
    }
  }
  return { checked: refs.length, missing };
}

/**
 * Hygiene: node/tsx/python3/bash file targets under scripts/ in package.json
 * must exist. Maestro YAML refs stay in assertReferencedMaestroFlows.
 */
function assertPackageJsonScriptFileTargets() {
  const pkgPath = path.join(ROOT, "package.json");
  /** @type {string[]} */
  const missing = [];
  let checked = 0;
  if (!fs.existsSync(pkgPath)) {
    return { checked, missing };
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const re =
    /\b(?:node|tsx|python3|bash)\s+(?!-lc\b)(["']?)(\.?\/?(?:scripts\/)[^"'\\\s]+)\1/g;
  for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
    if (typeof cmd !== "string") continue;
    let m;
    const local = new RegExp(re.source, re.flags);
    while ((m = local.exec(cmd))) {
      const rel = m[2].replace(/^\.\//, "");
      checked += 1;
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) {
        missing.push(`${rel}  (from package.json scripts["${name}"])`);
      }
    }
  }
  return { checked, missing };
}

function main() {
  const reg = buildRegistry();
  const yaml = toYaml(reg);
  const errors = [];

  if (WRITE) {
    fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
    fs.writeFileSync(REGISTRY, yaml);
    console.log(`Wrote ${REGISTRY}`);
    console.log(
      `counts: jest=${reg.entries.filter((e) => e.kind === "jest").length} maestro=${reg.entries.filter((e) => e.kind.startsWith("maestro")).length} script=${reg.entries.filter((e) => e.kind === "script").length}`,
    );
  } else {
    if (!fs.existsSync(REGISTRY)) {
      errors.push("tests/registry.yaml missing — run: npm run test:taxonomy -- --write");
    } else {
      const existing = fs.readFileSync(REGISTRY, "utf8");
      // Compare without generatedAt line
      const strip = (s) => s.replace(/^# Regenerated:.*$/m, "# Regenerated: <stamp>");
      if (strip(existing) !== strip(yaml)) {
        errors.push(
          "tests/registry.yaml is stale — run: npm run test:taxonomy -- --write",
        );
      }
    }
  }

  const orphans = maestroRootOrphans();
  if (orphans.length) {
    errors.push(
      `Maestro root must not hold flows (use container folders). Orphans:\n  - ${orphans.join("\n  - ")}`,
    );
  }

  const flowRefs = assertReferencedMaestroFlows();
  if (flowRefs.missing.length) {
    errors.push(
      `Maestro flow path(s) referenced but missing on disk (${flowRefs.missing.length}/${flowRefs.checked} refs):\n  - ${flowRefs.missing.join("\n  - ")}`,
    );
  }

  const scriptRefs = assertPackageJsonScriptFileTargets();
  if (scriptRefs.missing.length) {
    errors.push(
      `package.json script file path(s) missing on disk (${scriptRefs.missing.length}/${scriptRefs.checked} refs):\n  - ${scriptRefs.missing.join("\n  - ")}`,
    );
  }

  // Enforce naming for tests/edge and tests/dual-plane only (greenfield homes)
  for (const f of reg.entries.filter((e) => e.kind === "jest")) {
    if (
      (f.path.startsWith("tests/edge/") || f.path.startsWith("tests/dual-plane/")) &&
      !jestNameOk(f.path)
    ) {
      errors.push(
        `Naming violation (${f.path}): use {domain}.{capability}[.facet].test.ts — see documentation/TEST_TAXONOMY.md`,
      );
    }
  }

  // Maestro naming: warn on legacy odd names; hard-fail only for brand-new container homes
  // when we add enforcement later. New flows MUST follow TEST_TAXONOMY.md.
  const maestroNameRe =
    /^(P\d{2}|U\d{2}|P-[A-Z]-|U-[A-Z]-|DU-|O\d|S\d|R\d{2}|W-|E-|D\d{2}|H\d{2}|task-core-|qa01-|journey-|launch-|sprint7-|metro-prod-|store-demo-|marketing-|app-store-|ipad-store-|pick-first-|library-|_|bootstrap-|\d{2}-)/;
  const maestroWarnings = [];
  for (const f of reg.entries.filter((e) => e.kind === "maestro")) {
    const base = path.basename(f.path);
    if (base.startsWith("_")) continue;
    if (!maestroNameRe.test(base)) {
      maestroWarnings.push(f.path);
    }
  }

  if (errors.length) {
    console.error("test:taxonomy FAILED\n");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log("test:taxonomy OK");
  console.log(
    `(maestro flow path refs checked=${flowRefs.checked} missing=0)`,
  );
  console.log(
    `(package.json script file refs checked=${scriptRefs.checked} missing=0)`,
  );
  if (!WRITE) {
    console.log(
      `(registry ${reg.entries.length} entries; containers ${CONTAINERS.length})`,
    );
  }
  if (maestroWarnings.length) {
    console.log(
      `naming advisories (legacy Maestro names — do not copy): ${maestroWarnings.length}`,
    );
  }
}

main();
