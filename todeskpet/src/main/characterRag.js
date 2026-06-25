const fs = require("node:fs");
const path = require("node:path");

const CORPUS_DIR_NAME = "scene-emotion-happy-user-reply-zh";
const MAX_BIBLE_CHARS = 3600;
const MAX_SNIPPET_CHARS = 360;
const DEFAULT_MAX_CORPUS = 6;
const DEFAULT_MAX_EXAMPLES = 4;
const CJK_STOP_CHARS = new Set(
  "的一是在不了有和就都而及与着或个啊呢吗吧呀么你我他她它这那哪什怎很还要会想说看去来给把被让到里上中下"
    .split("")
);

function readText(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return fallback;
  }
}

function readJsonl(filePath) {
  return readText(filePath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function compact(text, maxChars = MAX_SNIPPET_CHARS) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1)}…`;
}

function tokenize(text) {
  const normalized = String(text || "").toLowerCase();
  const latin = normalized.match(/[a-z0-9_]{2,}/g) || [];
  const cjk = (normalized.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || [])
    .filter((char) => !CJK_STOP_CHARS.has(char));
  const grams = [];

  for (let index = 0; index < cjk.length - 1; index += 1) {
    grams.push(`${cjk[index]}${cjk[index + 1]}`);
  }

  return [...new Set([...latin, ...cjk, ...grams])];
}

function scoreText(queryTokens, text, boost = 1) {
  if (!queryTokens.length) return 0;
  const haystack = new Set(tokenize(text));
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.has(token)) score += token.length > 1 ? 1.4 : 0.6;
  }
  return score * boost;
}

function scoreItem(queryTokens, item, isExample = false) {
  const fields = [
    [item.user, 2.2],
    [item.context, 1.2],
    [item.scene, 1.1],
    [item.emotion, 0.8],
    [item.speaking_to, 0.8],
    [item.reply_zh, isExample ? 0.9 : 0.65],
    [item.reply_ja, isExample ? 0.9 : 0.65]
  ];

  return fields.reduce((sum, [value, boost]) => sum + scoreText(queryTokens, value, boost), 0);
}

function mapEmotion(emotion) {
  const value = String(emotion || "").toLowerCase();
  if (["happy", "playful", "tender"].includes(value)) return "Happy";
  if (["cold", "dangerous", "angry", "determined"].includes(value)) return "Thinking";
  if (["pain"].includes(value)) return "Confused";
  if (["calm", "neutral"].includes(value)) return "Neutral";
  return "Neutral";
}

function ranked(items, queryTokens, limit, isExample = false) {
  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreItem(queryTokens, item, isExample)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}

function fallbackExamples(examples, limit) {
  return examples
    .filter((item) => ["Happy", "Playful", "Tender", "Neutral"].includes(String(item.emotion || "")))
    .slice(0, limit);
}

function formatExample(item, index) {
  return [
    `示例 ${index + 1} / ${item.scene || "未分类"} / ${item.emotion || "Neutral"}`,
    `用户：${compact(item.user, 120)}`,
    `回复：`,
    `[Emotion: ${mapEmotion(item.emotion)}]`,
    `中文：${compact(item.reply_zh)}`,
    `日本語：${compact(item.reply_ja)}`
  ].join("\n");
}

function formatCorpusLine(item, index) {
  return [
    `片段 ${index + 1} / ${item.scene || "未分类"} / ${item.emotion || "Neutral"} / 对象：${item.speaking_to || "不明"}`,
    `中文原台词：${compact(item.reply_zh)}`,
    `日本語原台词：${compact(item.reply_ja)}`
  ].join("\n");
}

function createCharacterRag(appRoot) {
  const defaultCorpusDir = path.join(appRoot, CORPUS_DIR_NAME);

  const caches = new Map();

  function corpusDirFor(characterPackage = {}) {
    return characterPackage.corpusDir || defaultCorpusDir;
  }

  function load(characterPackage = {}) {
    const corpusDir = corpusDirFor(characterPackage);
    if (caches.has(corpusDir)) return caches.get(corpusDir);

    const biblePath = path.join(corpusDir, "arcueid_character_bible.md");
    const examplesPath = path.join(corpusDir, "arcueid_style_examples.json");
    const corpusPath = path.join(corpusDir, "arcueid_clean_corpus.jsonl");
    const summaryPath = path.join(corpusDir, "arcueid_corpus_summary.json");

    const cache = {
      characterId: characterPackage.id || "arcueid",
      characterName: characterPackage.name || "爱尔奎特",
      systemPrompt: characterPackage.systemPrompt || "",
      corpusDir,
      bible: compact(readText(biblePath), MAX_BIBLE_CHARS),
      examples: readJson(examplesPath, []),
      corpus: readJsonl(corpusPath),
      summary: readJson(summaryPath, null)
    };

    caches.set(corpusDir, cache);
    return cache;
  }

  function buildContext({ message, screenContext, history, characterPackage } = {}) {
    const data = load(characterPackage);
    if (!data.systemPrompt && !data.bible && !data.examples.length && !data.corpus.length) return "";

    const historyText = Array.isArray(history)
      ? history.slice(-4).map((item) => item.content).join("\n")
      : "";
    const query = `${message || ""}\n${screenContext || ""}\n${historyText}`;
    const queryTokens = tokenize(query);

    const matchedExamples = ranked(data.examples, queryTokens, DEFAULT_MAX_EXAMPLES, true);
    const matchedCorpus = ranked(data.corpus, queryTokens, DEFAULT_MAX_CORPUS, false);
    const examples = matchedExamples.length
      ? matchedExamples
      : fallbackExamples(data.examples, DEFAULT_MAX_EXAMPLES);
    const corpus = matchedCorpus.length
      ? matchedCorpus
      : data.corpus
          .filter((item) => ["日常闲聊", "与志贵对话", "亲密/告白"].includes(item.scene))
          .slice(0, DEFAULT_MAX_CORPUS);

    const stats = data.summary
      ? `语料统计：清洗台词 ${data.summary.total_blocks || data.corpus.length} 条；风格示例 ${data.summary.total_examples || data.examples.length} 条。`
      : `语料统计：清洗台词 ${data.corpus.length} 条；风格示例 ${data.examples.length} 条。`;

    return [
      `【角色包：${data.characterName}】`,
      "以下内容用于保持人物说话风格、世界观和中日双语口吻。不要向用户提到语料、检索、RAG、来源文件或片段编号；不要逐字复读，除非用户明确要求引用原台词。",
      stats,
      data.systemPrompt ? `\n【角色提示词】\n${data.systemPrompt}` : "",
      "",
      "【角色圣经】",
      data.bible,
      "",
      "【相关风格示例】",
      ...examples.map(formatExample),
      "",
      "【相关原作台词片段】",
      ...corpus.map(formatCorpusLine),
      "",
      "【使用要求】",
      "1. 回答要像爱尔奎特本人：直接、明快、好奇、任性但亲近；危险或敌对话题时可变得冷而锋利。",
      "2. 当前用户可视作“志贵式的特殊对象”，但不要机械地每句都叫志贵。",
      "3. 结合用户当前问题生成新回答，不要把检索片段当作固定答案。",
      "4. 输出仍必须严格为：[Emotion: ...] + 中文：... + 日本語：...。"
    ].join("\n");
  }

  function getStats(characterPackage) {
    const data = load(characterPackage);
    return {
      enabled: Boolean(data.bible || data.examples.length || data.corpus.length),
      characterId: data.characterId,
      characterName: data.characterName,
      corpusDir: data.corpusDir,
      bibleChars: data.bible.length,
      examples: data.examples.length,
      corpus: data.corpus.length
    };
  }

  return {
    buildContext,
    getStats
  };
}

module.exports = {
  createCharacterRag
};
