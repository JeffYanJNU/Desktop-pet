function createTtsQueue({ synthesize, getCacheKey, maxEntries = 24 } = {}) {
  if (typeof synthesize !== "function") {
    throw new TypeError("createTtsQueue requires a synthesize function");
  }

  const cache = new Map();
  let tail = Promise.resolve();

  function remember(key, value) {
    if (!key || !value?.ok || !value.audioBase64) return;
    cache.set(key, value);
    while (cache.size > maxEntries) {
      cache.delete(cache.keys().next().value);
    }
  }

  function speak(text) {
    const value = String(text || "").trim();
    if (!value) return Promise.resolve({ ok: false, skipped: true, reason: "empty speech text" });

    const key = typeof getCacheKey === "function" ? getCacheKey(value) : value;
    if (key && cache.has(key)) {
      return Promise.resolve({ ...cache.get(key), cached: true });
    }

    const task = tail
      .catch(() => null)
      .then(async () => {
        const result = await synthesize(value);
        remember(key, result);
        return result;
      });

    tail = task.catch(() => null);
    return task;
  }

  function clear() {
    cache.clear();
    tail = Promise.resolve();
  }

  return {
    clear,
    speak,
    size: () => cache.size
  };
}

module.exports = { createTtsQueue };
