const fs = require("fs");
const path = require("path");

function patchFmtBaseHeader(projectRoot) {
  const fmtBaseHeaderPath = path.join(projectRoot, "ios", "Pods", "fmt", "include", "fmt", "base.h");
  if (!fs.existsSync(fmtBaseHeaderPath)) {
    return { patched: false, reason: "fmt base.h not found" };
  }

  const contents = fs.readFileSync(fmtBaseHeaderPath, "utf8");
  const next = contents.replace(
    "#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L",
    "#elif defined(__apple_build_version__)",
  );

  if (next === contents) {
    return { patched: false, reason: "pattern not found (already patched or different fmt version)" };
  }

  try {
    fs.writeFileSync(fmtBaseHeaderPath, next);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EACCES") {
      fs.chmodSync(fmtBaseHeaderPath, 0o644);
      fs.writeFileSync(fmtBaseHeaderPath, next);
    } else {
      throw error;
    }
  }
  return { patched: true, reason: "patched apple clang consteval gate" };
}

function main() {
  if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== "ios") {
    return;
  }

  const projectRoot = process.cwd();
  const result = patchFmtBaseHeader(projectRoot);
  process.stdout.write(`[eas-build-post-install] fmt patch: ${result.patched ? "applied" : "skipped"} (${result.reason})\n`);
}

main();
