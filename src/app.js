import {
  CARDS,
  LEADERS,
  leaderById,
  FACTIONS,
  ICON_NAMES,
  activeSpaces,
  spaceById,
  TECHS,
  techById,
  intrigueById,
  COVERAGE,
  RESEARCH,
} from "./data.js";
import {
  createGame,
  act,
  pending,
  strength,
  conflict,
  legalReason,
  describe,
  spaceCost,
  restore,
  troopSupply,
  ownedCount,
  hasTech,
} from "./engine.js";
import { chooseAI } from "./ai.js";

const $ = (selector) => document.querySelector(selector);
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const F = Object.keys(FACTIONS),
  SAVE = "imperium-mobile-save-v1",
  SETTINGS = "imperium-mobile-settings-v1";
let boardMode = window.matchMedia("(max-width: 800px)").matches
  ? "large"
  : "map";
let game = null,
  screen = "home",
  tab = "board",
  selected = [],
  modal = null,
  undo = null,
  timer = null,
  fast = false,
  paused = false,
  aiError = "",
  veil = null,
  toastTimer = null,
  audioContext = null;
let config = {
  aiCount: 2,
  difficulty: "normal",
  leader: "paul",
  ix: false,
  immortality: false,
  mode: "solo",
  humans: 2,
  name: "당신",
  target: 10,
};
let sound = false,
  storageError = "";
try {
  const settings = JSON.parse(localStorage.getItem(SETTINGS) || "null");
  if (settings) {
    config = { ...config, ...settings.config };
    sound = !!settings.sound;
  }
  const saved = localStorage.getItem(SAVE);
  if (saved) game = restore(saved);
} catch (error) {
  storageError = `저장 데이터를 읽지 못했습니다: ${error.message}`;
}

const paths = {
  hawk: "m2 7 7 3 3-6 3 6 7-3-5 7-5 6-5-6-5-7Zm7 3 3 3 3-3",
  ram: "M8 9C2 1-2 13 6 14m10-5c6-8 10 4 2 5M8 8l4 3 4-3v9l-4 4-4-4V8Zm1 6h1m4 0h1",
  mountain: "m2 19 7-13 4 7 3-5 6 11H2Zm5-9 2 3 2-3",
  tree: "M12 22V3m0 5L7 4m5 8 6-6m-6 10-8-5m8 8 8-6M7 22h10",
  blade: "m12 2 3 5-3 10-3-10 3-5Zm-5 15h10m-5 0v5m-2 0h4",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m8 5 7 7-7 7",
  close: "m6 6 12 12M18 6 6 18",
  check: "m5 12 4 4L19 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  crown: "m3 7 4 3 5-7 5 7 4-3-3 12H6L3 7ZM7 15h10",
  orbit: "M21 12a9 9 0 1 1-9-9m0 5a4 4 0 1 0 4 4M3 21 21 3m-7 0h7v7",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm7 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  dagger: "m5 3 16 16m-5-2 3-3M3 3l4 1-3 3Zm15 18 3-3",
  city: "M3 21V10h6V3h6v7h6v11H3Zm6 0V10m6 0v11M6 13v2m6-9v2m6 5v2",
  landsraad: "m2 8 10-5 10 5H2Zm2 3h16M5 11v8m7-8v8m7-8v8M2 21h20",
  spiceTrade: "m12 2 9 10-9 10-9-10 9-10ZM3 12h18M12 2 7 12l5 10 5-10-5-10",
  spice: "m12 3 8 6-3 12H7L4 9l8-6ZM4 9h16M7 21l5-12 5 12M12 3v6",
  water: "M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13Zm-4 13a4 4 0 0 0 4 4",
  solari: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15 8H9v4h6v4H9m3-10v12",
  agent: "M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0Zm1 4-4 4v3h3v4h8v-4h3v-3l-4-4",
  troops: "M5 5h14v14H5ZM8 2h8M2 8v8m20-8v8M8 22h8",
  swords:
    "m4 3 14 14M3 3l5 2-3 3Zm13 15 3-3m-3 4 4 3m0-19L6 17m15-14-5 2 3 3ZM8 18l-3-3m3 4-4 3",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6",
  board: "M3 3h18v18H3ZM3 10h18M10 10v11M15 3v7",
  cards: "M8 3h13v17H8ZM5 6H3v16h13v-1M11 7h7m-7 4h5",
  research:
    "M6 2c12 5 0 15 12 20M18 2C6 7 18 17 6 22M6 5h12M8 10h8m-8 4h8m-10 5h12",
  ship: "m4 6 8-4 8 4v8l-8 8-8-8V6ZM2 12h20M12 2v20",
  gear: "m9 2-1 4-4 1-2 5 3 3v4l5 3 4-2 4 1 3-5-2-4 1-4-5-3-4 2Zm-1 10a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  log: "M5 3h14v18H5ZM8 7h8M8 11h8m-8 4h5",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v1",
  sound: "m3 9 5 0 5-5v16l-5-5H3V9Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16",
  mute: "m3 9 5 0 5-5v16l-5-5H3V9Zm13 0 6 6m0-6-6 6",
  undo: "M3 10h11a6 6 0 0 1 0 12m-6-7-5-5 5-5",
  home: "m2 11 10-9 10 9M5 9v13h14V9M9 22v-8h6v8",
  download: "M12 2v13m-5-5 5 5 5-5M3 17v5h18v-5",
  play: "m8 4 13 8-13 8V4Z",
  pause: "M7 4h3v16H7ZM14 4h3v16h-3Z",
  lock: "M5 10h14v12H5ZM8 10V6a4 4 0 0 1 8 0v4m-4 5v3",
  moon: "M20 14A9 9 0 1 1 10 2a7 7 0 0 0 10 12",
  trash: "M3 6h18M8 6V3h8v3M5 6l1 16h12l1-16M9 10v8m6-8v8",
  refresh: "M20 8a8 8 0 1 0 1 7M20 2v6h-6",
};
function icon(id, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id] || paths.info}"/></svg>`;
}
function factionIcon(id, size = 15) {
  return `<span style="color:${FACTIONS[id]?.color || "#cdb27a"}" title="${ICON_NAMES[id] || id}">${icon(FACTIONS[id]?.icon || id, size)}</span>`;
}
const wordmark = () =>
  '<span class="wordmark">DUNE<small>IMPERIUM</small></span>';
function houseMark(id, size = 22) {
  const leader = leaderById[id];
  return `<span class="house-mark" style="color:${leader.color}" aria-hidden="true">${icon(leader.symbol, size)}</span>`;
}
function card(
  id,
  { index, context = "hand", selected: isSelected = false } = {},
) {
  const c = CARDS[id];
  if (!c) return "";
  const attrs =
    context === "hand"
      ? `data-action="card" data-index="${index}" aria-pressed="${isSelected}"`
      : context === "market"
        ? `data-action="marketCard" data-index="${index}" data-zone="row"`
        : context === "tleilax"
          ? `data-action="marketCard" data-index="${index}" data-zone="tleilax"`
          : 'data-action="inspectCard" data-id="' + id + '"';
  return `<button class="card ${isSelected ? "selected" : ""} ${c.graft ? "graft" : ""}" ${attrs} aria-label="${e(c.name)} · ${describe(c.reveal)}" style="--card-color:${FACTIONS[c.faction]?.color || "#cdb27a"}"><span class="card-header"><span class="card-source">${c.graft ? "접합" : c.tleilaxu ? "틀레이락스" : c.expansion === "ix" ? "익스" : c.expansion === "immortality" ? "불멸" : c.starter ? "시작" : "제국"}</span>${isSelected ? `<span class="checkmark">${icon("check", 12)}</span>` : ""}${!c.starter ? `<span class="card-price">${c.cost}</span>` : ""}</span><span class="card-title">${e(c.name)}</span><span class="card-icons">${c.icons.map((i) => factionIcon(i, 13)).join("")}${c.infiltrate ? `<span title="상대 요원 침투">${icon("eye", 12)}</span>` : ""}</span><span class="card-effect">${describe(c.agent) || "장소의 효과를 얻습니다."}</span><span class="card-reveal">${describe(c.reveal) || "공개 효과 없음"}</span></button>`;
}
function settingsSave() {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify({ config, sound }));
  } catch (error) {
    toast(`설정 저장 실패: ${error.message}`);
  }
}
function save() {
  try {
    localStorage.setItem(SAVE, JSON.stringify(game));
    storageError = "";
  } catch (error) {
    storageError = `자동 저장 실패: ${error.message}`;
    toast(storageError);
  }
}
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("visible"), 3500);
}
function clickSound() {
  if (!sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(460, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      220,
      audioContext.currentTime + 0.06,
    );
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.09,
    );
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    sound = false;
    toast("이 브라우저에서는 효과음을 사용할 수 없습니다.");
  }
}
function activeId() {
  return pending(game)?.player ?? game.current;
}
function isHumanTurn() {
  return game && !game.players[activeId()].ai;
}
function viewPlayer() {
  return game.players[game.options.mode === "solo" ? 0 : activeId()];
}
const difficultyText = {
  easy: "여유로운 탐험. AI가 더 다양한 선택을 합니다.",
  normal: "균형 잡힌 전략. 성장과 전투를 함께 고려합니다.",
  hard: "치밀한 경쟁. 승점 기회와 동맹 쟁탈을 우선합니다.",
};

function home() {
  const l = leaderById[config.leader] || LEADERS[0];
  return `<nav class="site-nav">${wordmark()}<div class="nav-right"><span class="edition">A FAN-MADE EXPERIENCE</span><button data-action="help">플레이 가이드 ${icon("arrow", 13)}</button></div></nav>
  <main><section class="hero"><div class="hero-content"><div class="eyebrow">DUNE · IMPERIUM</div><h1>듄: 임페리움</h1><p class="hero-copy">덱을 만들고, 요원을 보내고, 아라키스의 패권을 차지하세요.</p><div class="hero-meta"><span>${icon("agent", 14)} 나 + AI 2–3명</span><span>${icon("cards", 14)} 확장 선택</span><span>${icon("moon", 14)} 자동 저장</span></div>${game ? `<div class="hero-actions"><button class="primary" data-action="resume">${game.phase === "ended" ? "지난 결과 보기" : "이어서 플레이"} ${icon("arrow", 16)}</button><button class="text-button" data-action="setup">새 게임 설정</button></div>` : ""}</div></section>
  <section class="setup" id="setup"><div class="section-heading"><div><h2>새 게임 설정</h2></div><p>상대와 확장, 지도자를 선택하세요.</p></div>
  ${storageError ? `<div class="notice">${e(storageError)}</div>` : ""}
  <div class="setup-layout"><div><div class="setting-block"><div class="setting-label">${config.mode === "solo" ? "상대 AI" : "플레이어"}<span>${config.mode === "solo" ? "당신은 첫 번째 플레이어입니다" : "한 기기를 번갈아 사용합니다"}</span></div><div class="segments">${(config.mode === "solo" ? [2, 3] : [2, 3, 4]).map((n) => `<button class="${(config.mode === "solo" ? config.aiCount : config.humans) === n ? "active" : ""}" data-action="config" data-key="${config.mode === "solo" ? "aiCount" : "humans"}" data-value="${n}" aria-pressed="${(config.mode === "solo" ? config.aiCount : config.humans) === n}">${config.mode === "solo" ? `나 + AI ${n}명` : `${n}인 플레이`}</button>`).join("")}</div><div class="mode-link"><button data-action="switchMode">${config.mode === "solo" ? "한 기기에서 친구와 플레이하기" : "기본 솔로 모드로 돌아가기"} ${icon("arrow", 12)}</button></div></div>
  ${
    config.mode === "solo"
      ? `<div class="setting-block"><div class="setting-label">난이도<span>AI에게 추가 자원을 주지 않습니다</span></div><div class="segments">${[
          ["easy", "쉬움"],
          ["normal", "보통"],
          ["hard", "어려움"],
        ]
          .map(
            ([id, name]) =>
              `<button class="${config.difficulty === id ? "active" : ""}" data-action="config" data-key="difficulty" data-value="${id}" aria-pressed="${config.difficulty === id}">${name}</button>`,
          )
          .join(
            "",
          )}</div><p class="difficulty-caption">${difficultyText[config.difficulty]}</p></div>`
      : ""
  }
  <div class="setting-block"><div class="setting-label">확장 모듈<span>독립적으로 선택할 수 있습니다</span></div><div class="expansions"><label class="expansion"><input type="checkbox" name="ix" ${config.ix ? "checked" : ""}><span class="switch"></span>${icon("ship", 34)}<span class="en">RISE OF IX</span><h3>익스의 부상</h3><p>기술 · 수송선 · 드레드노트</p></label><label class="expansion"><input type="checkbox" name="immortality" ${config.immortality ? "checked" : ""}><span class="switch"></span>${icon("research", 34)}<span class="en">IMMORTALITY</span><h3>불멸</h3><p>연구 · 표본 · 카드 접합</p></label></div></div>
  <div class="setting-block"><div class="setting-label">지도자 선택<span>기본 ${config.ix ? "8 + 익스 6" : "8"}명 · 원작 지도자</span></div><div class="leader-picker">${LEADERS.filter(
    (x) => !x.expansion || config[x.expansion],
  )
    .map(
      (x) =>
        `<button class="leader-pick ${x.id === l.id ? "selected" : ""}" data-action="leader" data-id="${x.id}" aria-label="${e(x.name)}" aria-pressed="${x.id === l.id}">${houseMark(x.id)}<span class="leader-label"><strong>${e(x.name.replace(" 아트레이데스 공작", " 공작").replace(" 소르발드 백작부인", " 백작부인").replace(" 소르발드 백작", " 백작").replace(" 리체스 백작", " 백작").replace("블라디미르 하코넨 남작", "하코넨 남작").replace("글로수 “야수” 라반", "야수 라반").replace(" 버니우스 왕자", " 왕자").replace(" 에카즈 대공", " 대공").replace(" 모리타니 자작", " 자작"))}</strong><small>${x.house}${x.expansion ? " · 익스" : ""}</small></span></button>`,
    )
    .join("")}</div></div>
  </div><aside class="leader-preview"><div class="leader-body"><div class="leader-heading">${houseMark(l.id, 28)}<div><span class="eyebrow">${e(l.house)} 가문</span><h3>${e(l.name)}</h3></div></div><p class="english">${e(l.en)} <span class="badge">운용 난도 ${l.complexity}</span></p><div class="ability"><strong>${icon("eye", 14)} ${l.passive}</strong><p>${l.ability}</p></div><div class="ability"><strong>${icon("solari", 14)} ${l.ring}</strong><p>${l.ringText}</p></div></div></aside></div>
  <div class="begin-panel"><div class="begin-summary"><strong>${config.mode === "solo" ? `${config.aiCount + 1}인 원정 · ${{ easy: "쉬움", normal: "보통", hard: "어려움" }[config.difficulty]}` : `${config.humans}인 로컬 원정`}</strong><p>${[config.ix ? "익스의 부상" : null, config.immortality ? "불멸" : null].filter(Boolean).join(" + ") || "기본판"} · ${config.target}승점 · 최대 10라운드</p></div><button class="primary" data-action="start">아라키스로 출발 ${icon("arrow", 19)}</button></div><div class="scope-note"><span>비공식 팬 에디션 · 핵심 규칙과 선별 카드 구성입니다.<br>모든 실물 카드·음모를 재현한 완성판은 아닙니다.</span><button class="text-button" data-action="scope">구현 범위 확인 ${icon("info", 12)}</button></div></section></main><footer class="footer">${wordmark()}<p>Dune: Imperium의 비공식 팬 프로젝트입니다. 원작의 명칭과 세계관은 각 권리자에게 귀속됩니다.<br>화면과 아이콘은 이 프로젝트를 위해 새로 제작했습니다. 게임 데이터는 이 브라우저에 저장됩니다.</p><span>BUILD 0.1 · KO</span></footer>`;
}
function playerRow() {
  return `<section class="players" style="--players:${game.players.length}" aria-label="플레이어 점수">${game.players.map((p) => `<button class="player ${activeId() === p.id && game.phase !== "ended" ? "active" : ""}" style="--player-color:${p.color}" data-action="player" data-id="${p.id}">${houseMark(p.leader, 20)}<div class="player-info"><strong>${e(p.name)}</strong><small>${e(leaderById[p.leader].name.replace("아트레이데스", "").replace("소르발드", ""))}</small></div><span class="score">${p.vp}<small>VP</small></span><span class="you">${p.ai ? "AI" : game.options.mode === "solo" ? "YOU" : "HUMAN"} ${p.id === game.first ? "· 先" : ""}</span></button>`).join("")}</section>`;
}
function resourceStrip(p) {
  return `<div class="resource-strip"><div class="resources">${[
    ["spice", p.spice, "스파이스"],
    ["water", p.water, "물"],
    ["solari", p.solari, "솔라리"],
    ["agent", p.agents, "남은 요원"],
  ]
    .map(
      ([id, n, label]) =>
        `<div class="resource ${id === "agent" ? "agents" : ""}">${icon(id, 20)}<div><small>${label}</small><strong>${n}</strong></div></div>`,
    )
    .join(
      "",
    )}<div class="resource supply">${icon("troops", 20)}<div><small>주둔 병력</small><strong>${p.garrison}</strong></div></div></div><span class="saved">${icon(storageError ? "info" : "check", 11)} ${storageError ? "저장 실패" : "이 기기에 저장됨"}</span></div>`;
}
function metric(type, value, label, cost = false) {
  return `<span class="effect-token ${cost ? "cost-token" : "reward-token"}" data-resource="${type}">${icon(type, 16)}<strong>${e(value)}</strong><span>${e(label)}</span></span>`;
}
function effectTokens(effects, cost = false) {
  const names = {
    spice: ["spice", "스파이스"],
    water: ["water", "물"],
    solari: ["solari", "솔라리"],
    troops: ["troops", "병력"],
    draw: ["cards", "카드"],
    intrigue: ["eye", "음모"],
    persuasion: ["cards", "설득력"],
    swords: ["swords", "검"],
    vp: ["star", "승점"],
    shipment: ["ship", "수송"],
    research: ["research", "연구"],
    beetle: ["research", "틀레이락스"],
    specimen: ["troops", "표본"],
    negotiators: ["agent", "협상가"],
    dreads: ["ship", "드레드노트"],
  };
  return Object.entries(effects || {})
    .map(([key, value]) => {
      if (names[key])
        return metric(names[key][0], value, names[key][1], cost);
      if (key === "influence") {
        const faction = typeof value === "object" ? value.faction : null;
        return metric(
          faction ? FACTIONS[faction].icon : "crown",
          typeof value === "object" ? value.amount : value,
          faction ? `${FACTIONS[faction].name} 영향력` : "세력 영향력",
          cost,
        );
      }
      if (key === "harvest") return metric("spice", value, "스파이스 수확");
      if (key === "acquire") return metric("cards", 1, CARDS[value].name);
      if (key === "agents") return metric("agent", value, "이번 라운드 요원");
      if (key === "swordmaster") return metric("agent", "+1", "영구 요원");
      if (key === "council") return metric("cards", "+2", "매 공개 설득력");
      if (key === "tech")
        return `<span class="effect-text">${icon("gear", 20)} 기술 구매${value ? ` · 스파이스 ${value} 할인` : ""}</span>`;
      if (key === "negotiate")
        return `<span class="effect-text">${icon("gear", 20)} 협상가 1 배치 / 스파이스 1 할인 구매</span>`;
      if (key === "sell") return metric("solari", "6–12", "솔라리");
      if (key === "breed")
        return `<span class="effect-text">카드 1장 폐기 → ${icon("cards", 20)}<strong>2장</strong></span>`;
      if (key === "stealIntrigue")
        return '<span class="effect-text">음모 4장 이상인 상대에게서 1장 탈취</span>';
      if (key === "control")
        return `<span class="effect-text">${icon("city", 20)} ${e(spaceById[value].name)} 지배권</span>`;
      if (key === "distinctInfluence")
        return metric("crown", value, "서로 다른 세력 영향력");
      if (key === "optional" || key === "optional2")
        return `<span class="optional-reward">${effectTokens(value.cost, true)}<span class="exchange-arrow">→</span>${effectTokens(value.gain)}<small>선택</small></span>`;
      return `<span class="effect-text">${e(describe({ [key]: value }))}</span>`;
    })
    .join("");
}
function locationRewards(space, player) {
  if (space.id === "research" && game.options.immortality)
    return { draw: 2, research: 1 };
  const rewards = { ...space.effect };
  if (space.maker) {
    rewards.harvest += game.bonus[space.id] || 0;
    if (selected.some((index) => player.hand[index] === "carryall"))
      rewards.harvest += space.effect.harvest;
    if (player.leader === "ariana") {
      rewards.harvest--;
      rewards.draw = 1;
    }
  }
  return rewards;
}
function locationCosts(space, player) {
  const costs = spaceCost(
    player,
    space,
    selected.map((index) => player.hand[index]),
  );
  return space.id === "sell" ? { spice: "2–5" } : costs;
}
function location(space) {
  const player = viewPlayer(),
    reason = legalReason(game, player, space, selected);
  const legal =
    game.phase === "agent" &&
    isHumanTurn() &&
    !pending(game) &&
    selected.length &&
    !reason;
  const occupants = game.occupied[space.id] || [],
    costs = locationCosts(space, player),
    rewards = locationRewards(space, player);
  const controller =
    game.dreadControl[space.id]?.player ?? game.control[space.id];
  return `<button class="location ${legal ? "legal" : ""} ${occupants.length ? "occupied" : ""}" data-action="space" data-id="${space.id}" style="--faction:${FACTIONS[space.icon]?.color || "#b8c7ad"}" aria-label="${e(space.name)}. 비용: ${e(describe(costs) || "없음")}. 보상: ${e(describe(rewards))}. ${e(reason)}">
    <span class="location-heading">${factionIcon(space.icon, 22)}<strong>${space.name}</strong>${space.combat ? `<span class="combat-space-tag">${icon("swords", 18)} 전투</span>` : ""}</span>
    <span class="location-cost"><span class="effect-label">비용</span><span class="effect-tokens">${Object.keys(costs).length ? effectTokens(costs, true) : '<span class="no-cost">없음</span>'}</span></span>
    ${space.requires ? `<span class="location-requirement">조건 · ${FACTIONS[space.requires.faction].name} 영향력 ${space.requires.amount} 이상 <span>${player.influence[space.requires.faction] >= space.requires.amount ? "충족" : "미충족"}</span></span>` : ""}
    <span class="location-reward"><span class="effect-label">보상</span><span class="effect-tokens">${effectTokens(rewards)}</span></span>
    ${space.maker ? `<span class="location-note">기본 ${space.effect.harvest}${game.bonus[space.id] ? ` + 축적 ${game.bonus[space.id]}` : ""}${player.leader === "ariana" ? " · 아리아나 수확 −1 / 카드 +1" : ""}</span>` : ""}
    ${space.id === "sell" ? '<span class="location-note">스파이스 2→6 · 3→8 · 4→10 · 5→12 솔라리</span>' : ""}
    ${controller != null ? `<span class="location-note">지배자 · ${e(game.players[controller].name)}${game.dreadControl[space.id] ? " (드레드노트)" : ""}</span>` : ""}
    <span class="location-occupancy">${occupants.length ? occupants.map((id) => `<span style="color:${game.players[id].color}">${icon("agent", 17)} ${e(game.players[id].name)}</span>`).join("") : `${icon("agent", 17)} ${legal ? "배치 가능" : "빈 장소"}`}</span>
  </button>`;
}
function combatSummary() {
  if (game.round === 0)
    return '<div class="notice" role="status">지도자 시작 효과를 처리하고 있습니다.</div>';
  const c = conflict(game),
    player = viewPlayer();
  return `<button class="combat-launch" data-action="tab" data-tab="combat" aria-label="이번 분쟁 ${c.name}. 분쟁 지역과 전투 현황 보기"><span class="combat-launch-icon">${icon("swords", 24)}</span><span><small>이번 분쟁 · ${"ⅠⅡⅢ"[c.level - 1]}단계</small><strong>${c.name}</strong></span><span class="combat-launch-strength"><small>내 전투력</small><strong>${strength(player)}</strong></span><span class="combat-launch-link">전투 보기 ${icon("chevron", 16)}</span></button>`;
}
function battle() {
  if (game.round === 0) return "";
  const c = conflict(game),
    settled = ["roundEnd", "ended"].includes(game.phase);
  const active = game.phase === "combat",
    canAct = active && isHumanTurn() && !pending(game);
  const phaseText = settled
    ? "전투 정산 완료"
    : active
      ? "전투 음모 단계"
      : "병력 배치 중";
  return `<section class="battle-panel" aria-label="분쟁 카드와 전투 현황">
    ${active ? `<div class="combat-actions"><p>${e(game.players[activeId()].name)}의 ${pending(game) ? "선택" : "전투 음모"} 차례입니다. 모두 연속 통과하면 전투가 정산됩니다.</p><div><button class="secondary" data-action="intrigues">${icon("eye", 18)} 내 음모 확인</button>${canAct ? '<button class="primary" data-action="passCombat">전투 통과 →</button>' : game.players[activeId()].ai ? `<button class="secondary" data-action="pause">${paused ? "AI 계속하기" : "AI 일시 정지"}</button>` : ""}</div></div>` : !settled ? '<p class="battle-rule">전투 장소에 요원을 보내면 이번 턴 모집 유닛과 기존 주둔 유닛 최대 2개를 이곳에 배치할 수 있습니다.</p>' : ""}
    <section class="combat-arena" aria-label="분쟁 지역"><header><h3>${icon("swords", 20)} 분쟁 지역</h3><span>${settled ? "투입 병력 회수됨" : game.options.ix ? "병력 2 · 함선 3 / 롬버 4" : "병력당 전투력 2"}</span></header>
    <div class="shared-battlefield" aria-label="모든 플레이어가 함께 사용하는 전장"><span class="battlefield-center" aria-hidden="true">${icon("swords", 72)}</span><div class="arena-players">${game.players
      .map(
        (player) =>
          `<section class="arena-player" style="--player-color:${player.color}" aria-label="${e(player.name)} · ${e(leaderById[player.leader].house)} · 전투력 ${strength(player)}"><div class="arena-player-heading"><span class="arena-player-name"><strong>${e(player.name)}</strong><small title="${e(leaderById[player.leader].name)}">${e(leaderById[player.leader].house)}</small></span><span class="arena-strength" title="전투력">${icon("swords", 14)}<b>${strength(player)}</b></span></div><div class="arena-units" aria-label="투입 병력 ${player.troops}개, 드레드노트 ${player.dreadCombat}개">${
            player.troops + player.dreadCombat
              ? Array(player.troops)
                  .fill('<i class="troop-cube" aria-hidden="true"></i>')
                  .join("") +
                Array(player.dreadCombat)
                  .fill(
                    '<i class="dread-unit" aria-hidden="true">' +
                      icon("ship", 14) +
                      "</i>",
                  )
                  .join("")
              : '<span class="arena-empty">투입 유닛 없음</span>'
          }</div><div class="combat-counts"><span>병력 <b>${player.troops}</b></span>${game.options.ix ? `<span>함선 <b>${player.dreadCombat}</b></span>` : ""}<span>검 <b>${player.swords}</b></span></div></section>`,
      )
      .join("")}</div></div>
    <div class="garrison-reserves" aria-label="전장 밖 주둔 유닛"><span class="reserve-caption">주둔지</span>${game.players.map((player) => `<span class="reserve-total" style="--player-color:${player.color}"><i aria-hidden="true"></i>${e(player.name)} ${icon("troops", 14)}<b>${player.garrison}</b>${game.options.ix ? icon("ship", 14) + "<b>" + player.dreadGarrison + "</b>" : ""}</span>`).join("")}</div>
    <details class="combat-calculation"><summary>전투력 계산 보기</summary>${game.players.map((player) => `<p class="combat-formula"><span style="color:${player.color}">${e(player.name)}</span> · ${player.troops}×2${game.options.ix ? ` + ${player.dreadCombat}×${player.leader === "rhombur" ? 4 : 3}` : ""} + 검 ${player.swords} = ${strength(player)}${player.troops + player.dreadCombat ? "" : " (투입 유닛 없음)"}</p>`).join("")}</details></section>

    <section class="conflict-card"><div class="conflict-heading"><span class="pill">분쟁 ${"ⅠⅡⅢ"[c.level - 1]} · ${game.round}라운드</span><span class="battle-phase">${phaseText}</span></div><h2>${c.name}</h2>${c.location ? `<p class="conflict-location">${icon("city", 19)} 승리 시 ${spaceById[c.location].name} 지배권 획득</p>` : ""}<h3>순위별 보상</h3><div class="conflict-rewards">${c.rewards
      .slice(0, game.players.length === 4 ? 3 : 2)
      .map(
        (reward, index) =>
          `<div class="conflict-reward"><strong class="reward-place">${index + 1}위</strong><div class="effect-tokens">${effectTokens(reward)}</div></div>`,
      )
      .join(
        "",
      )}</div><p class="battle-rule">동률이면 한 단계 낮은 보상 · 병력과 드레드노트가 없으면 보상 없음</p></section>
  </section>`;
}
function board() {
  const spaces = activeSpaces(game.options),
    player = viewPlayer();
  const locations = (ids) =>
    ids
      .filter((id) => spaces.some((space) => space.id === id))
      .map((id) => location(spaceById[id]))
      .join("");
  const factionSpaces = {
    emperor: ["conspire", "wealth"],
    guild: ["heighliner", "foldspace"],
    bene: ["breeding", "secrets"],
    fremen: ["warriors", "stillsuits"],
  };
  const factionZones = F.map(
    (faction) =>
      `<section class="board-zone faction-zone" style="--zone-color:${FACTIONS[faction].color}"><header class="board-zone-heading"><h3>${factionIcon(faction, 23)} ${FACTIONS[faction].name}</h3><span>내 영향력 <b>${player.influence[faction]}</b></span></header><div class="board-influence" aria-label="${FACTIONS[faction].name} 영향력 트랙">${Array.from(
        { length: 7 },
        (_, n) =>
          `<span class="influence-stop ${[2, 4].includes(n) ? "influence-milestone" : ""}"><small>${n}${[2, 4].includes(n) ? " VP" : ""}</small><span>${game.players
            .filter((p) => p.influence[faction] === n)
            .map(
              (p) =>
                `<i style="background:${p.color}" title="${e(p.name)}"></i>`,
            )
            .join("")}</span></span>`,
      ).join(
        "",
      )}</div><div class="zone-locations">${locations(factionSpaces[faction])}</div></section>`,
  ).join("");
  return `<div class="board-view-controls"><div><h2>아라키스 보드</h2><p>${boardMode === "map" ? "실물판 구역 배치 · 좌우로 넘겨 이동할 수 있습니다." : "구역별 확대 · 장소의 비용과 보상을 크게 확인하세요."}</p></div><div class="segments" aria-label="보드 보기 방식"><button data-action="boardMode" data-mode="map" class="${boardMode === "map" ? "active" : ""}" aria-pressed="${boardMode === "map"}">실물 배치</button><button data-action="boardMode" data-mode="large" class="${boardMode === "large" ? "active" : ""}" aria-pressed="${boardMode === "large"}">모바일 확대</button></div></div>
    <nav class="board-jumps" aria-label="보드 구역 이동">${[
      ["factions", "세력"],
      ["landsraad", "의회"],
      ["choam", "CHOAM"],
      ["arrakis", "아라키스"],
      ["battle", "전장"],
    ]
      .map(
        ([zone, label]) =>
          `<button data-action="jumpZone" data-zone="${zone}">${label}</button>`,
      )
      .join("")}</nav>
    <div class="board-viewport view-${boardMode}"><div class="board-layout"><aside class="board-factions" id="zone-factions" aria-label="실물판 왼쪽 세력 구역">${factionZones}</aside>
    <section class="board-zone landsraad-zone" id="zone-landsraad"><header class="board-zone-heading"><h3>${icon("landsraad", 23)} 란츠라트 의회</h3></header><div class="zone-locations">${locations(["council", "oratory", "mentat", "rally", "swordmaster"])}</div></section>
    <section class="board-zone choam-zone" id="zone-choam"><header class="board-zone-heading"><h3>${icon("spiceTrade", 23)} CHOAM</h3><span>${game.options.ix ? "익스 확장" : "스파이스 무역"}</span></header><div class="zone-locations">${locations(game.options.ix ? ["shipping", "smuggling"] : ["sell", "contract"])}</div>${game.options.ix ? `<p class="shipping-note">내 수송선 <b>${player.shipping}/3</b> · 귀환 시 아래 단계 보상까지 획득</p>` : ""}</section>
    <section class="board-zone arrakis-zone" id="zone-arrakis"><header class="board-zone-heading"><h3>${icon("city", 23)} 아라키스</h3><span>도시 · 사막</span></header><div class="zone-locations">${locations(["arrakeen", "carthag", "research", "basin", "sietch", "hagga", "flat"])}</div></section>
    <section class="board-battle" id="zone-battle"><div class="board-zone-heading"><h3>${icon("swords", 23)} 분쟁 · 전투</h3><button class="text-button" data-action="tab" data-tab="combat">전투 화면 열기 →</button></div>${battle()}</section></div></div>
    ${game.options.ix ? `<section class="board-zone ix-sideboard"><header class="board-zone-heading"><h3>${icon("gear", 23)} 익스 보드</h3><button class="text-button" data-action="tab" data-tab="empire">기술 타일 보기 →</button></header><div class="zone-locations">${locations(["negotiation", "dreadnought"])}</div></section>` : ""}`;
}
function turnBar(player) {
  const human = isHumanTurn(),
    busy = pending(game);
  const selectedText = selected
    .map((index) => CARDS[player.hand[index]]?.name)
    .filter(Boolean)
    .join(" + ");
  const revealing = game.phase === "reveal" && game.current === player.id;
  const cardLabel = revealing
    ? `공개 카드 ${player.revealed.length}장`
    : `손패 ${player.hand.length}장`;
  return `<section class="turnbar ${tab === "board" ? "board-turnbar" : ""}" aria-label="손패와 현재 차례"><div class="mobile-turn-info"><span>${human ? "나의 차례" : `${e(game.players[activeId()].name)}의 차례`}</span><strong>${game.phase === "reveal" && game.current === player.id ? `설득력 ${player.persuasion}` : `남은 요원 ${player.agents}`}</strong></div><div class="mobile-turn-actions"><button class="secondary" data-action="hand">${icon("cards", 19)} ${selected.length ? `${selected.length}장 선택` : cardLabel}</button>${human && !busy && game.phase === "agent" ? '<button class="primary" data-action="reveal">공개</button>' : human && !busy && game.phase === "reveal" ? '<button class="primary" data-action="endReveal">구매 완료</button>' : !human ? `<button class="secondary" data-action="pause">${paused ? "AI 계속" : "일시 정지"}</button>` : ""}<button class="icon-btn" data-action="intrigues" aria-label="음모 카드 보기">${icon("eye", 20)}</button></div>${selectedText ? `<p class="selected-card-summary">${e(selectedText)} · 금빛 장소에 배치 가능</p>` : ""}</section>`;
}

function market() {
  const p = viewPlayer(),
    buy = game.phase === "reveal" && isHumanTurn() && !pending(game);
  return `<div class="purchase-strip"><div><strong>${icon("cards", 17)} 설득력 ${p.persuasion}</strong><p>${buy ? "카드를 선택해 덱에 추가하세요. 구매 후 새 카드가 즉시 보충됩니다." : "공개 턴에 남은 손패의 설득력으로 카드를 구매합니다."}</p></div>${game.options.immortality ? `<span class="pill">표본 ${p.specimens}</span>` : ""}</div><div class="group-heading"><h3>제국 열</h3><span>남은 카드 ${game.imperium.length}장</span></div><div class="market-grid">${game.row.map((id, index) => card(id, { index, context: "market" })).join("")}</div><div class="group-heading"><h3>예비 카드</h3><span>안정적인 덱 성장과 승점</span></div><div class="reserve-grid">${["liaison", "spiceFlow"].map((id) => `<button class="reserve-card" data-action="reserveCard" data-id="${id}"><span><strong>${CARDS[id].name}</strong><small>${id === "liaison" ? "도시·란츠라트 / 공개 설득력 2" : "획득 시 승점 1 / 공개 스파이스 1"}</small></span><span class="cost">${CARDS[id].cost}</span></button>`).join("")}</div>${p.reserved.length ? `<div class="group-heading"><h3>헬레나의 보관 카드</h3><span>이번 턴 비용 −1</span></div><div class="reserve-grid">${p.reserved.map((id, i) => `<button class="reserve-card" data-action="marketCard" data-zone="reserved" data-index="${i}"><span><strong>${CARDS[id].name}</strong><small>턴 종료 시 보관 해제</small></span><span class="cost">${Math.max(0, CARDS[id].cost - 1)}</span></button>`).join("")}</div>` : ""}${game.options.immortality ? `<div class="group-heading"><h3>틀레이락스 열</h3><span>설득력 대신 표본으로 구매</span></div><div class="market-grid">${game.tleilaxRow.map((id, index) => card(id, { index, context: "tleilax" })).join("")}</div><div class="reserve-grid"><button class="reserve-card" data-action="reclaimed"><span><strong>재생 병력</strong><small>병력 2 모집 / 틀레이락스 +1</small></span><span class="cost">3</span></button></div>` : ""}`;
}
function empire() {
  const p = viewPlayer();
  return `${F.map(
    (f) =>
      `<section class="track-panel"><div class="track-title" style="color:${FACTIONS[f].color}">${factionIcon(f, 20)} ${FACTIONS[f].name}<span class="pill" style="margin-left:auto">${game.alliances[f] === null ? "동맹 미체결" : e(game.players[game.alliances[f]].name) + " 동맹"}</span></div><div class="influence-track">${Array.from(
        { length: 7 },
        (_, n) =>
          `<div class="track-node"><small>${n}</small>${[2, 4].includes(n) ? '<span class="vp-mark">VP</span>' : ""}<span class="markers">${game.players
            .filter((q) => q.influence[f] === n)
            .map(
              (q) =>
                `<i class="marker" style="background:${q.color}" title="${e(q.name)}"></i>`,
            )
            .join("")}</span></div>`,
      ).join(
        "",
      )}</div><p>2: 우호 승점 1 · 4: 세력 보너스 (${describe(FACTIONS[f].bonus)}) · 4 이상 단독 선두: 동맹 승점 1</p></section>`,
  ).join("")}
  ${
    game.options.ix
      ? `<div class="group-heading"><h3>익스 · 기술과 수송</h3><span>${p.negotiators} 협상가</span></div><div class="exp-track">${icon("ship", 18)} 수송선<div class="progress" style="--progress:${(p.shipping / 3) * 100}%"></div><span>${p.shipping} / 3</span></div><div class="tech-grid">${game.techStacks
          .filter((stack) => stack.length)
          .map((stack) => {
            const t = techById[stack[0]];
            return `<div class="tech-tile"><span class="cost">${t.cost}</span><h3>${t.name}</h3><p>${t.text}</p></div>`;
          })
          .join(
            "",
          )}</div><div class="owned-info"><span>주둔 드레드노트 ${p.dreadGarrison}</span><span>전장 ${p.dreadCombat}</span></div><div class="sub-heading">보유 기술 <span>${p.techs.length}개</span></div><div class="tech-grid">${
          p.techs.length
            ? p.techs
                .map((id) => {
                  const t = techById[id];
                  return `<div class="tech-tile"><h3>${t.name}</h3><p>${t.text}</p>${t.activate || t.consume ? `<button data-action="useTech" data-id="${id}" ${p.usedTechs.includes(id) || !isHumanTurn() || pending(game) || !["agent", "reveal"].includes(game.phase) ? "disabled" : ""}>${p.usedTechs.includes(id) ? "이번 라운드 사용함" : t.consume ? "폐기하여 사용" : "기술 사용"}</button>` : ""}</div>`;
                })
                .join("")
            : '<p class="small muted">기술 협상 장소에서 새로운 기술을 획득하세요.</p>'
        }</div>`
      : ""
  }
  ${game.options.immortality ? `<div class="group-heading"><h3>베네 틀레이락스</h3><span>표본 ${p.specimens}</span></div><div class="exp-track">${icon("research", 18)} 연구<div class="progress" style="--progress:${(p.research[0] / 8) * 100}%"></div><span>${p.research[0]} / 8</span></div><div class="exp-track">${icon("spiceTrade", 18)} 틀레이락스<div class="progress" style="--progress:${(p.tleilax / 7) * 100}%"></div><span>${p.tleilax} / 7</span></div><p class="small muted">연구 4에서 유전자 Ⅰ, 연구 8에서 유전자 Ⅱ 해금.<br>틀레이락스 4·7에서 승점 1. 최초 4 도달자는 스파이스 2.</p>` : ""}
  <div class="group-heading"><h3>점유지</h3></div><div class="reserve-grid">${[
    "arrakeen",
    "carthag",
    "basin",
  ]
    .map((id) => {
      const owner = game.dreadControl[id]?.player ?? game.control[id];
      return `<div class="reserve-card"><span><strong>${spaceById[id].name}</strong><small>${owner === undefined ? "지배자 없음" : e(game.players[owner].name) + (game.dreadControl[id] ? " · 드레드노트" : "")}</small></span>${icon(spaceById[id].control, 18)}</div>`;
    })
    .join("")}</div>`;
}
function logView() {
  return `<div class="group-heading"><h3>원정 기록</h3><span>최근 ${game.log.length}개 행동</span></div><ol class="log-list">${[
    ...game.log,
  ]
    .reverse()
    .map(
      (item) =>
        `<li><span class="log-round">R ${String(item.round).padStart(2, "0")}</span><i class="log-dot" style="background:${item.player === null ? "#cdb27a" : game.players[item.player].color}"></i><span>${item.player !== null ? `<strong style="color:${game.players[item.player].color}">${e(game.players[item.player].name)}</strong> · ` : ""}${e(item.text)}</span></li>`,
    )
    .join("")}</ol>`;
}
function statusBanner() {
  if (!["roundEnd", "ended", "combat"].includes(game.phase)) return "";
  if (game.phase === "combat" && tab === "combat") return "";
  if (game.phase === "combat")
    return `<div class="status-banner"><span class="eyebrow">COMBAT / INTRIGUE WINDOW</span><h2>전투 음모 단계</h2><p>병력이 있는 플레이어가 순서대로 전투 음모를 사용합니다.<br>모두 연속으로 통과하면 전투가 정산됩니다.</p><div class="row wrap"><button class="secondary" data-action="intrigues">음모 카드 확인 ${icon("eye", 14)}</button>${isHumanTurn() && !pending(game) ? '<button class="primary" data-action="passCombat">전투 통과 →</button>' : ""}</div></div>`;
  if (game.phase === "ended") {
    const win = game.winners.includes(0),
      solo = game.options.mode === "solo";
    return `<div class="status-banner"><span class="eyebrow">EXPEDITION COMPLETE / FINAL STANDINGS</span><h2>${solo ? (win ? "아라키스는 당신의 것입니다." : "또 다른 제국이 떠올랐습니다.") : "원정이 끝났습니다."}</h2><p>${game.winners.map((id) => e(game.players[id].name)).join(", ")} 승리 · ${game.round} 라운드 · ${game.actionCount}번의 결정</p><div class="results">${[
      ...game.players,
    ]
      .sort((a, b) => b.vp - a.vp || b.spice - a.spice)
      .map(
        (p, i) =>
          `<div class="result-line"><span style="color:${p.color}">${i + 1}. ${e(p.name)} · ${e(leaderById[p.leader].name)}</span><strong>${p.vp} VP</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="row wrap"><button class="primary" data-action="home">새로운 원정 준비 ${icon("arrow", 16)}</button><button class="secondary" data-action="export">기록 저장 ${icon("download", 15)}</button></div></div>`;
  }
  return `<div class="status-banner"><span class="eyebrow">ROUND ${game.round} / RESOLUTION</span><h2>이번 라운드 전투 결과</h2><div class="results">${game.roundResults.map((r) => `<div class="result-line"><span style="color:${game.players[r.player].color}">${e(game.players[r.player].name)} · 전투력 ${r.strength}</span><span>${r.rank <= (game.players.length === 4 ? 3 : 2) ? `${r.tied ? "공동 " : ""}${r.rank}위 보상` : "보상 없음"}</span></div>`).join("")}</div><button class="primary" data-action="nextRound" ${pending(game) ? "disabled" : ""}>${pending(game) ? "보상 선택 중" : "다음 라운드"} ${icon("arrow", 17)}</button></div>`;
}
function turnPanel(p) {
  const isAi = game.players[activeId()].ai,
    busy = pending(game),
    human = isHumanTurn(),
    phase = game.phase;
  const title =
    phase === "ended"
      ? "원정 완료"
      : phase === "roundEnd"
        ? "다음 원정을 준비하세요"
        : isAi
          ? `${e(game.players[activeId()].name)}의 차례`
          : busy
            ? "선택을 기다리는 중"
            : phase === "reveal"
              ? "덱을 성장시키세요"
              : phase === "combat"
                ? "전투 음모를 펼치세요"
                : p.agents
                  ? "당신의 다음 한 수는?"
                  : "손패를 공개할 시간";
  return `<aside class="turn-panel"><div class="turn-head"><span class="eyebrow">${isAi ? '<i class="thinking"></i>' : ""}${phase === "agent" ? "AGENT TURN" : phase === "reveal" ? "REVEAL TURN" : phase === "combat" ? "COMBAT PHASE" : "IMPERIUM"} ${isAi ? `<button class="ai-toggle" data-action="fast">${fast ? "2×" : "1×"}</button>` : ""}</span><h2>${title}</h2><p>${isAi ? (paused ? "AI 진행이 일시 정지되었습니다." : "상대의 전략을 읽어보세요.") : phase === "reveal" ? `설득력 ${p.persuasion} · 시장에서 카드 구매 가능` : phase === "agent" ? (selected.length ? "금빛 테두리의 장소에 파견할 수 있습니다." : "카드를 선택하면 가능한 장소가 표시됩니다.") : phase === "combat" ? "음모를 쓰거나 전투를 통과하세요." : "전략은 기록되고, 제국은 계속됩니다."}</p>${aiError ? `<p class="ai-error">${e(aiError)}</p>` : ""}</div><div class="hand-panel"><div class="hand-heading"><span>${phase === "reveal" ? "공개한 카드" : "나의 손패"} · ${phase === "reveal" ? p.revealed.length : p.hand.length}장</span><button class="text-button" style="padding:0;font-size:9px" data-action="deck">덱 ${p.deck.length} / 버림 ${p.discard.length}</button></div><div class="hand-cards">${(phase === "reveal" ? p.revealed : p.hand).map((id, index) => card(id, { index, context: phase === "reveal" ? "inspect" : "hand", selected: selected.includes(index) })).join("") || '<div class="empty">손패가 없습니다.</div>'}</div></div><div class="turn-actions">${phase === "agent" && human && !busy ? `<button class="primary" data-action="reveal">손패 공개 ${icon("arrow", 14)}</button>` : ""}${phase === "reveal" && human && !busy ? `<button class="primary" data-action="tab" data-tab="market">시장 둘러보기 ${icon("cards", 14)}</button><button class="secondary" data-action="endReveal">구매 완료 · 턴 종료 ${icon("check", 13)}</button>` : ""}${phase === "combat" && human && !busy ? '<button class="primary" data-action="passCombat">전투 통과 →</button>' : ""}${isAi ? `<button class="secondary" data-action="pause">${icon(paused ? "play" : "pause", 12)} ${paused ? "AI 계속하기" : "AI 일시 정지"}</button>` : ""}${!["ended", "roundEnd"].includes(phase) ? `<button class="secondary" data-action="intrigues">${icon("eye", 13)} 음모 ${p.intrigues.length}장</button>` : ""}${p.leader === "paul" && !isAi ? `<button class="text-button" data-action="peek">예지 · 덱 위 확인</button>` : ""}${game.options.immortality && p.atomics && human && ["agent", "reveal"].includes(phase) && !busy ? `<button class="text-button" data-action="atomics">가문 원자탄 · 제국 열 교체</button>` : ""}<span class="hand-hint">${p.agents} 요원 · 주둔 병력 ${p.garrison} · 공급처 ${troopSupply(p)}</span></div></aside>`;
}
function gamePage() {
  const p = viewPlayer(),
    navigation = [
      ["board", "board", "보드"],
      ["combat", "swords", "전투"],
      ["market", "cards", "시장"],
      ["empire", "crown", "제국"],
      ["log", "log", "기록"],
    ];
  const wide = ["board", "combat"].includes(tab);
  return `<div class="game-shell"><header class="game-nav"><button data-action="home" style="border:0;padding:0" aria-label="시작 화면">${wordmark()}</button><div><div class="round-label">ROUND ${String(game.round).padStart(2, "0")} <span class="muted">/ 10</span> <span class="badge">${game.options.target} VP</span></div><div class="round-dots">${Array.from({ length: 10 }, (_, i) => `<i class="${i < game.round ? "done" : ""}"></i>`).join("")}</div></div><div class="game-nav-actions"><button class="icon-btn" data-action="undo" aria-label="내 이전 결정 되돌리기" ${!undo ? "disabled" : ""}>${icon("undo", 17)}</button><button class="icon-btn" data-action="sound" aria-label="${sound ? "소리 끄기" : "소리 켜기"}">${icon(sound ? "sound" : "mute", 17)}</button><button class="icon-btn" data-action="settings" aria-label="게임 설정과 저장">${icon("menu", 19)}</button></div></header>${playerRow()}${resourceStrip(p)}${combatSummary()}${storageError ? `<div class="notice">${e(storageError)}</div>` : ""}
  <div id="game-content" aria-hidden="true"></div><nav class="tabs game-tabs" aria-label="게임 화면">${navigation.map(([id, ico, name]) => `<button class="${tab === id ? "active" : ""}" data-action="tab" data-tab="${id}" aria-current="${tab === id ? "page" : "false"}">${icon(ico, 18)} ${name}${id === "market" && game.phase === "reveal" ? `<span>${p.persuasion}</span>` : ""}</button>`).join("")}</nav>
  ${aiError ? `<p class="notice ai-error" role="alert">${e(aiError)}</p>` : ""}
  ${tab !== "combat" && !["combat", "roundEnd", "ended"].includes(game.phase) ? turnBar(p) : ""}
  <div class="game-layout ${wide ? "wide-view" : ""}"><main class="board-main">${statusBanner()}${tab === "board" ? board() : tab === "combat" ? battle() : tab === "market" ? market() : tab === "empire" ? empire() : logView()}<div class="game-fineprint">비공식 팬 에디션 · 선별 카드 · ${game.options.ix ? "익스 ON" : "기본판"} ${game.options.immortality ? "· 불멸 ON" : ""} · <button class="text-button" style="font-size:inherit;padding:0" data-action="scope">구현 범위</button></div></main>${wide ? "" : turnPanel(p)}</div>
  <nav class="mobile-bottom" aria-label="빠른 이동">${navigation.map(([id, ico, name]) => `<button class="${tab === id ? "active" : ""}" data-action="mobileTab" data-tab="${id}">${icon(ico)}${name}</button>`).join("")}</nav></div>`;
}

function modalFrame(content, { wide = false, close = true } = {}) {
  return `<div class="scrim" data-modal-backdrop="true"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="게임 대화상자" tabindex="-1">${close ? `<button class="close" data-action="close" aria-label="닫기">${icon("close", 18)}</button>` : ""}${content}</section></div>`;
}
function decisionModal(d) {
  const p = game.players[d.player];
  if (d.deploy) {
    modal ??= { kind: "deploy", troops: 0, dreads: 0 };
    if (modal.kind !== "deploy")
      modal = { kind: "deploy", troops: 0, dreads: 0 };
    const ctx = game.turnCtx,
      extra =
        Math.max(0, modal.troops - ctx.recruited) +
        Math.max(0, modal.dreads - ctx.dreadRecruited);
    const valid =
      extra <= 2 &&
      modal.troops <= p.garrison &&
      modal.dreads <= p.dreadGarrison;
    return modalFrame(
      `<span class="eyebrow">DEPLOY YOUR FORCES</span><h2>전장에 얼마나 보낼까요?</h2><p>이번 턴 모집 병력 ${ctx.recruited}${ctx.dreadRecruited ? ` · 드레드노트 ${ctx.dreadRecruited}` : ""}개와<br>기존 주둔지 유닛 최대 2개를 추가로 보낼 수 있습니다.</p><div class="quantity"><span>${icon("troops", 17)} 병력 <span class="muted small">주둔 ${p.garrison}</span></span><div class="stepper"><button data-action="quantity" data-key="troops" data-delta="-1" aria-label="병력 줄이기" ${modal.troops <= 0 ? "disabled" : ""}>−</button><strong>${modal.troops}</strong><button data-action="quantity" data-key="troops" data-delta="1" aria-label="병력 늘리기" ${modal.troops >= p.garrison || Math.max(0, modal.troops + 1 - ctx.recruited) + Math.max(0, modal.dreads - ctx.dreadRecruited) > 2 ? "disabled" : ""}>+</button></div></div>${p.dreadGarrison ? `<div class="quantity"><span>${icon("ship", 17)} 드레드노트 <span class="muted small">주둔 ${p.dreadGarrison}</span></span><div class="stepper"><button data-action="quantity" data-key="dreads" data-delta="-1" aria-label="드레드노트 줄이기" ${modal.dreads <= 0 ? "disabled" : ""}>−</button><strong>${modal.dreads}</strong><button data-action="quantity" data-key="dreads" data-delta="1" aria-label="드레드노트 늘리기" ${modal.dreads >= p.dreadGarrison || Math.max(0, modal.troops - ctx.recruited) + Math.max(0, modal.dreads + 1 - ctx.dreadRecruited) > 2 ? "disabled" : ""}>+</button></div></div>` : ""}<div class="notice">전투력 +${modal.troops * 2 + modal.dreads * (p.leader === "rhombur" ? 4 : 3)} · 현재 ${strength(p)}<br>전투가 끝나면 병력은 공급처로, 드레드노트는 주둔지로 돌아갑니다.</div><div class="modal-actions"><button class="secondary" data-action="deployMax">최대 배치</button><button class="primary" data-action="deploy" ${!valid ? "disabled" : ""}>${modal.troops + modal.dreads ? "배치 확정" : "배치 없이 계속"} ${icon("arrow", 15)}</button></div>`,
      { close: false },
    );
  }
  return modalFrame(
    `<span class="eyebrow">${e(p.name)} / CHOOSE YOUR PATH</span><h2>${e(d.title)}</h2><div class="choice-list">${d.options.map((o, i) => `<button data-action="choose" data-index="${i}">${e(o.label)}</button>`).join("")}</div>`,
    { close: false },
  );
}
function overlays() {
  if (veil)
    return modalFrame(
      `<div class="veil">${icon("lock", 38)}<span class="eyebrow" style="display:block">PASS THE DEVICE</span><h2>${e(game.players[veil].name)}의 차례입니다.</h2><p>기기를 다음 플레이어에게 전달하세요.<br>버튼을 누르면 손패가 표시됩니다.</p><button class="primary" data-action="unveil">준비됐습니다 ${icon("arrow", 17)}</button></div>`,
      { close: false },
    );
  const d = screen === "game" && game ? pending(game) : null;
  if (d && !game.players[d.player].ai && (!modal || modal.kind === "deploy"))
    return decisionModal(d);
  if (!modal) return "";
  const p = game ? viewPlayer() : null;
  if (modal.kind === "hand") {
    const revealing = game.phase === "reveal" && game.current === p.id;
    const ids = revealing ? p.revealed : p.hand;
    const selectable =
      isHumanTurn() && game.phase === "agent" && !pending(game);
    const tools = `<div class="hand-tools"><button class="secondary" data-action="deck">${icon("cards", 16)} 나의 덱 · ${p.deck.length} / 버림 ${p.discard.length}</button>${p.leader === "paul" && isHumanTurn() ? '<button class="secondary" data-action="peek">예지 · 덱 위 확인</button>' : ""}${game.options.immortality && p.atomics && isHumanTurn() && ["agent", "reveal"].includes(game.phase) && !pending(game) ? '<button class="secondary" data-action="atomics">가문 원자탄 · 제국 열 교체</button>' : ""}</div><p class="hand-supply">주둔 병력 ${p.garrison} · 공급처 ${troopSupply(p)}</p>`;
    return modalFrame(
      `<span class="eyebrow">${revealing ? "공개한 카드" : "나의 손패"}</span><h2>${selectable ? "파견할 카드를 선택하세요." : "카드 확인"}</h2><p>${selectable ? "카드 아이콘과 일치하는 장소에 요원을 보낼 수 있습니다. 접합 카드는 다른 한 장과 함께 선택하세요." : "카드를 눌러 전체 효과를 확인할 수 있습니다."}</p>${tools}<div class="hand-modal-cards">${ids.map((id, index) => card(id, { index, context: selectable ? "hand" : "inspect", selected: selected.includes(index) })).join("") || '<p class="empty">손패가 없습니다.</p>'}</div><div class="modal-actions"><button class="secondary" data-action="close">닫기</button>${selectable ? `<button class="primary" data-action="finishHand" ${selected.length ? "" : "disabled"}>${selected.length}장 선택 · 장소 보기 →</button>` : ""}</div>`,
      { wide: true },
    );
  }
  if (modal.kind === "scope")
    return modalFrame(
      `<span class="eyebrow">TRANSPARENCY / BUILD 0.1</span><h2>이 에디션에 대하여</h2><p>${COVERAGE.description}</p><ul class="scope-list">${COVERAGE.details.map((t) => `<li>${e(t)}</li>`).join("")}</ul><div class="notice">현재 제국 카드 ${Object.values(CARDS).filter((c) => !c.starter && !c.reserve && !c.tleilaxu).length}종 · 틀레이락스 ${Object.values(CARDS).filter((c) => c.tleilaxu).length}종 · 음모 10종 · 익스 기술 18종.<br>원본 게임을 소유한 플레이어를 위한 비공식 팬 프로젝트입니다.</div><div class="divider"></div><div class="source-links"><a href="https://www.direwolfdigital.com/dune-imperium/resources/" target="_blank" rel="noopener noreferrer">공식 규칙 자료 ↗</a><a href="https://github.com/jjig-muck/dune-imperium-mobile" target="_blank" rel="noopener noreferrer">GitHub 소스 ↗</a></div>`,
      { wide: true },
    );
  if (modal.kind === "help")
    return modalFrame(
      `<span class="eyebrow">FIELD MANUAL</span><h2>사막을 지배하는 법</h2><p>목표는 ${game?.options.target || 10}승점. 누군가 목표에 도달한 라운드가 끝나거나, 10라운드가 끝나면 최종 점수로 승부합니다.</p>${[
        [
          "01",
          "카드로 요원을 파견하세요.",
          "손패를 누르면 카드의 아이콘과 일치하는 장소가 금빛으로 표시됩니다. 장소 비용을 지불하면 장소 효과와 카드의 요원 효과를 모두 얻습니다.",
        ],
        [
          "02",
          "남은 손패를 공개하세요.",
          "라운드당 한 번 공개합니다. 남은 카드에서 설득력과 검을 얻고, 설득력으로 시장의 카드를 구매합니다. 구매한 카드는 버린 카드 더미에 들어갑니다.",
        ],
        [
          "03",
          "전투와 동맹으로 앞서가세요.",
          "교차 검 아이콘 장소에서는 병력을 전장으로 보낼 수 있습니다. 병력당 전투력 2, 검당 +1. 세력 영향력 2에서 우호 승점, 4 이상 단독 선두에서 동맹 승점도 얻습니다.",
        ],
      ]
        .map(
          ([n, t, text]) =>
            `<div class="howto-step"><span>${n}</span><div><h3>${t}</h3><p>${text}</p></div></div>`,
        )
        .join(
          "",
        )}<div class="notice">팁 · 소드마스터는 영구 요원 +1, 고등평의회는 매 라운드 공개 설득력 +2입니다. 덱이 소진되면 버린 카드가 섞여 다시 덱이 됩니다.<br>게임은 행동마다 이 브라우저에 자동 저장됩니다.</div><div class="modal-actions"><button class="secondary" data-action="scope">구현 범위</button><button class="primary" data-action="close">준비됐습니다 ${icon("check", 15)}</button></div>`,
      { wide: true },
    );
  if (modal.kind === "space") {
    const space = spaceById[modal.id],
      reason = legalReason(game, p, space, selected),
      costs = locationCosts(space, p),
      rewards = locationRewards(space, p);
    return modalFrame(
      `<span class="eyebrow">${ICON_NAMES[space.icon]} · ${space.combat ? "전투 장소" : "요원 장소"}</span><h2>${factionIcon(space.icon, 25)} ${space.name}</h2><div class="space-detail"><h3>배치 비용</h3><div class="effect-tokens">${Object.keys(costs).length ? effectTokens(costs, true) : '<span class="no-cost">비용 없음</span>'}</div>${space.requires ? `<p class="location-requirement">${FACTIONS[space.requires.faction].name} 영향력 ${space.requires.amount} 이상 필요 · 현재 ${p.influence[space.requires.faction]}</p>` : ""}<h3>방문 보상</h3><div class="effect-tokens">${effectTokens(rewards)}</div>${space.combat ? '<p class="combat-detail-note">전장 배치 가능 · 이번 턴 모집 유닛 + 기존 주둔 유닛 최대 2개</p>' : ""}</div>${selected.length ? `<p class="gold">사용 카드 · ${selected.map((i) => e(CARDS[p.hand[i]].name)).join(" + ")}</p>` : ""}${reason ? `<p class="location-reason">${e(reason)}</p>` : "<p>요원을 파견하면 장소와 카드의 효과를 모두 얻습니다.</p>"}<div class="modal-actions"><button class="secondary" data-action="close">돌아가기</button><button class="primary" data-action="confirmAgent" data-id="${space.id}" ${reason ? "disabled" : ""}>파견 확정 ${icon("arrow", 17)}</button></div>`,
    );
  }
  if (modal.kind === "purchase" || modal.kind === "inspectCard") {
    const c = CARDS[modal.id],
      zone = modal.zone || "row",
      price = zone === "reserved" ? Math.max(0, c.cost - 1) : c.cost,
      available =
        modal.kind === "purchase" &&
        game.phase === "reveal" &&
        isHumanTurn() &&
        !pending(game),
      enough =
        zone === "tleilax" ? p.specimens >= price : p.persuasion >= price;
    return modalFrame(
      `<span class="eyebrow">${c.tleilaxu ? "TLEILAXU" : "IMPERIUM"} / CARD DETAILS</span><h2>${c.name}</h2><div class="row gap-sm">${c.icons.map((i) => factionIcon(i, 20)).join("")}${c.graft ? '<span class="pill">접합 · 카드 2장 필수</span>' : ""}${c.infiltrate ? '<span class="pill">침투</span>' : ""}</div><div class="divider"></div><p><span class="gold">요원 효과</span><br>${e(describe(c.agent)) || "장소의 효과를 얻습니다."}</p><p><span class="gold">공개 효과</span><br>${e(describe(c.reveal)) || "없음"}</p>${c.acquire ? `<p><span class="gold">획득 즉시</span><br>${describe(c.acquire)}</p>` : ""}${modal.kind === "purchase" ? `<div class="notice">가격 · ${price} ${zone === "tleilax" ? "표본" : "설득력"}<br>${available ? (enough ? "획득한 카드는 다음 덱 순환부터 사용합니다." : "구매 자원이 부족합니다.") : "공개 턴에 구매할 수 있습니다."}</div><div class="modal-actions"><button class="secondary" data-action="close">닫기</button><button class="primary" data-action="confirmBuy" ${available && enough ? "" : "disabled"}>카드 획득 ${icon("arrow", 15)}</button></div>` : ""}`,
    );
  }
  if (modal.kind === "revealConfirm")
    return modalFrame(
      `<span class="eyebrow">REVEAL YOUR HAND</span><h2>손패를 공개할까요?</h2><p>공개 후에는 이번 라운드에 더 이상 요원을 파견할 수 없습니다.${p.agents ? ` 아직 요원이 ${p.agents}개 남아 있습니다.` : ""}</p><div class="notice">남은 ${p.hand.length}장의 공개 효과를 얻고 시장에서 카드를 구매합니다.</div><div class="modal-actions"><button class="secondary" data-action="close">돌아가기</button><button class="primary" data-action="confirmReveal">공개하기 ${icon("cards", 16)}</button></div>`,
    );
  if (modal.kind === "intrigues")
    return modalFrame(
      `<span class="eyebrow">PLANS WITHIN PLANS</span><h2>당신의 음모</h2><div class="intrigue-list">${
        p.intrigues
          .map((id, index) => {
            const c = intrigueById[id],
              usable =
                isHumanTurn() &&
                !pending(game) &&
                (c.timing === "combat"
                  ? game.phase === "combat" && strength(p) > 0
                  : c.timing === "plot" &&
                    ["agent", "reveal"].includes(game.phase)) &&
                Object.entries(c.cost || {}).every(([k, n]) => p[k] >= n);
            return `<div class="intrigue-card"><h3>${c.name} <span class="badge">${{ combat: "전투", plot: "책략", end: "게임 종료" }[c.timing]}</span></h3><p>${c.text}</p>${c.timing !== "end" ? `<button data-action="useIntrigue" data-index="${index}" ${usable ? "" : "disabled"}>${usable ? "음모 사용" : "지금은 사용 불가"}</button>` : ""}</div>`;
          })
          .join("") ||
        "<p>아직 음모 카드가 없습니다.<br>카르타그나 베네 게세리트의 비밀 장소에서 획득하세요.</p>"
      }</div>`,
    );
  if (modal.kind === "player") {
    const q = game.players[modal.id],
      l = leaderById[q.leader];
    return modalFrame(
      `<span class="eyebrow">HOUSE INTELLIGENCE</span><h2 style="color:${q.color}">${e(q.name)} · ${q.vp} VP</h2><p>${l.name}</p><div class="ability"><strong>${l.passive}</strong><p>${l.ability}</p></div><div class="ability"><strong>인장 · ${l.ring}</strong><p>${l.ringText}</p></div><div class="notice">스파이스 ${q.spice} · 물 ${q.water} · 솔라리 ${q.solari}<br>주둔 병력 ${q.garrison} · 전장 병력 ${q.troops} · 남은 요원 ${q.agents}<br>고등평의회 ${q.council ? "보유" : "미보유"} · 소드마스터 ${q.maxAgents === 3 ? "보유" : "미보유"}<br>손패 ${q.hand.length}장 · 음모 ${q.intrigues.length}장</div>`,
    );
  }
  if (modal.kind === "peek")
    return modalFrame(
      `<span class="eyebrow">PRESCIENCE / PAUL ATREIDES</span><h2>미래의 한 조각</h2><p>현재 덱 맨 위 카드입니다. 덱은 섞이지 않습니다.</p><div class="peek-card">${p.deck[0] ? CARDS[p.deck[0]].name : "덱이 비어 있습니다"}</div>`,
    );
  if (modal.kind === "deck") {
    const ids = [
      ...p.deck,
      ...p.discard,
      ...p.hand,
      ...p.played,
      ...p.revealed,
      ...p.setAside,
    ];
    const counts = {};
    ids.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
    return modalFrame(
      `<span class="eyebrow">YOUR ARSENAL / ${ids.length} CARDS</span><h2>나의 덱 구성</h2><p>덱·손패·플레이 중·버린 카드 전체의 구성입니다.<br>카드의 순서는 공개하지 않습니다.</p><div class="deck-list">${Object.entries(
        counts,
      )
        .sort(([a], [b]) => CARDS[b].cost - CARDS[a].cost)
        .map(
          ([id, n]) =>
            `<div><span>${CARDS[id].name}</span><span class="gold">× ${n}</span></div>`,
        )
        .join("")}</div>`,
    );
  }
  if (modal.kind === "settings")
    return modalFrame(
      `<span class="eyebrow">EXPEDITION SETTINGS</span><h2>원정 관리</h2><div class="settings-options"><button data-action="deck">${icon("cards", 15)} 나의 덱 구성</button><button data-action="fast">${icon("play", 15)} AI 속도 ${fast ? "2×" : "1×"}</button><button data-action="help">${icon("info", 15)} 플레이 가이드</button><button data-action="scope">${icon("cards", 15)} 구현 범위와 규칙 차이</button><button data-action="export">${icon("download", 15)} 저장 파일 내보내기</button><label>${icon("cards", 15)} 저장 파일 가져오기<input type="file" id="import-save" accept=".json,application/json"></label><button data-action="sound">${icon(sound ? "sound" : "mute", 15)} 효과음 ${sound ? "켜짐" : "꺼짐"}</button><button data-action="home">${icon("home", 15)} 시작 화면으로 (현재 게임 저장)</button></div><div class="notice">${game.options.mode === "solo" ? `${game.options.aiCount} AI · ${{ easy: "쉬움", normal: "보통", hard: "어려움" }[game.options.difficulty]}` : `로컬 ${game.players.length}인`} · ${game.options.ix ? "익스 ON" : "익스 OFF"} · ${game.options.immortality ? "불멸 ON" : "불멸 OFF"}<br>외부 서버에 플레이 데이터를 전송하지 않습니다. 브라우저 데이터를 지우면 저장도 지워집니다.</div>`,
    );
  if (modal.kind === "newConfirm")
    return modalFrame(
      `<span class="eyebrow">NEW EXPEDITION</span><h2>새 원정을 시작할까요?</h2><p>현재 ${game.round}라운드 게임의 자동 저장이 새 게임으로 교체됩니다. 필요하면 먼저 저장 파일을 내보내세요.</p><div class="notice">${leaderById[config.leader].name} · ${config.mode === "solo" ? `AI ${config.aiCount}명` : `로컬 ${config.humans}인`}<br>${config.ix ? "익스의 부상" : ""} ${config.immortality ? "불멸" : ""}</div><div class="modal-actions"><button class="secondary" data-action="export">기존 게임 백업</button><button class="primary" data-action="confirmStart">새 게임 시작 ${icon("arrow", 15)}</button></div>`,
    );
  if (modal.kind === "atomics")
    return modalFrame(
      `<span class="eyebrow">FAMILY ATOMICS / ONCE PER GAME</span><h2>제국 열을 교체할까요?</h2><p>현재 제국 열의 카드가 모두 제거되고 새 카드 5장이 놓입니다. 가문 원자탄은 게임당 한 번 사용할 수 있습니다.</p><div class="modal-actions"><button class="secondary" data-action="close">돌아가기</button><button class="primary" data-action="confirmAtomics">원자탄 사용 ${icon("refresh", 16)}</button></div>`,
    );
  if (modal.kind === "reclaimed")
    return modalFrame(
      `<span class="eyebrow">RECLAIMED FORCES</span><h2>재생 병력</h2><p>표본 3을 지불하고 보상을 선택합니다.<br>이 카드는 덱에 들어가지 않습니다.</p><div class="choice-list"><button data-action="confirmReclaimed" data-reward="troops" ${p.specimens >= 3 && game.phase === "reveal" && isHumanTurn() && !pending(game) ? "" : "disabled"}>병력 2개 모집</button><button data-action="confirmReclaimed" data-reward="beetle" ${p.specimens >= 3 && game.phase === "reveal" && isHumanTurn() && !pending(game) ? "" : "disabled"}>틀레이락스 트랙 +1</button></div>`,
    );
  if (modal.kind === "importConfirm")
    return modalFrame(
      `<span class="eyebrow">RESTORE EXPEDITION</span><h2>저장된 원정을 불러올까요?</h2><p>${modal.state.round}라운드 · ${modal.state.players.length}인 · ${e(leaderById[modal.state.players[0].leader].name)}<br>현재 자동 저장이 이 파일로 교체됩니다.</p><div class="modal-actions"><button class="secondary" data-action="close">돌아가기</button><button class="primary" data-action="confirmImport">불러오기 ${icon("arrow", 15)}</button></div>`,
    );
  return "";
}

let previousOverlay = "";
function renderOverlay() {
  const content = overlays();
  $("#overlays").innerHTML = content;
  document.body.classList.toggle("no-scroll", !!content);
  const overlayType = veil
    ? "veil"
    : modal?.kind || pending(game || { queue: [] })?.title || "";
  if (content && overlayType !== previousOverlay)
    queueMicrotask(() =>
      $("#overlays button:not(:disabled)")?.focus({ preventScroll: true }),
    );
  previousOverlay = overlayType;
  scheduleAI();
}
function scrollToGameContent() {
  const anchor = $("#game-content");
  if (anchor)
    window.scrollTo({
      top: window.scrollY + anchor.getBoundingClientRect().top,
      behavior: "smooth",
    });
}
function render() {
  const scroll = window.scrollY,
    handScroll = $(".hand-cards")?.scrollLeft || 0,
    boardScroll = $(".board-viewport")?.scrollLeft || 0;
  $("#app").innerHTML = screen === "home" ? home() : gamePage();
  if ($(".hand-cards")) $(".hand-cards").scrollLeft = handScroll;
  if ($(".board-viewport")) $(".board-viewport").scrollLeft = boardScroll;
  renderOverlay();
  window.scrollTo(0, scroll);
}
function scheduleAI() {
  clearTimeout(timer);
  if (
    screen !== "game" ||
    !game ||
    paused ||
    veil ||
    (modal && modal.kind !== "deploy") ||
    game.phase === "ended" ||
    (game.phase === "roundEnd" && !pending(game)) ||
    aiError
  )
    return;
  const p = game.players[activeId()];
  if (!p.ai) return;
  timer = setTimeout(
    () => {
      try {
        const action = chooseAI(game);
        if (!action) throw new Error("AI의 다음 행동을 찾지 못했습니다.");
        commit(action, true);
      } catch (error) {
        aiError = `AI 진행 오류: ${error.message}`;
        paused = true;
        console.error(error);
        render();
        toast(aiError);
      }
    },
    fast ? 100 : 650,
  );
}
function commit(action, ai = false) {
  try {
    const before = game,
      oldActor = activeId();
    const next = act(game, action);
    if (!ai) undo = before;
    game = next;
    modal = null;
    selected = [];
    aiError = "";
    save();
    if (action.type === "reveal") tab = "market";
    if (action.type === "nextRound") tab = "board";
    if (
      (game.phase === "combat" && before.phase !== "combat") ||
      action.type === "passCombat"
    )
      tab = "combat";
    if (
      game.options.mode === "hotseat" &&
      oldActor !== activeId() &&
      !["roundEnd", "ended"].includes(game.phase)
    )
      veil = activeId();
    render();
    if (!ai) clickSound();
  } catch (error) {
    console.error(error);
    toast(error.message);
  }
}
function startGame() {
  try {
    game = createGame(config, crypto.getRandomValues(new Uint32Array(1))[0]);
    screen = "game";
    tab = "board";
    selected = [];
    modal = null;
    undo = null;
    paused = false;
    aiError = "";
    veil = game.options.mode === "hotseat" ? 0 : null;
    save();
    render();
    window.scrollTo(0, 0);
  } catch (error) {
    toast(error.message);
  }
}
function downloadSave() {
  if (!game) return;
  const blob = new Blob([JSON.stringify(game, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `imperium-round-${game.round}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("원정 저장 파일을 내보냈습니다.");
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const action = b.dataset.action;
  if (action === "boardMode") {
    boardMode = b.dataset.mode === "map" ? "map" : "large";
    render();
    return;
  }
  if (action === "jumpZone") {
    document
      .getElementById("zone-" + b.dataset.zone)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    return;
  }
  if (action === "finishHand") {
    modal = null;
    tab = "board";
    render();
    scrollToGameContent();
    return;
  }
  if (action === "config") {
    config[b.dataset.key] = ["aiCount", "humans"].includes(b.dataset.key)
      ? Number(b.dataset.value)
      : b.dataset.value;
    settingsSave();
    render();
    return;
  }
  if (action === "leader") {
    config.leader = b.dataset.id;
    settingsSave();
    render();
    return;
  }
  if (action === "setup") {
    $("#setup").scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (action === "switchMode") {
    config.mode = config.mode === "solo" ? "hotseat" : "solo";
    settingsSave();
    render();
    return;
  }
  if (action === "start") {
    if (game && game.phase !== "ended") {
      modal = { kind: "newConfirm" };
      renderOverlay();
    } else startGame();
    return;
  }
  if (action === "confirmStart") {
    startGame();
    return;
  }
  if (action === "resume") {
    screen = "game";
    tab = ["combat", "roundEnd"].includes(game.phase) ? "combat" : "board";
    modal = null;
    if (
      game.options.mode === "hotseat" &&
      !["ended", "roundEnd"].includes(game.phase)
    )
      veil = activeId();
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (action === "home") {
    screen = "home";
    modal = null;
    veil = null;
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (
    [
      "help",
      "scope",
      "settings",
      "intrigues",
      "deck",
      "atomics",
      "reclaimed",
      "hand",
    ].includes(action)
  ) {
    modal = { kind: action };
    renderOverlay();
    return;
  }
  if (action === "close") {
    modal = null;
    renderOverlay();
    return;
  }
  if (action === "sound") {
    sound = !sound;
    settingsSave();
    if (sound) clickSound();
    render();
    return;
  }
  if (action === "tab" || action === "mobileTab") {
    tab = b.dataset.tab;
    render();
    scrollToGameContent();
    return;
  }
  if (action === "card") {
    if (!isHumanTurn() || game.phase !== "agent" || pending(game)) {
      modal = {
        kind: "inspectCard",
        id: viewPlayer().hand[Number(b.dataset.index)],
      };
      renderOverlay();
      return;
    }
    const index = Number(b.dataset.index);
    if (selected.includes(index))
      selected = selected.filter((i) => i !== index);
    else if (selected.length < 2) selected.push(index);
    else selected = [index];
    render();
    return;
  }
  if (action === "space") {
    modal = { kind: "space", id: b.dataset.id };
    renderOverlay();
    return;
  }
  if (action === "confirmAgent") {
    commit({ type: "agent", cards: selected, space: b.dataset.id });
    return;
  }
  if (action === "reveal") {
    modal = { kind: "revealConfirm" };
    renderOverlay();
    return;
  }
  if (action === "confirmReveal") {
    commit({ type: "reveal" });
    return;
  }
  if (action === "endReveal") {
    commit({ type: "endReveal" });
    return;
  }
  if (action === "marketCard") {
    const zone = b.dataset.zone,
      index = Number(b.dataset.index),
      id =
        zone === "row"
          ? game.row[index]
          : zone === "tleilax"
            ? game.tleilaxRow[index]
            : viewPlayer().reserved[index];
    modal = { kind: "purchase", zone, index, id };
    renderOverlay();
    return;
  }
  if (action === "reserveCard") {
    modal = { kind: "purchase", zone: "reserve", id: b.dataset.id };
    renderOverlay();
    return;
  }
  if (action === "confirmBuy") {
    const m = modal;
    commit({ type: "buy", zone: m.zone, index: m.index, id: m.id });
    return;
  }
  if (action === "inspectCard") {
    modal = { kind: "inspectCard", id: b.dataset.id };
    renderOverlay();
    return;
  }
  if (action === "choose") {
    commit({ type: "choose", index: Number(b.dataset.index) });
    return;
  }
  if (action === "quantity") {
    modal[b.dataset.key] = Math.max(
      0,
      modal[b.dataset.key] + Number(b.dataset.delta),
    );
    renderOverlay();
    return;
  }
  if (action === "deployMax") {
    const p = viewPlayer(),
      ctx = game.turnCtx;
    modal.troops = Math.min(p.garrison, ctx.recruited + 2);
    modal.dreads = Math.min(
      p.dreadGarrison,
      ctx.dreadRecruited +
        Math.max(0, 2 - Math.max(0, modal.troops - ctx.recruited)),
    );
    renderOverlay();
    return;
  }
  if (action === "deploy") {
    commit({ type: "deploy", troops: modal.troops, dreads: modal.dreads });
    return;
  }
  if (action === "useIntrigue") {
    commit({ type: "intrigue", index: Number(b.dataset.index) });
    return;
  }
  if (action === "useTech") {
    commit({ type: "tech", id: b.dataset.id });
    return;
  }
  if (action === "passCombat") {
    commit({ type: "passCombat" });
    return;
  }
  if (action === "nextRound") {
    commit({ type: "nextRound" });
    return;
  }
  if (action === "confirmAtomics") {
    commit({ type: "atomics" });
    return;
  }
  if (action === "confirmReclaimed") {
    commit({ type: "reclaimed", reward: b.dataset.reward });
    return;
  }
  if (action === "peek") {
    if (viewPlayer().leader === "paul") {
      modal = { kind: "peek" };
      renderOverlay();
    }
    return;
  }
  if (action === "player") {
    modal = { kind: "player", id: Number(b.dataset.id) };
    renderOverlay();
    return;
  }
  if (action === "fast") {
    fast = !fast;
    render();
    return;
  }
  if (action === "pause") {
    paused = !paused;
    aiError = "";
    render();
    return;
  }
  if (action === "unveil") {
    veil = null;
    render();
    return;
  }
  if (action === "undo") {
    if (undo) {
      const previous = undo;
      undo = null;
      game = previous;
      modal = null;
      selected = [];
      paused = false;
      aiError = "";
      save();
      render();
      toast("이전 결정으로 되돌렸습니다.");
    }
    return;
  }
  if (action === "export") {
    downloadSave();
    return;
  }
  if (action === "confirmImport") {
    game = modal.state;
    modal = null;
    screen = "game";
    selected = [];
    undo = null;
    paused = false;
    aiError = "";
    veil = game.options.mode === "hotseat" ? activeId() : null;
    save();
    render();
    toast("원정을 불러왔습니다.");
    return;
  }
});
document.addEventListener("change", async (event) => {
  const input = event.target;
  if (["ix", "immortality"].includes(input.name)) {
    config[input.name] = input.checked;
    if (!config.ix && leaderById[config.leader]?.expansion)
      config.leader = "paul";
    settingsSave();
    render();
  }
  if (input.id === "import-save" && input.files?.[0]) {
    try {
      const file = input.files[0];
      if (file.size > 2000000)
        throw new Error("저장 파일은 2MB 이하여야 합니다.");
      const state = restore(await file.text());
      modal = { kind: "importConfirm", state };
      renderOverlay();
    } catch (error) {
      toast(`불러오기 실패: ${error.message}`);
    }
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && modal.kind !== "deploy") {
    modal = null;
    renderOverlay();
  }
  if (event.key === "Tab" && $("#overlays .modal")) {
    const focusable = [
      ...$("#overlays").querySelectorAll(
        'button:not(:disabled),a,input:not([type=file]),[tabindex="0"]',
      ),
    ];
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0],
      last = focusable.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !$("#overlays").contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !$("#overlays").contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
});
window.addEventListener("pagehide", () => {
  if (game) save();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(timer);
    if (game) save();
  } else scheduleAI();
});
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Offline cache unavailable:", error);
  });
