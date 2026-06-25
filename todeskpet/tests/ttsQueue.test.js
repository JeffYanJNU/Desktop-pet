const assert = require("node:assert/strict");
const test = require("node:test");

const { createTtsQueue } = require("../src/main/ttsQueue");

test("TTS queue caches successful audio results", async () => {
  let calls = 0;
  const queue = createTtsQueue({
    synthesize: async (text) => {
      calls += 1;
      return { ok: true, mimeType: "audio/wav", audioBase64: Buffer.from(text).toString("base64") };
    }
  });

  const first = await queue.speak("こんにちは");
  const second = await queue.speak("こんにちは");

  assert.equal(first.cached, undefined);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
});

test("TTS queue runs synthesis sequentially", async () => {
  const order = [];
  const queue = createTtsQueue({
    synthesize: async (text) => {
      order.push(`start:${text}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`end:${text}`);
      return { ok: true, mimeType: "audio/wav", audioBase64: text };
    }
  });

  await Promise.all([queue.speak("a"), queue.speak("b")]);

  assert.deepEqual(order, ["start:a", "end:a", "start:b", "end:b"]);
});
