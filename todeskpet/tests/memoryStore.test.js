const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createMemoryStore } = require("../src/main/memoryStore");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tablepet-memory-"));
}

test("manual memories keep category, tags, and sensitive marker", () => {
  const store = createMemoryStore(tempDir());
  const snapshot = store.addManual({
    type: "dialogue",
    category: "project",
    tags: "tts,缓存",
    sensitive: true,
    content: "记住：TTS 队列需要缓存同一句播报"
  });

  assert.equal(snapshot.items[0].category, "project");
  assert.deepEqual(snapshot.items[0].tags, ["tts", "缓存"]);
  assert.equal(snapshot.items[0].sensitive, true);
});

test("clearSensitive removes marked and key-like memories", () => {
  const store = createMemoryStore(tempDir());
  store.addManual({ content: "普通项目记忆", category: "project" });
  store.addManual({ content: "api key 是 secret-value", category: "project" });
  const snapshot = store.clearSensitive();

  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0].content, "普通项目记忆");
});

test("export and import round-trip normalized memory data", () => {
  const source = createMemoryStore(tempDir());
  source.addManual({ content: "我喜欢日文语音", category: "preference", tags: ["语音"] });

  const target = createMemoryStore(tempDir());
  const snapshot = target.importData(source.exportData());

  assert.equal(snapshot.items[0].category, "preference");
  assert.deepEqual(snapshot.items[0].tags, ["语音"]);
});
