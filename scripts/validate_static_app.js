const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "index.html");

function fail(message) {
  throw new Error(message);
}

function localAssetPaths(html, attribute, tagPattern) {
  return [...html.matchAll(tagPattern)]
    .map((match) => match[attribute])
    .filter((assetPath) => !/^(?:[a-z]+:|\/\/|#)/i.test(assetPath));
}

function assertUnique(paths, label) {
  const duplicates = paths.filter((assetPath, index) => paths.indexOf(assetPath) !== index);
  if (duplicates.length) fail(`${label} contains duplicate references: ${[...new Set(duplicates)].join(", ")}`);
}

function assertFilesExist(paths, label) {
  const missing = paths.filter((assetPath) => !fs.existsSync(path.join(ROOT, assetPath)));
  if (missing.length) fail(`${label} contains missing files: ${missing.join(", ")}`);
}

function assertBalancedCss(css, fileName) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  for (const character of withoutComments) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) fail(`${fileName} has an unexpected closing brace`);
  }
  if (depth !== 0) fail(`${fileName} has unbalanced braces`);
}

function validateJavaScript(html, scriptPaths) {
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1]);
  const applicationScripts = scriptPaths.map((scriptPath) => fs.readFileSync(path.join(ROOT, scriptPath), "utf8"));
  new vm.Script([...inlineScripts, ...applicationScripts].join("\n;\n"), {
    filename: "combined-static-app.js"
  });
}

function validateJsonData() {
  const dataDirectory = path.join(ROOT, "data");
  const files = fs.readdirSync(dataDirectory).filter((fileName) => fileName.endsWith(".json"));
  for (const fileName of files) {
    const filePath = path.join(dataDirectory, fileName);
    try {
      JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      fail(`${path.relative(ROOT, filePath)} is not valid JSON: ${error.message}`);
    }
  }
  return files.length;
}

function main() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const stylesheetPaths = localAssetPaths(
    html,
    1,
    /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
  );
  const scriptPaths = localAssetPaths(html, 1, /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi);

  if (!stylesheetPaths.length) fail("index.html does not reference any stylesheets");
  if (!scriptPaths.length) fail("index.html does not reference any application scripts");
  if (scriptPaths.at(-1) !== "assets/js/bootstrap.js") fail("bootstrap.js must be the final application script");

  assertUnique(stylesheetPaths, "Stylesheet list");
  assertUnique(scriptPaths, "Script list");
  assertFilesExist(stylesheetPaths, "Stylesheet list");
  assertFilesExist(scriptPaths, "Script list");

  for (const stylesheetPath of stylesheetPaths) {
    assertBalancedCss(fs.readFileSync(path.join(ROOT, stylesheetPath), "utf8"), stylesheetPath);
  }
  validateJavaScript(html, scriptPaths);
  const jsonCount = validateJsonData();

  console.log(`Validated ${stylesheetPaths.length} stylesheets, ${scriptPaths.length} scripts, and ${jsonCount} JSON files.`);
}

main();
