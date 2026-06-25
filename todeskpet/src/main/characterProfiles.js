const fs = require("node:fs");
const path = require("node:path");

const CHARACTERS_DIR = "characters";
const DEFAULT_CHARACTER_ID = "arcueid";

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeCharacter(raw, appRoot, dirName) {
  const id = String(raw?.id || dirName || "").trim();
  if (!id) return null;

  const baseDir = path.join(appRoot, CHARACTERS_DIR, dirName);
  const resolveOptionalPath = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    return path.isAbsolute(text) ? text : path.resolve(baseDir, text);
  };

  const moodPortraitPaths = Object.fromEntries(
    Object.entries(raw?.moodPortraitPaths || {}).map(([key, value]) => [key, resolveOptionalPath(value)])
  );

  return {
    id,
    name: String(raw?.name || id).trim(),
    description: String(raw?.description || "").trim(),
    systemPrompt: String(raw?.systemPrompt || "").trim(),
    corpusDir: resolveOptionalPath(raw?.corpusDir),
    moodPortraitPaths,
    ttsDefaults: {
      provider: raw?.ttsDefaults?.provider,
      qwenTtsMode: raw?.ttsDefaults?.qwenTtsMode,
      qwenTtsLanguage: raw?.ttsDefaults?.qwenTtsLanguage,
      qwenTtsSpeaker: raw?.ttsDefaults?.qwenTtsSpeaker,
      sovitsRefAudioPath: resolveOptionalPath(raw?.ttsDefaults?.sovitsRefAudioPath),
      sovitsPromptText: String(raw?.ttsDefaults?.sovitsPromptText || "").trim()
    }
  };
}

function loadCharacterPackages(appRoot) {
  const root = path.join(appRoot, CHARACTERS_DIR);
  if (!fs.existsSync(root)) return [];

  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const filePath = path.join(root, entry.name, "character.json");
      return normalizeCharacter(readJson(filePath, null), appRoot, entry.name);
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

function getCharacterPackage(appRoot, id = DEFAULT_CHARACTER_ID) {
  const characters = loadCharacterPackages(appRoot);
  return (
    characters.find((item) => item.id === id) ||
    characters.find((item) => item.id === DEFAULT_CHARACTER_ID) ||
    characters[0] ||
    null
  );
}

module.exports = {
  DEFAULT_CHARACTER_ID,
  getCharacterPackage,
  loadCharacterPackages
};
