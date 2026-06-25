const assert = require("node:assert/strict");
const test = require("node:test");

const { getCharacterPackage, loadCharacterPackages } = require("../src/main/characterProfiles");

test("loads Arcueid as a file-based character package", () => {
  const appRoot = process.cwd();
  const characters = loadCharacterPackages(appRoot);
  const arcueid = getCharacterPackage(appRoot, "arcueid");

  assert.ok(characters.some((item) => item.id === "arcueid"));
  assert.equal(arcueid.name, "爱尔奎特");
  assert.ok(arcueid.systemPrompt.length > 0);
});
