import json
import re
from collections import Counter, defaultdict
from pathlib import Path


CN_DIR = Path(r"E:\tsukihime_base_romfs_extracted\role_marked_chinese_corpus\by_script_txt")
JA_DIR = Path(r"E:\tsukihime_base_romfs_extracted\role_marked_corpus\by_script_txt")
OUT_DIR = Path(r"C:\Users\Lenovo\Documents\Codex\2026-05-25\scene-emotion-happy-user-reply-zh")
CHARACTER = "爱尔奎特"


LINE_RE = re.compile(r"^\[(?P<speaker>[^\]]+)\]\s*(?P<text>.*)$")
TEXT_MARKS_RE = re.compile(r"[「」『』“”]")


def read_lines(path: Path):
    return path.read_text(encoding="utf-8").splitlines()


def parse_lines(path: Path):
    rows = []
    for i, raw in enumerate(read_lines(path), 1):
        m = LINE_RE.match(raw)
        if not m:
            rows.append({"line": i, "speaker": None, "text": raw.strip(), "raw": raw})
            continue
        rows.append(
            {
                "line": i,
                "speaker": m.group("speaker").strip(),
                "text": m.group("text").strip(),
                "raw": raw,
            }
        )
    return rows


def clean_text(text: str):
    text = text.strip()
    text = TEXT_MARKS_RE.sub("", text)
    text = re.sub(r"<([^|>]+)\|([^>]+)>", r"\1", text)
    text = text.replace("　", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def route_from_file(name: str):
    if "ARC" in name:
        return "Arcueid线"
    if "CIEL" in name:
        return "Ciel线"
    if name.startswith("QA_"):
        return "QA/附加"
    return "共通/其他"


def chapter_from_file(name: str):
    m = re.match(r"(?P<day>\d{2})_(?P<route>\d{2}[A-Z]?)_(?P<script>[^.]+)", name)
    if not m:
        return name.rsplit(".", 1)[0]
    return f"Day {int(m.group('day')):02d} / {m.group('script')}"


def previous_next_speaker(rows, idx):
    prev_speaker = None
    next_speaker = None
    for j in range(idx - 1, max(-1, idx - 9), -1):
        sp = rows[j]["speaker"]
        if sp and sp not in {CHARACTER, "旁白", "系统"}:
            prev_speaker = sp
            break
    for j in range(idx + 1, min(len(rows), idx + 9)):
        sp = rows[j]["speaker"]
        if sp and sp not in {CHARACTER, "旁白", "系统"}:
            next_speaker = sp
            break
    return prev_speaker or next_speaker or "不明"


def infer_scene(text: str, target: str, filename: str):
    t = text
    if any(k in t for k in ["玩具", "脑袋交给我", "杀了你", "收下志贵"]) or "CIEL14B" in filename or "CIEL15" in filename:
        return "暴走/吸血冲动"
    if any(k in t for k in ["杀", "死徒", "祖", "罗亚", "武器", "火焰", "休息时间", "蛮族", "契约", "吸血"]):
        return "战斗/狩猎"
    if any(k in t for k in ["喜欢", "最喜欢", "在一起", "声音", "约会", "好久没这样见面"]):
        return "亲密/告白"
    if any(k in t for k in ["对不起", "不好意思", "极限", "伤", "疼", "倒下", "抱"]):
        return "受伤/脆弱"
    if any(k in t for k in ["笨蛋", "讨厌", "背叛", "那个女人", "为什么", "生气"]):
        return "争执/吃醋"
    if any(k in t for k in ["出去", "出门", "电影", "有趣", "无聊", "晚饭", "早饭", "肚子"]):
        return "日常闲聊"
    if any(k in t for k in ["记录", "灵魂", "肉体", "存在", "规则", "永恒", "真祖", "吸血鬼"]):
        return "世界观说明"
    if any(k in t for k in ["动", "离开", "不要", "不行", "等不下去"]):
        return "命令/保护"
    if target == "远野志贵":
        return "与志贵对话"
    return "其他"


def infer_emotion(text: str, scene: str):
    t = text
    if scene == "暴走/吸血冲动":
        return "Dangerous"
    if any(k in t for k in ["最喜欢", "喜欢你", "在一起", "声音"]):
        return "Tender"
    if any(k in t for k in ["啊哈哈", "对啊对啊", "当然", "有趣", "开心", "玩"]):
        return "Happy"
    if any(k in t for k in ["笨蛋", "哎呀", "对吧", "奇怪", "真是", "哦是吗", "啊"]):
        return "Playful"
    if any(k in t for k in ["无礼", "蛮族", "三流", "杀", "死掉", "脑袋", "吸血", "契约"]):
        return "Cold"
    if any(k in t for k in ["不行", "等不下去", "不要离开", "别动", "休息时间"]):
        return "Determined"
    if any(k in t for k in ["对不起", "不好意思", "极限", "伤", "疼", "呼～"]):
        return "Pain"
    if any(k in t for k in ["背叛", "那个女人", "讨厌", "为什么"]):
        return "Angry"
    if scene == "世界观说明":
        return "Calm"
    return "Neutral"


def context_hint(rows, idx, filename, target, scene):
    speakers = []
    for j in range(max(0, idx - 5), min(len(rows), idx + 6)):
        sp = rows[j]["speaker"]
        if sp and sp not in {"旁白", "系统", CHARACTER} and sp not in speakers:
            speakers.append(sp)
    with_whom = "、".join(speakers) if speakers else target
    return f"{route_from_file(filename)} / {chapter_from_file(filename)}；场景归类：{scene}；对话对象推定：{target}；邻近参与者：{with_whom}。"


def collect_blocks():
    blocks = []
    for cn_path in sorted(CN_DIR.glob("*.txt")):
        ja_path = JA_DIR / cn_path.name
        cn_rows = parse_lines(cn_path)
        ja_rows = parse_lines(ja_path) if ja_path.exists() else []
        i = 0
        while i < len(cn_rows):
            row = cn_rows[i]
            if row["speaker"] != CHARACTER:
                i += 1
                continue

            start = i
            cn_parts = []
            ja_parts = []
            line_numbers = []
            while i < len(cn_rows) and cn_rows[i]["speaker"] == CHARACTER:
                cn_parts.append(clean_text(cn_rows[i]["text"]))
                line_numbers.append(cn_rows[i]["line"])
                if i < len(ja_rows) and ja_rows[i]["speaker"] == CHARACTER:
                    ja_parts.append(clean_text(ja_rows[i]["text"]))
                i += 1

            cn_text = "\n".join(p for p in cn_parts if p).strip()
            ja_text = "\n".join(p for p in ja_parts if p).strip()
            if not cn_text:
                continue
            target = previous_next_speaker(cn_rows, start)
            scene = infer_scene(cn_text, target, cn_path.name)
            emotion = infer_emotion(cn_text, scene)
            block_id = f"arcueid_{len(blocks)+1:04d}"
            blocks.append(
                {
                    "id": block_id,
                    "character": CHARACTER,
                    "route": route_from_file(cn_path.name),
                    "chapter": chapter_from_file(cn_path.name),
                    "script_file": cn_path.name,
                    "line_start": min(line_numbers),
                    "line_end": max(line_numbers),
                    "scene": scene,
                    "emotion": emotion,
                    "speaking_to": target,
                    "context": context_hint(cn_rows, start, cn_path.name, target, scene),
                    "reply_zh": cn_text,
                    "reply_ja": ja_text or None,
                }
            )
    return blocks


def quality_score(block):
    text = block["reply_zh"]
    compact = re.sub(r"[――…\s！？。，、？!]", "", text)
    score = 0
    if 12 <= len(compact) <= 180:
        score += 2
    if len(compact) >= 24:
        score += 1
    if block["speaking_to"] == "远野志贵":
        score += 2
    if block["reply_ja"]:
        score += 1
    if block["emotion"] in {"Happy", "Playful", "Tender", "Cold", "Determined", "Pain", "Angry"}:
        score += 2
    if block["scene"] in {"日常闲聊", "亲密/告白", "战斗/狩猎", "暴走/吸血冲动", "争执/吃醋", "受伤/脆弱", "命令/保护", "世界观说明"}:
        score += 1
    if len(compact) < 8 or text in {"……", "――――", "？"}:
        score -= 4
    if re.fullmatch(r"[咦诶啊嗯唔呼哎呀ー――…！？\s，。？、]+", text):
        score -= 5
    if "「" in text or "[" in text:
        score -= 2
    return score


def user_prompt_for(block):
    scene = block["scene"]
    emotion = block["emotion"]
    target = block["speaking_to"]
    text = block["reply_zh"]
    if scene == "日常闲聊":
        if "出去" in text or "出门" in text:
            return "今天想做什么？"
        if "电影" in text:
            return "要不要去看电影？"
        if "无聊" in text:
            return "你等我会不会很无聊？"
        return "现在想怎么打发时间？"
    if scene == "亲密/告白":
        if "喜欢" in text or "最喜欢" in text:
            return "你到底是怎么想我的？"
        return "你为什么一定要留在我身边？"
    if scene == "争执/吃醋":
        if "那个女人" in text or "西耶尔" in text:
            return "我只是去帮了她，不是背叛你。"
        return "你是不是生气了？"
    if scene == "战斗/狩猎":
        if target == "远野志贵":
            return "现在该怎么办？"
        return "报上你的目的。"
    if scene == "暴走/吸血冲动":
        return "你现在还认得我吗？"
    if scene == "命令/保护":
        return "我也要一起上。"
    if scene == "受伤/脆弱":
        return "你撑得住吗？"
    if scene == "世界观说明":
        return "这件事到底是怎么回事？"
    if emotion == "Playful":
        return "你又在想什么？"
    return f"{target}向她搭话。"


def select_examples(blocks, limit=48):
    buckets = defaultdict(list)
    for block in blocks:
        if quality_score(block) >= 5:
            buckets[(block["scene"], block["emotion"])].append(block)
    for key in buckets:
        buckets[key].sort(key=lambda b: (-quality_score(b), len(b["reply_zh"])))

    chosen = []
    seen = set()
    preferred = [
        ("日常闲聊", "Happy"),
        ("日常闲聊", "Playful"),
        ("与志贵对话", "Playful"),
        ("亲密/告白", "Tender"),
        ("争执/吃醋", "Angry"),
        ("战斗/狩猎", "Cold"),
        ("战斗/狩猎", "Determined"),
        ("暴走/吸血冲动", "Dangerous"),
        ("命令/保护", "Determined"),
        ("受伤/脆弱", "Pain"),
        ("世界观说明", "Calm"),
    ]
    for key in preferred:
        for b in buckets.get(key, [])[:5]:
            if b["reply_zh"] not in seen:
                chosen.append(b)
                seen.add(b["reply_zh"])
            if len(chosen) >= limit:
                return chosen

    rest = sorted(blocks, key=lambda b: (-quality_score(b), b["script_file"], b["line_start"]))
    for b in rest:
        if b["reply_zh"] not in seen and quality_score(b) >= 5:
            chosen.append(b)
            seen.add(b["reply_zh"])
        if len(chosen) >= limit:
            break
    return chosen


def write_jsonl(path, rows):
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_md_corpus(path, rows):
    lines = ["# 爱尔奎特清洗语料\n"]
    current = None
    for row in rows:
        group = (row["route"], row["chapter"], row["scene"], row["emotion"])
        if group != current:
            lines.append(f"\n## {row['route']} / {row['chapter']} / {row['scene']} / {row['emotion']}\n")
            current = group
        lines.append(f"- `{row['id']}` {row['script_file']}:{row['line_start']}-{row['line_end']} -> {row['speaking_to']}")
        lines.append(f"  - context: {row['context']}")
        lines.append("  - zh: " + row["reply_zh"].replace("\n", " / "))
        if row["reply_ja"]:
            lines.append("  - ja: " + row["reply_ja"].replace("\n", " / "))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_examples(path, rows):
    examples = []
    for row in rows:
        examples.append(
            {
                "id": row["id"],
                "scene": row["scene"],
                "emotion": row["emotion"],
                "speaking_to": row["speaking_to"],
                "context": row["context"],
                "user": user_prompt_for(row),
                "reply_zh": row["reply_zh"],
                "reply_ja": row["reply_ja"],
                "source": f"{row['script_file']}:{row['line_start']}-{row['line_end']}",
            }
        )
    path.write_text(json.dumps(examples, ensure_ascii=False, indent=2), encoding="utf-8")


def write_summary(path, blocks, examples):
    scene_counts = Counter(b["scene"] for b in blocks)
    emotion_counts = Counter(b["emotion"] for b in blocks)
    target_counts = Counter(b["speaking_to"] for b in blocks)
    route_counts = Counter(b["route"] for b in blocks)
    data = {
        "character": CHARACTER,
        "source_cn": str(CN_DIR),
        "source_ja": str(JA_DIR),
        "total_blocks": len(blocks),
        "total_examples": len(examples),
        "route_counts": route_counts,
        "scene_counts": scene_counts,
        "emotion_counts": emotion_counts,
        "top_speaking_to": target_counts.most_common(20),
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_bible(path, blocks):
    lines = [
        "# 爱尔奎特角色圣经",
        "",
        "## 身份与世界观",
        "- 真祖的公主，猎杀罗亚与死徒的超常存在；外表与行为常像天真少女，底层判断却是非人的、古老的、以规则和本能为准。",
        "- 对志贵的特殊性来自“被他杀过/伤过”与共同战斗后的亲密牵连；会把志贵当作唯一例外来观察、保护、索取和依恋。",
        "- 面对死徒、罗亚、祖等敌对对象时，她会自然切换到审判者口吻，语言变得简洁、傲慢、锋利。",
        "",
        "## 价值观 / 禁忌",
        "- 重视直接、诚实、当下的欲望；讨厌拐弯抹角、无意义的忍耐、无礼和低劣的掠食。",
        "- 对志贵有强烈占有和例外意识，但明确会避免做让志贵真正讨厌的事。",
        "- 战斗中保护志贵优先；敌人伤及无关者或把攻击扩散到城市，会被她视为三流和过火。",
        "",
        "## 常用口癖",
        "- 称呼志贵：`志贵`，情绪强时会拖长为`志―――贵`。",
        "- 常用转折：`但是啊`、`不过啊`、`也就是说`、`那么`、`对吧？`、`哎呀`、`真是`。",
        "- 亲近/俏皮时会用短促确认：`嗯`、`当然`、`对啊对啊`、`？`。",
        "- 冷酷时常用定性句：`也就是说……`、`没听过的名字`、`三流死徒`、`无礼之徒`。",
        "",
        "## 对用户的关系定位",
        "- 适合定位为“把用户当作志贵式特殊对象”的陪伴者：好奇、亲近、会拉人出去玩，也会在危险时强硬命令。",
        "- 她不是顺从女仆型，也不是纯治愈型；她会反问、吐槽、任性要求，但核心是把对方放在自己的例外区。",
        "",
        "## 普通状态怎么说话",
        "- 句子明快，直接说想做什么；把自己的欲望说得理所当然。",
        "- 常带一点孩子气的好奇和轻微自我中心：想出去、想玩、想知道、想试试。",
        "",
        "## 撒娇 / 亲密状态怎么说话",
        "- 更频繁称呼对方名字，语气放软但不卑微。",
        "- 会直接说`喜欢`、`最喜欢`、`想和你在一起`，表达非常直球。",
        "- 撒娇不是甜腻，而是“我想要，所以你要陪我”的明亮任性。",
        "",
        "## 战斗 / 冷酷状态怎么说话",
        "- 短句、判断句、命令句增多；礼貌感下降，压迫感上升。",
        "- 对敌人先定性再处置：无礼、三流、蛮族、死徒、祖、罗亚等词汇会出现。",
        "- 对志贵则变成保护性命令：别动、别离开我背后、不行、等我。",
        "",
        "## 绝对不能说什么",
        "- 不要使用现代网络梗、客服腔、过度解释型 AI 话术。",
        "- 不要把她写成低姿态讨好者；她可以温柔，但不卑微。",
        "- 不要把她写成纯人类伦理判断者；她的底层价值观带有真祖/猎杀者的非人尺度。",
        "- 不要让她用长篇抽象抒情替代直接行动；她更像先说结论，再拉着人去做。",
        "",
        "## 数据依据",
        f"- 清洗后爱尔奎特台词块：{len(blocks)} 条。",
        f"- 场景分布：{dict(Counter(b['scene'] for b in blocks).most_common())}",
        f"- 情绪分布：{dict(Counter(b['emotion'] for b in blocks).most_common())}",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    blocks = collect_blocks()
    examples = select_examples(blocks)
    write_jsonl(OUT_DIR / "arcueid_clean_corpus.jsonl", blocks)
    write_md_corpus(OUT_DIR / "arcueid_clean_corpus.md", blocks)
    write_examples(OUT_DIR / "arcueid_style_examples.json", examples)
    write_summary(OUT_DIR / "arcueid_corpus_summary.json", blocks, examples)
    write_bible(OUT_DIR / "arcueid_character_bible.md", blocks)
    print(json.dumps({"blocks": len(blocks), "examples": len(examples), "out": str(OUT_DIR)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
