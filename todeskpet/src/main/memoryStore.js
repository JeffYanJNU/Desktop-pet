const fs = require("node:fs");
const path = require("node:path");

const VECTOR_DIMENSIONS = 64;
const MAX_RETRIEVED = 8;
const EMOTION_PREFIX = /^\[Emotion:\s*(Neutral|Happy|Thinking|Confused|Encouraging)\]\s*/i;
const PROJECT_HINT = /项目|代码|程序|功能|bug|报错|需求|实现|文件|配置|electron|api|memory|setting|voice|tts|sovits|tablepet|ui|project|code|task|feature|error|config/i;
const PREFERENCE_HINT = /喜欢|讨厌|偏好|希望|习惯|不喜欢|like|love|prefer|dislike|hate/i;
const SENSITIVE_HINT = /密码|密钥|token|secret|api[_ -]?key|authorization|cookie|身份证|手机号|银行卡|password|credential/i;
const MEMORY_CATEGORIES = new Set(["project", "life", "preference"]);

const DEFAULT_CONFIG = {
  maxProfile: 80,
  maxSummaries: 80,
  maxMemories: 500,
  maxVectorItems: 700,
  halfLifeDays: 45,
  pruneThreshold: 0.12,
  freezeDays: 3
};

function createMemoryStore(dataDir) {
  const memoryPath = path.join(dataDir, "memory.json");
  let cache = null;

  function defaultData() {
    return {
      version: 2,
      config: { ...DEFAULT_CONFIG },
      profile: [],
      summaries: [],
      memories: [],
      vectorIndex: {
        version: 1,
        dimensions: VECTOR_DIMENSIONS,
        items: []
      }
    };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix = "mem") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function stripEmotion(text) {
    return String(text || "").replace(EMOTION_PREFIX, "").trim();
  }

  function tokenize(text) {
    const normalized = String(text || "").toLowerCase();
    const latin = normalized.match(/[a-z0-9_]{2,}/g) || [];
    const han = normalized.match(/[\u4e00-\u9fff]/g) || [];
    const hanBigrams = [];

    for (let index = 0; index < han.length - 1; index += 1) {
      hanBigrams.push(`${han[index]}${han[index + 1]}`);
    }

    return [...new Set([...latin, ...han, ...hanBigrams])];
  }

  function hashToken(token) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function embedText(text) {
    const vector = Array(VECTOR_DIMENSIONS).fill(0);
    const tokens = tokenize(text);
    if (!tokens.length) return vector;

    for (const token of tokens) {
      const hash = hashToken(token);
      const slot = hash % VECTOR_DIMENSIONS;
      const sign = hash & 1 ? 1 : -1;
      vector[slot] += sign;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => Number((value / magnitude).toFixed(6)));
  }

  function cosine(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right)) return 0;
    const length = Math.min(left.length, right.length);
    let score = 0;
    for (let index = 0; index < length; index += 1) {
      score += Number(left[index] || 0) * Number(right[index] || 0);
    }
    return score;
  }

  function normalizeItem(item, fallbackType = "dialogue") {
    const content = String(item?.content || "").trim();
    const type = item?.type || fallbackType;
    const createdAt = item?.createdAt || nowIso();
    const updatedAt = item?.updatedAt || createdAt;
    const keywords = Array.isArray(item?.keywords) ? item.keywords : tokenize(content).slice(0, 80);
    const vector = Array.isArray(item?.vector) ? item.vector : embedText(content);

    return {
      id: item?.id || createId(type),
      type,
      category: normalizeCategory(item?.category, content),
      tags: normalizeTags(item?.tags),
      sensitive: Boolean(item?.sensitive) || SENSITIVE_HINT.test(content),
      source: item?.source || "chat",
      content: content.slice(0, 800),
      keywords: keywords.slice(0, 100),
      vector,
      strength: Number(item?.strength || (type === "profile" ? 1.7 : type === "summary" ? 1.35 : 1)),
      createdAt,
      updatedAt,
      lastAccessedAt: item?.lastAccessedAt || updatedAt,
      accessCount: Number(item?.accessCount || 0),
      frozenUntil: item?.frozenUntil || freezeUntil(createdAt),
      pinned: Boolean(item?.pinned),
      archived: Boolean(item?.archived)
    };
  }

  function normalizeCategory(value, content = "") {
    const text = String(value || "").trim().toLowerCase();
    if (MEMORY_CATEGORIES.has(text)) return text;
    if (PREFERENCE_HINT.test(content)) return "preference";
    if (PROJECT_HINT.test(content)) return "project";
    return "life";
  }

  function normalizeTags(value) {
    const raw = Array.isArray(value) ? value : String(value || "").split(/[,，#\s]+/);
    return [...new Set(raw.map((item) => String(item || "").trim()).filter(Boolean))]
      .slice(0, 12);
  }

  function freezeUntil(baseDate = nowIso()) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + DEFAULT_CONFIG.freezeDays);
    return date.toISOString();
  }

  function migrateData(parsed) {
    const data = {
      ...defaultData(),
      ...parsed,
      config: { ...DEFAULT_CONFIG, ...(parsed?.config || {}) },
      profile: Array.isArray(parsed?.profile) ? parsed.profile : [],
      summaries: Array.isArray(parsed?.summaries) ? parsed.summaries : [],
      memories: Array.isArray(parsed?.memories) ? parsed.memories : []
    };

    data.profile = data.profile.map((item) => normalizeItem(item, "profile"));
    data.summaries = data.summaries.map((item) => normalizeItem({ ...item, type: "summary" }, "summary"));
    data.memories = data.memories.map((item) => normalizeItem(item, "dialogue"));
    rebuildVectorIndex(data);
    data.version = 2;
    return data;
  }

  function read() {
    if (cache) return cache;
    try {
      cache = migrateData(JSON.parse(fs.readFileSync(memoryPath, "utf8")));
    } catch {
      cache = defaultData();
    }
    return cache;
  }

  function write() {
    const data = read();
    rebuildVectorIndex(data);
    fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
    fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2), "utf8");
  }

  function allItems(data = read()) {
    return [...data.profile, ...data.summaries, ...data.memories];
  }

  function rebuildVectorIndex(data = read()) {
    const items = allItems(data)
      .filter((item) => !item.archived)
      .map((item) => ({
        id: item.id,
        type: item.type,
        content: item.content.slice(0, 220),
        keywords: item.keywords,
        vector: item.vector,
        strength: item.strength,
        updatedAt: item.updatedAt,
        lastAccessedAt: item.lastAccessedAt
      }))
      .slice(0, data.config.maxVectorItems);

    data.vectorIndex = {
      version: 1,
      dimensions: VECTOR_DIMENSIONS,
      items
    };
  }

  function effectiveStrength(item, config = read().config) {
    if (item.pinned) return Math.max(item.strength || 1, 2);
    const frozenUntil = new Date(item.frozenUntil || 0).getTime();
    if (frozenUntil > Date.now()) return item.strength || 1;

    const updatedAt = new Date(item.updatedAt || item.createdAt || Date.now()).getTime();
    const ageDays = Math.max(0, (Date.now() - updatedAt) / 864e5);
    return (item.strength || 1) * Math.pow(0.5, ageDays / config.halfLifeDays);
  }

  function pruneCollection(collection, maxItems, config) {
    const kept = collection
      .filter((item) => {
        if (item.pinned) return true;
        if (new Date(item.frozenUntil || 0).getTime() > Date.now()) return true;
        return effectiveStrength(item, config) >= config.pruneThreshold;
      })
      .sort((left, right) => {
        const leftScore = effectiveStrength(left, config) + (left.accessCount || 0) * 0.03;
        const rightScore = effectiveStrength(right, config) + (right.accessCount || 0) * 0.03;
        return rightScore - leftScore;
      });

    return kept.slice(0, maxItems);
  }

  function evolveMemories() {
    const data = read();
    data.profile = pruneCollection(data.profile, data.config.maxProfile, data.config);
    data.summaries = pruneCollection(data.summaries, data.config.maxSummaries, data.config);
    data.memories = pruneCollection(data.memories, data.config.maxMemories, data.config);
    write();
    return getPublicSnapshot();
  }

  function findCollectionForType(data, type) {
    if (type === "profile") return data.profile;
    if (type === "summary") return data.summaries;
    return data.memories;
  }

  function makeMemory(type, content, source = "chat", strength, meta = {}) {
    const cleanContent = String(content || "").trim();
    if (!cleanContent) return null;
    return normalizeItem({
      id: createId(type),
      type,
      source,
      content: cleanContent,
      strength,
      category: meta.category,
      tags: meta.tags,
      sensitive: meta.sensitive
    }, type);
  }

  function upsertByOverlap(collection, memory, minOverlap = 0.5) {
    const existing = collection.find((item) => {
      const overlap = item.keywords.filter((keyword) => memory.keywords.includes(keyword)).length;
      const denominator = Math.max(1, Math.min(item.keywords.length, memory.keywords.length));
      return overlap / denominator >= minOverlap;
    });

    if (!existing) {
      collection.unshift(memory);
      return memory;
    }

    existing.content = memory.content;
    existing.keywords = memory.keywords;
    existing.vector = memory.vector;
    existing.updatedAt = nowIso();
    existing.strength = Math.min(3, Number(existing.strength || 1) + 0.2);
    existing.frozenUntil = freezeUntil();
    return existing;
  }

  function extractUserFacts(message) {
    const text = String(message || "").trim();
    if (!text) return [];

    const facts = [];
    const patterns = [
      /(?:记住|remember)[:：]?\s*(.{2,120})/i,
      /(?:我叫|我的名字是|叫我|my name is|call me)\s*([^\n。？！!?]{1,50})/i,
      /(?:我喜欢|我爱|我偏好|i like|i love|i prefer)\s*([^\n。？！!?]{1,100})/i,
      /(?:我不喜欢|我讨厌|i dislike|i hate)\s*([^\n。？！!?]{1,100})/i,
      /(?:我的|my)\s*([^\n。？！!?]{2,100})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[0]) facts.push(match[0].trim());
    }

    return [...new Set(facts)].slice(0, 5);
  }

  function buildSummaryContent(userText, visualText, replyText) {
    const source = [userText, visualText, replyText].filter(Boolean).join("\n");
    if (!source) return "";
    const scope = PROJECT_HINT.test(source) ? "项目摘要" : "日常摘要";
    return `${scope}: ${source.replace(/\s+/g, " ").slice(0, 520)}`;
  }

  function addExchange({ message, screenContext, assistantText }) {
    const data = read();
    const userText = String(message || "").trim();
    const visualText = String(screenContext || "").trim();
    const replyText = stripEmotion(assistantText);

    if (!userText && !visualText) return getPublicSnapshot();

    for (const fact of extractUserFacts(userText)) {
      const normalizedFact = fact.startsWith("我") ? `用户${fact.slice(1)}` : `用户：${fact}`;
      const profileMemory = makeMemory("profile", normalizedFact, "auto-fact", 1.7, {
        category: "preference",
        tags: ["画像"]
      });
      if (profileMemory) upsertByOverlap(data.profile, profileMemory, 0.45);
    }

    const exchangeText = [
      userText ? `用户说：${userText}` : "",
      visualText ? `屏幕上下文：${visualText.slice(0, 260)}` : "",
      replyText ? `助手回应：${replyText.slice(0, 260)}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const shouldStoreExchange =
      userText.length >= 8 ||
      visualText.length >= 20 ||
      /记住|remember|以后|下次|喜欢|讨厌|名字|偏好|项目|任务|需求|代码|设置/i.test(userText);

    if (shouldStoreExchange) {
      const memory = makeMemory("dialogue", exchangeText, "chat", 1, {
        category: normalizeCategory("", exchangeText),
        tags: PROJECT_HINT.test(exchangeText) ? ["项目"] : [],
        sensitive: SENSITIVE_HINT.test(exchangeText)
      });
      if (memory) data.memories.unshift(memory);
    }

    const shouldSummarize = PROJECT_HINT.test(exchangeText) || exchangeText.length >= 220;
    if (shouldSummarize) {
      const summary = makeMemory("summary", buildSummaryContent(userText, visualText, replyText), "auto-summary", 1.35, {
        category: normalizeCategory("", exchangeText),
        tags: PROJECT_HINT.test(exchangeText) ? ["项目摘要"] : ["日常摘要"],
        sensitive: SENSITIVE_HINT.test(exchangeText)
      });
      if (summary) upsertByOverlap(data.summaries, summary, 0.32);
    }

    evolveMemories();
    return getPublicSnapshot();
  }

  function scoreMemory(memory, queryTokens, queryVector) {
    const memoryTokens = memory.keywords || [];
    const overlap = queryTokens.filter((token) => memoryTokens.includes(token)).length;
    const sparseScore = overlap / Math.max(1, Math.sqrt(memoryTokens.length || 1));
    const vectorScore = Math.max(0, cosine(queryVector, memory.vector));
    const strengthScore = effectiveStrength(memory);
    const recencyHours = Math.max(
      0,
      (Date.now() - new Date(memory.lastAccessedAt || memory.updatedAt || Date.now()).getTime()) / 36e5
    );
    const recency = Math.exp(-recencyHours / (24 * 30));
    const typeBoost = memory.type === "profile" ? 0.25 : memory.type === "summary" ? 0.18 : 0;

    return sparseScore * 0.9 + vectorScore * 1.4 + strengthScore * 0.35 + recency * 0.12 + typeBoost;
  }

  function retrieve(query, limit = MAX_RETRIEVED) {
    const data = read();
    const queryTokens = tokenize(query);
    const queryVector = embedText(query);
    const candidates = allItems(data)
      .filter((memory) => !memory.archived)
      .map((memory) => ({ memory, score: scoreMemory(memory, queryTokens, queryVector) }))
      .filter((item) => item.score > 0.18)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    const accessedAt = nowIso();
    for (const item of candidates) {
      item.memory.lastAccessedAt = accessedAt;
      item.memory.accessCount = Number(item.memory.accessCount || 0) + 1;
      item.memory.strength = Math.min(3, Number(item.memory.strength || 1) + 0.03);
    }

    if (candidates.length) write();
    return candidates.map((item) => item.memory);
  }

  function buildContext({ message, screenContext }) {
    const query = `${message || ""}\n${screenContext || ""}`;
    const data = read();
    const stableProfile = data.profile
      .filter((item) => !item.archived)
      .sort((left, right) => effectiveStrength(right, data.config) - effectiveStrength(left, data.config))
      .slice(0, 4);
    const related = retrieve(query, MAX_RETRIEVED);
    const memoriesById = new Map([...stableProfile, ...related].map((memory) => [memory.id, memory]));
    const memories = [...memoriesById.values()].slice(0, MAX_RETRIEVED);

    if (!memories.length) return "";

    return [
      "以下是本地长期记忆。只在和当前对话相关时自然使用，不要逐字复述，不要声称自己有数据库。",
      ...memories.map((memory, index) => `${index + 1}. [${memory.type}] ${memory.content}`)
    ].join("\n");
  }

  function getPublicSnapshot(query = "") {
    const data = read();
    const items = query ? search(query, 40, false) : allItems(data).slice(0, 80);
    return {
      path: memoryPath,
      version: data.version,
      config: data.config,
      profileCount: data.profile.length,
      summaryCount: data.summaries.length,
      memoryCount: data.memories.length,
      vectorCount: data.vectorIndex.items.length,
      recentProfile: data.profile.slice(0, 8),
      recentSummaries: data.summaries.slice(0, 8),
      recentMemories: data.memories.slice(0, 12),
      items: items.map(toPublicItem)
    };
  }

  function toPublicItem(item) {
    return {
      id: item.id,
      type: item.type,
      category: item.category,
      tags: item.tags,
      sensitive: Boolean(item.sensitive),
      source: item.source,
      content: item.content,
      strength: Number(item.strength || 0),
      effectiveStrength: Number(effectiveStrength(item).toFixed(3)),
      keywords: item.keywords,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      frozenUntil: item.frozenUntil,
      accessCount: item.accessCount || 0,
      pinned: Boolean(item.pinned),
      archived: Boolean(item.archived)
    };
  }

  function search(query, limit = 40, updateAccess = true) {
    const queryText = String(query || "").trim();
    if (!queryText) {
      return allItems(read()).slice(0, limit);
    }

    const data = read();
    const queryTokens = tokenize(queryText);
    const queryVector = embedText(queryText);
    const results = allItems(data)
      .map((memory) => ({ memory, score: scoreMemory(memory, queryTokens, queryVector) }))
      .filter((item) => item.score > 0.12 || item.memory.content.toLowerCase().includes(queryText.toLowerCase()))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((item) => item.memory);

    if (updateAccess && results.length) {
      const accessedAt = nowIso();
      for (const memory of results) {
        memory.lastAccessedAt = accessedAt;
        memory.accessCount = Number(memory.accessCount || 0) + 1;
      }
      write();
    }

    return results;
  }

  function addManual({ type = "dialogue", content = "", pinned = false, category = "", tags = "", sensitive = false } = {}) {
    const data = read();
    const safeType = ["profile", "summary", "dialogue"].includes(type) ? type : "dialogue";
    const memory = makeMemory(safeType, content, "manual", safeType === "profile" ? 1.8 : 1.2, {
      category,
      tags,
      sensitive
    });
    if (!memory) return getPublicSnapshot();

    memory.pinned = Boolean(pinned);
    findCollectionForType(data, safeType).unshift(memory);
    evolveMemories();
    return getPublicSnapshot();
  }

  function updateMemory(id, patch = {}) {
    const data = read();
    const memory = allItems(data).find((item) => item.id === id);
    if (!memory) return getPublicSnapshot();

    if (Object.prototype.hasOwnProperty.call(patch, "content")) {
      memory.content = String(patch.content || "").trim().slice(0, 800);
      memory.keywords = tokenize(memory.content).slice(0, 100);
      memory.vector = embedText(memory.content);
      memory.category = normalizeCategory(memory.category, memory.content);
      memory.sensitive = Boolean(memory.sensitive) || SENSITIVE_HINT.test(memory.content);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "pinned")) {
      memory.pinned = Boolean(patch.pinned);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "category")) {
      memory.category = normalizeCategory(patch.category, memory.content);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "tags")) {
      memory.tags = normalizeTags(patch.tags);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "sensitive")) {
      memory.sensitive = Boolean(patch.sensitive);
    }

    memory.updatedAt = nowIso();
    memory.frozenUntil = freezeUntil();
    write();
    return getPublicSnapshot();
  }

  function deleteMemory(id) {
    const data = read();
    data.profile = data.profile.filter((item) => item.id !== id);
    data.summaries = data.summaries.filter((item) => item.id !== id);
    data.memories = data.memories.filter((item) => item.id !== id);
    write();
    return getPublicSnapshot();
  }

  function clear() {
    cache = defaultData();
    write();
    return getPublicSnapshot();
  }

  function clearSensitive() {
    const data = read();
    const keep = (item) => !item.sensitive && !SENSITIVE_HINT.test(item.content || "");
    data.profile = data.profile.filter(keep);
    data.summaries = data.summaries.filter(keep);
    data.memories = data.memories.filter(keep);
    write();
    return getPublicSnapshot();
  }

  function organizeFromLlmResult(result = {}) {
    const incoming = Array.isArray(result?.memories) ? result.memories : [];
    if (!incoming.length) {
      throw new Error("LLM 没有返回有效记忆");
    }

    const previous = read();
    const beforeTotal = previous.profile.length + previous.summaries.length + previous.memories.length;
    const next = {
      ...defaultData(),
      config: { ...previous.config }
    };
    const organizedAt = nowIso();
    let accepted = 0;

    for (const item of incoming.slice(0, 180)) {
      const rawType = String(item?.type || "dialogue").trim();
      const type = ["profile", "summary", "dialogue"].includes(rawType) ? rawType : "dialogue";
      const content = String(item?.content || "").trim();
      if (content.length < 3) continue;
      const strength = Math.max(
        0.4,
        Math.min(3, Number(item?.strength || (type === "profile" ? 1.8 : type === "summary" ? 1.35 : 1)))
      );
      const memory = normalizeItem({
        id: createId(type === "dialogue" ? "mem" : type),
        type,
        source: "llm-organized",
        content,
        category: item?.category,
        tags: item?.tags,
        sensitive: Boolean(item?.sensitive),
        pinned: Boolean(item?.pinned),
        strength,
        createdAt: organizedAt,
        updatedAt: organizedAt,
        lastAccessedAt: organizedAt
      }, type);
      findCollectionForType(next, type).push(memory);
      accepted += 1;
    }

    if (!accepted) {
      throw new Error("LLM 返回的记忆全部为空或无效，已取消写入");
    }

    cache = next;
    write();
    const snapshot = getPublicSnapshot();
    const afterTotal = snapshot.profileCount + snapshot.summaryCount + snapshot.memoryCount;
    return {
      ...snapshot,
      organized: {
        provider: "llm",
        beforeTotal,
        afterTotal,
        accepted,
        removed: Math.max(0, beforeTotal - afterTotal),
        summary: String(result?.summary || "").trim().slice(0, 300),
        organizedAt
      }
    };
  }

  function exportData() {
    const data = read();
    return {
      ...data,
      exportedAt: nowIso()
    };
  }

  function importData(nextData) {
    cache = migrateData(nextData || {});
    write();
    return getPublicSnapshot();
  }

  return {
    addExchange,
    addManual,
    buildContext,
    clear,
    clearSensitive,
    deleteMemory,
    evolveMemories,
    exportData,
    getPublicSnapshot,
    importData,
    organizeFromLlmResult,
    search: (query, limit) => search(query, limit).map(toPublicItem),
    updateMemory
  };
}

module.exports = { createMemoryStore };
