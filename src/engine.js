import {
  CARDS,
  LEADERS,
  leaderById,
  FACTIONS,
  activeSpaces,
  spaceById,
  TECHS,
  techById,
  CONFLICTS,
  conflictById,
  INTRIGUES,
  intrigueById,
  RESEARCH,
} from "./data.js";

export const VERSION = 1;
const F = Object.keys(FACTIONS);
export const clone = (s) => structuredClone(s);
const assert = (yes, message) => {
  if (!yes) throw new Error(message);
};
export function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
function shuffle(s, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const effectItems = (player, effects, source) =>
  Object.entries(effects || {}).map(([key, value]) => ({
    kind: "effect",
    player,
    key,
    value,
    source,
  }));
function prepend(s, items) {
  s.queue.unshift(...items);
}
function effects(s, player, value, source) {
  prepend(s, effectItems(player, value, source));
}
function decision(s, player, title, options, extra = {}) {
  if (options.length)
    prepend(s, [{ kind: "decision", player, title, options, ...extra }]);
}
const option = (label, effects) => ({ label, effects });
export const currentPlayer = (s) => s.players[s.current];
export const pending = (s) =>
  s.queue[0]?.kind === "decision" ? s.queue[0] : null;
export const conflict = (s) => conflictById[s.conflicts[s.round - 1]];
export const ownedCount = (p, id) =>
  ["deck", "hand", "played", "discard", "revealed", "setAside"].reduce(
    (n, k) => n + (p[k] || []).filter((c) => c === id).length,
    0,
  );
export const troopSupply = (p) =>
  Math.max(0, 16 - p.garrison - p.troops - p.specimens - p.negotiators);
export const hasTech = (p, id) => p.techs.includes(id);
export const strength = (p) =>
  p.troops + p.dreadCombat > 0
    ? p.troops * 2 + p.dreadCombat * (p.leader === "rhombur" ? 4 : 3) + p.swords
    : 0;
export const resources = {
  spice: "스파이스",
  water: "물",
  solari: "솔라리",
  persuasion: "설득력",
  swords: "검",
  vp: "승점",
  troops: "병력",
  specimen: "표본",
  draw: "카드",
  intrigue: "음모",
  research: "연구",
  beetle: "틀레이락스",
  shipment: "수송",
  negotiators: "협상가",
};
export function describe(e) {
  return Object.entries(e || {})
    .map(([k, v]) => {
      if (k === "influence")
        return typeof v === "object"
          ? `${FACTIONS[v.faction]?.name || "세력"} 영향력 ${v.amount}`
          : `아무 세력 영향력 ${v}`;
      if (k === "control") return `${spaceById[v]?.name} 지배`;
      if (k === "optional" || k === "optional2")
        return `${describe(v.cost)} → ${describe(v.gain)}`;
      if (k === "choice") return v.map((o) => o.label).join(" / ");
      if (k === "helix" || k === "helix2")
        return `${k === "helix" ? "유전자 Ⅰ" : "유전자 Ⅱ"}: ${describe(v)}`;
      if (k === "grafted") return `접합했다면 ${describe(v)}`;
      if (k === "ifOccupied") return `상대가 차지한 장소라면 ${describe(v)}`;
      if (k === "ifInfluence")
        return `${FACTIONS[v.faction]?.name} 영향력 ${v.min} 이상: ${describe(v.effects)}`;
      if (k === "influenceAllowed")
        return `${v.map((f) => FACTIONS[f].name).join(" / ")} 영향력 1`;
      if (k === "discardReward") return `손패 1장 버리기 → ${describe(v)}`;
      if (k === "discardCards")
        return `손패 ${v.count}장 버리기 → ${describe(v.gain)}`;
      if (k === "trashGrafted") return `다른 접합 카드 폐기 → ${describe(v)}`;
      if (k === "perOtherIcons")
        return "다른 접합 카드의 요원 아이콘마다 솔라리 1";
      if (k === "masterAcquire")
        return "비용 6 이하 제국 카드 무료 획득 (유전자 Ⅱ: 손으로)";
      if (k === "bond" || k === "beneBond")
        return `${k === "bond" ? "프레멘 결속" : "자매단 연계"}: ${describe(v)}`;
      if (resources[k]) return `${resources[k]} ${v}`;
      return (
        {
          ring: "지도자 인장 능력",
          trash: "카드 1장 폐기 가능",
          trashSelf: "이 카드 폐기",
          harvest: `스파이스 ${v} 수확`,
          breed: "카드 1장 폐기 → 2장 뽑기",
          council: "고등평의회 의석",
          swordmaster: "영구 요원 +1",
          agents: "이번 라운드 요원 +1",
          tech: `기술 구매 (할인 ${v})`,
          negotiate: "협상가 배치 / 기술 구매",
          memory: "카드 뽑기 / 자매단 회수",
          doubleHarvest: "기본 수확량 2배",
          retreat: `병력 최대 ${v}개 후퇴 가능`,
          extraInfluence: "파견 세력 영향력 추가 +1",
          stealIntrigue: "음모 4장 이상인 상대에게서 1장 탈취",
          humanity: "상대가 카드 또는 전장 병력을 잃음",
          ifInfluence: "영향력 조건부 효과",
          negotiators: `협상가 ${v}`,
          distinctInfluence: `서로 다른 ${v}세력 영향력`,
          acquire: `${CARDS[v]?.name || v} 획득`,
          nextMentat: "다음 라운드 멘타트",
          dreads: "드레드노트 건조",
          perFremen: "플레이 중 프레멘 카드마다 설득력 2",
          discardDraw: "손패 1장 버리기 → 1장 뽑기",
          satelliteScore: "스파이스 3 + 이 기술 폐기 → 승점 1",
          replaceIntrigues: "선택한 음모 교체",
          combatRecruit: `병력 ${v}개 전장 모집`,
        }[k] || k
      );
    })
    .join(" · ");
}

export function createGame(config = {}, seed = Date.now()) {
  const options = {
    ix: !!config.ix,
    immortality: !!config.immortality,
    difficulty: config.difficulty || "normal",
    aiCount: config.aiCount === 3 ? 3 : 2,
    mode: config.mode === "hotseat" ? "hotseat" : "solo",
    humans: Math.min(4, Math.max(2, Number(config.humans) || 2)),
    target: config.target === 11 ? 11 : 10,
  };
  assert(
    ["easy", "normal", "hard"].includes(options.difficulty),
    "알 수 없는 난이도입니다.",
  );
  const eligible = LEADERS.filter((l) => !l.expansion || options[l.expansion]);
  const chosen = config.leader || "paul";
  assert(
    eligible.some((l) => l.id === chosen),
    "이 지도자는 선택한 확장에서 사용할 수 없습니다.",
  );
  const s = {
    version: VERSION,
    options,
    rng: seed >>> 0,
    round: 0,
    first: 0,
    current: 0,
    phase: "agent",
    queue: [],
    players: [],
    row: [],
    imperium: [],
    tleilaxRow: [],
    tleilaxDeck: [],
    techStacks: [],
    intrigueDeck: [],
    intrigueDiscard: [],
    conflicts: [],
    alliances: Object.fromEntries(F.map((f) => [f, null])),
    occupied: {},
    control: {},
    dreadControl: {},
    bonus: { basin: 0, hagga: 0, flat: 0 },
    log: [],
    roundResults: [],
    tleilaxBonus: 2,
    actionCount: 0,
    turnCtx: null,
    createdAt: new Date().toISOString(),
  };
  const count = options.mode === "solo" ? options.aiCount + 1 : options.humans;
  const remaining = shuffle(
    s,
    eligible.filter((l) => l.id !== chosen).map((l) => l.id),
  );
  for (let i = 0; i < count; i++) {
    const id = i === 0 ? chosen : config.leaders?.[i] || remaining.shift();
    assert(
      eligible.some((l) => l.id === id) &&
        !s.players.some((p) => p.leader === id),
      "지도자는 중복 없이 선택해야 합니다.",
    );
    const p = {
      id: i,
      name:
        options.mode === "solo"
          ? i === 0
            ? String(config.name || "당신").slice(0, 20)
            : `AI ${i}`
          : `플레이어 ${i + 1}`,
      ai: options.mode === "solo" && i > 0,
      leader: id,
      color: ["#76ad9c", "#bf866c", "#8da4c9", "#b298cc"][i],
      spice: id === "rabban" ? 1 : 0,
      solari: id === "rabban" ? 1 : 0,
      water: id === "yuna" ? 0 : 1,
      vp: count === 4 ? 1 : 0,
      garrison: 3,
      troops: 0,
      dreadGarrison: 0,
      dreadCombat: 0,
      specimens: 0,
      negotiators: 0,
      swords: 0,
      persuasion: 0,
      agents: 2,
      maxAgents: 2,
      council: false,
      deck: [],
      hand: [],
      played: [],
      revealed: [],
      discard: [],
      intrigues: [],
      reserved: [],
      influence: Object.fromEntries(F.map((f) => [f, 0])),
      techs: [],
      usedTechs: [],
      shipping: 0,
      research: [0, 0],
      tleilax: 0,
      atomics: options.immortality,
      snooped: [],
      baronFactions: [],
      masterstroke: false,
      turns: 0,
      setAside: [],
      ileBonus: null,
      won: 0,
    };
    p.deck = shuffle(s, [
      "argument",
      "argument",
      "dagger",
      "dagger",
      "diplomacy",
      options.immortality ? "experimentation" : "dune",
      options.immortality ? "experimentation" : "dune",
      "recon",
      "seekAllies",
      "signet",
    ]);
    s.players.push(p);
  }
  const pool = Object.values(CARDS).filter(
    (c) =>
      !c.starter &&
      !c.reserve &&
      !c.tleilaxu &&
      (!c.expansion || options[c.expansion]),
  );
  s.imperium = shuffle(
    s,
    pool.flatMap((c) => Array(c.copies || 1).fill(c.id)),
  );
  s.row = s.imperium.splice(0, 5);
  if (options.immortality) {
    s.tleilaxDeck = shuffle(
      s,
      Object.values(CARDS)
        .filter((c) => c.tleilaxu)
        .flatMap((c) => Array(c.copies || 1).fill(c.id)),
    );
    s.tleilaxRow = s.tleilaxDeck.splice(0, 2);
  }
  if (options.ix) {
    const techs = shuffle(
      s,
      TECHS.map((t) => t.id),
    );
    s.techStacks = [techs.slice(0, 6), techs.slice(6, 12), techs.slice(12)];
  }
  s.intrigueDeck = shuffle(
    s,
    INTRIGUES.flatMap((c) => Array(c.timing === "end" ? 2 : 3).fill(c.id)),
  );
  const conf = CONFLICTS.filter((c) => !c.expansion || options[c.expansion]);
  s.conflicts = [
    ...shuffle(
      s,
      conf.filter((c) => c.level === 1),
    ).slice(0, 1),
    ...shuffle(
      s,
      conf.filter((c) => c.level === 2),
    ).slice(0, 5),
    ...shuffle(
      s,
      conf.filter((c) => c.level === 3),
    ).slice(0, 4),
  ].map((c) => c.id);
  for (const p of s.players) {
    if (p.leader === "baron")
      s.queue.push({
        kind: "effect",
        player: p.id,
        key: "baronSetup",
        value: true,
      });
    if (p.leader === "hundro")
      s.queue.push({
        kind: "effect",
        player: p.id,
        key: "hundroSetup",
        value: true,
      });
  }
  s.queue.push({ kind: "system", task: "newRound" });
  settle(s);
  return s;
}
function log(s, text, player = null) {
  s.log.push({ round: s.round, player, text });
  if (s.log.length > 500) s.log.shift();
}
function draw(s, p, n) {
  for (let i = 0; i < n; i++) {
    if (!p.deck.length && p.discard.length) {
      p.deck = shuffle(s, p.discard);
      p.discard = [];
    }
    if (p.deck.length) p.hand.push(p.deck.shift());
  }
}
function drawIntrigue(s, p, n) {
  for (let i = 0; i < n; i++) {
    if (!s.intrigueDeck.length) {
      s.intrigueDeck = shuffle(s, s.intrigueDiscard);
      s.intrigueDiscard = [];
    }
    if (s.intrigueDeck.length) p.intrigues.push(s.intrigueDeck.shift());
  }
}
function recruit(s, p, n) {
  const actual = Math.min(troopSupply(p), n);
  p.garrison += actual;
  if (s.turnCtx?.player === p.id) s.turnCtx.recruited += actual;
  return actual;
}
function pay(p, cost) {
  for (const [k, n] of Object.entries(cost || {})) {
    assert(p[k] >= n, `${resources[k] || k}가 부족합니다.`);
  }
  for (const [k, n] of Object.entries(cost || {})) p[k] -= n;
}
const canPay = (p, cost) =>
  Object.entries(cost || {}).every(([k, n]) => p[k] >= n);
function cardOptions(p, zones = ["hand", "discard", "played", "revealed"]) {
  return zones.flatMap((zone) =>
    (p[zone] || []).map((id, index) => ({ id, zone, index })),
  );
}
function trashCard(s, p, ref) {
  assert(p[ref.zone]?.[ref.index] === ref.id, "카드가 이미 이동했습니다.");
  p[ref.zone].splice(ref.index, 1);
  const c = CARDS[ref.id];
  log(s, `${c.name} 폐기`, p.id);
  if (c.unload) effects(s, p.id, c.reveal, ref.id);
  if (c.onTrash) effects(s, p.id, c.onTrash, ref.id);
}
function discardCard(s, p, ref) {
  assert(p[ref.zone]?.[ref.index] === ref.id, "카드가 이미 이동했습니다.");
  p[ref.zone].splice(ref.index, 1);
  p.discard.push(ref.id);
  if (CARDS[ref.id].unload) effects(s, p.id, CARDS[ref.id].reveal, ref.id);
}
function trashDecision(s, p, zones, after = {}) {
  const refs = cardOptions(p, zones);
  decision(s, p.id, "폐기할 카드를 선택하세요", [
    ...refs.map((ref) =>
      option(
        `${CARDS[ref.id].name} · ${ref.zone === "hand" ? "손패" : ref.zone === "discard" ? "버린 카드" : "플레이 중"}`,
        { trashRef: ref, ...after },
      ),
    ),
    option("폐기하지 않기", {}),
  ]);
}
function factionDecision(
  s,
  p,
  amount = 1,
  allowed = F,
  after = {},
  exclude = [],
) {
  const choices = allowed.filter(
    (f) =>
      !exclude.includes(f) &&
      p.influence[f] < (amount > 0 ? 6 : Infinity) &&
      p.influence[f] >= (amount < 0 ? 1 : 0),
  );
  decision(
    s,
    p.id,
    amount > 0 ? "영향력을 얻을 세력" : "영향력을 잃을 세력",
    choices.map((f) =>
      option(
        `${FACTIONS[f].name} (${p.influence[f]} → ${Math.max(0, Math.min(6, p.influence[f] + amount))})`,
        { influence: { faction: f, amount }, ...after },
      ),
    ),
  );
}
function influence(s, p, f, amount) {
  const old = p.influence[f],
    next = Math.min(6, Math.max(0, old + amount));
  p.influence[f] = next;
  if (old < 2 && next >= 2) {
    p.vp++;
    log(s, `${FACTIONS[f].name} 우호 달성 · 승점 +1`, p.id);
  }
  if (old >= 2 && next < 2) p.vp--;
  if (old < 4 && next >= 4) effects(s, p.id, FACTIONS[f].bonus);
  const owner = s.alliances[f];
  if (owner === p.id && next < 4) {
    s.alliances[f] = null;
    p.vp--;
  }
  const max = Math.max(...s.players.map((q) => q.influence[f]));
  const candidates = s.players.filter(
    (q) => q.influence[f] === max && max >= 4,
  );
  if (candidates.length === 1 && s.alliances[f] !== candidates[0].id) {
    const previous = s.alliances[f];
    if (previous !== null) s.players[previous].vp--;
    s.alliances[f] = candidates[0].id;
    candidates[0].vp++;
    log(s, `${FACTIONS[f].name} 동맹 획득`, candidates[0].id);
  }
  if (p.leader === "tessia" && old < 2 && next >= 2 && !p.snooped.includes(f)) {
    p.snooped.push(f);
    const n = p.snooped.length;
    if (n === 1) effects(s, p.id, { discardReward: { spice: 1 } });
    if (n === 2 || n === 4) effects(s, p.id, FACTIONS[f].bonus);
    if (n === 3 || n === 4)
      effects(s, p.id, { influence: { faction: f, amount: 1 } });
  }
}
function gainCard(s, p, id, { tleilaxu = false, top = false } = {}) {
  const put = top ? "deck" : "discard";
  if (top) p.deck.unshift(id);
  else p[put].push(id);
  log(s, `${CARDS[id].name} 획득`, p.id);
  if (CARDS[id].acquire) effects(s, p.id, CARDS[id].acquire, id);
  if (!top && (hasTech(p, "spaceport") || (tleilaxu && p.research[0] >= 4)))
    decision(s, p.id, `${CARDS[id].name}을 덱 위에 놓을까요?`, [
      option("버린 카드 더미에 유지", {}),
      option("덱 맨 위에 놓기", { topAcquired: id }),
    ]);
}
export function spaceCost(p, space, selected = []) {
  const cost = { ...(space.cost || {}) };
  if (p.leader === "leto" && space.icon === "landsraad" && cost.solari)
    cost.solari = Math.max(0, cost.solari - 1);
  if (space.id === "heighliner" && selected.includes("guildAccord"))
    cost.spice = 4;
  return cost;
}
export function legalReason(s, p, space, selected = []) {
  if (s.phase !== "agent" || pending(s))
    return "현재는 요원을 파견할 수 없습니다.";
  if (p.revealedTurn) return "이번 라운드 공개를 마쳤습니다.";
  if (p.agents < 1) return "남은 요원이 없습니다.";
  if (!activeSpaces(s.options).some((x) => x.id === space.id))
    return "이 장소는 선택한 확장에 없습니다.";
  const cards = selected
    .map((i) => (typeof i === "number" ? CARDS[p.hand[i]] : CARDS[i]))
    .filter(Boolean);
  if (!cards.length) return "먼저 손패를 선택하세요.";
  if (cards.length > 2) return "한 번에 최대 두 카드만 사용할 수 있습니다.";
  if (cards.length === 2 && !cards.some((c) => c.graft))
    return "두 카드를 쓰려면 접합 카드가 필요합니다.";
  if (cards.length === 1 && cards[0].graft)
    return "접합 카드는 다른 카드 한 장과 함께 사용하세요.";
  if (!cards.some((c) => c.icons.includes(space.icon)))
    return "선택한 카드에 이 장소의 아이콘이 없습니다.";
  const occupying = s.occupied[space.id] || [];
  if (occupying.includes(p.id)) return "자신의 요원이 이미 있습니다.";
  if (
    occupying.length &&
    !cards.some((c) => c.infiltrate) &&
    !(p.leader === "helena" && ["landsraad", "city"].includes(space.icon)) &&
    !p.invasionReady
  )
    return "상대 요원이 먼저 차지한 장소입니다.";
  if (
    space.requires &&
    p.influence[space.requires.faction] < space.requires.amount
  )
    return `${FACTIONS[space.requires.faction].name} 영향력 ${space.requires.amount} 필요`;
  if (space.id === "council" && p.council)
    return "이미 평의회 의석이 있습니다.";
  if (space.id === "swordmaster" && p.maxAgents === 3)
    return "이미 소드마스터를 보유하고 있습니다.";
  if (
    space.id === "dreadnought" &&
    p.dreadGarrison +
      p.dreadCombat +
      Object.values(s.dreadControl).filter((x) => x.player === p.id).length >=
      2
  )
    return "드레드노트는 최대 2개입니다.";
  const cost = spaceCost(
    p,
    space,
    cards.map((c) => c.id),
  );
  if (!canPay(p, cost)) return `${describe(cost)} 필요`;
  return "";
}
function nextTurn(s) {
  s.turnCtx = null;
  if (s.players.every((p) => p.revealedTurn)) {
    startCombat(s);
    return;
  }
  for (let i = 1; i <= s.players.length; i++) {
    const id = (s.current + i) % s.players.length;
    if (!s.players[id].revealedTurn) {
      s.current = id;
      s.phase = "agent";
      beginTurn(s, s.players[id]);
      return;
    }
  }
}
function beginTurn(s, p) {
  p.turns++;
  if (p.leader === "ilesa" && p.turns === 2 && p.setAside.length) {
    p.ileBonus = p.setAside[0];
    p.hand.push(...p.setAside);
    p.setAside = [];
    log(s, "보관 카드를 손으로 되돌림", p.id);
  }
}
function newRound(s) {
  s.round++;
  s.phase = "agent";
  s.occupied = {};
  s.current = s.first;
  s.roundResults = [];
  s.passCount = 0;
  for (const p of s.players) {
    p.agents = p.maxAgents + (p.nextMentat ? 1 : 0);
    p.nextMentat = false;
    p.persuasion = 0;
    p.swords = 0;
    p.played = [];
    p.revealed = [];
    p.revealedTurn = false;
    p.usedTechs = [];
    p.turns = 0;
    p.ileBonus = null;
    p.invasionReady = false;
    draw(s, p, hasTech(p, "engine") ? 6 : 5);
    for (const id of p.techs)
      if (techById[id].round)
        s.queue.push(...effectItems(p.id, techById[id].round, "round"));
    if (p.leader === "ilesa" && p.hand.length)
      s.queue.push({
        kind: "effect",
        player: p.id,
        key: "ilesaStore",
        value: true,
      });
  }
  const location = conflict(s).location;
  const owner = location ? controller(s, location) : null;
  if (owner !== null && owner !== undefined) {
    const p = s.players[owner];
    if (troopSupply(p) > 0) p.troops++;
  }
  beginTurn(s, s.players[s.current]);
  log(s, `${s.round} 라운드 · ${conflict(s).name}`);
}
function startCombat(s) {
  s.phase = "combat";
  s.passCount = 0;
  s.current = s.first;
  seekCombatant(s);
  if (!s.players.some((p) => strength(p) > 0)) resolveCombat(s);
  else log(s, "전투 음모 단계");
}
function seekCombatant(s) {
  for (let i = 0; i < s.players.length; i++) {
    if (strength(s.players[s.current]) > 0) return;
    s.current = (s.current + 1) % s.players.length;
  }
}
export function combatRanks(players) {
  return players
    .map((p) => ({ player: p.id, strength: strength(p) }))
    .sort((a, b) => b.strength - a.strength)
    .map((entry, _, arr) => {
      const greater = arr.filter((e) => e.strength > entry.strength).length;
      const ties = arr.filter((e) => e.strength === entry.strength).length;
      return {
        ...entry,
        rank: entry.strength > 0 ? greater + 1 + (ties > 1 ? 1 : 0) : 99,
        tied: ties > 1,
      };
    });
}
function resolveCombat(s) {
  const ranks = combatRanks(s.players),
    battle = conflict(s);
  s.roundResults = ranks;
  s.phase = "roundEnd";
  s.current = s.first;
  for (const result of ranks) {
    const p = s.players[result.player];
    const rewardRank = result.rank;
    if (rewardRank <= (s.players.length === 4 ? 3 : 2))
      s.queue.push(...effectItems(p.id, battle.rewards[rewardRank - 1]));
    if (rewardRank === 1) {
      p.won++;
      for (const id of p.techs)
        if (techById[id].win)
          s.queue.push(...effectItems(p.id, techById[id].win));
      if (p.dreadCombat)
        s.queue.push({
          kind: "effect",
          player: p.id,
          key: "dreadVictory",
          value: true,
        });
    }
  }
  s.queue.push({ kind: "system", task: "combatCleanup" });
  log(s, `${battle.name} 전투 종료`);
}
function controller(s, id) {
  return s.dreadControl[id]?.player ?? s.control[id] ?? null;
}
function cleanupCombat(s) {
  for (const [id, ctrl] of Object.entries(s.dreadControl)) {
    if (ctrl.until <= s.round) {
      s.players[ctrl.player].dreadGarrison++;
      delete s.dreadControl[id];
    }
  }
  for (const p of s.players) {
    p.troops = 0;
    p.dreadGarrison += p.dreadCombat;
    p.dreadCombat = 0;
    p.swords = 0;
  }
  for (const id of Object.keys(s.bonus))
    if (!s.occupied[id]?.length) s.bonus[id]++;
  if (s.players.some((p) => p.vp >= s.options.target) || s.round >= 10) {
    s.queue.push({ kind: "system", task: "endGame" });
  }
}
function endGame(s) {
  s.phase = "ended";
  s.turnCtx = null;
  for (const p of s.players) {
    for (const id of p.intrigues) {
      if (id === "secretPact" && F.every((f) => p.influence[f] >= 1)) p.vp++;
      if (id === "cornerMarket" && p.spice >= 10) p.vp++;
    }
    if (hasTech(p, "engine") && ownedCount(p, "spiceFlow") >= 2) p.vp++;
    if (hasTech(p, "memocorders") && F.every((f) => p.influence[f] >= 3))
      p.vp++;
    if (hasTech(p, "satellites"))
      p.vp += F.filter((f) => p.influence[f] <= 1).length;
  }
  const sorted = [...s.players].sort(
    (a, b) =>
      b.vp - a.vp ||
      Number(hasTech(b, "chaumurky")) - Number(hasTech(a, "chaumurky")) ||
      b.spice - a.spice ||
      b.solari - a.solari ||
      b.water - a.water ||
      b.garrison - a.garrison,
  );
  const a = sorted[0];
  s.winners = sorted
    .filter(
      (p) =>
        p.vp === a.vp &&
        hasTech(p, "chaumurky") === hasTech(a, "chaumurky") &&
        p.spice === a.spice &&
        p.solari === a.solari &&
        p.water === a.water &&
        p.garrison === a.garrison,
    )
    .map((p) => p.id);
  log(
    s,
    `게임 종료 · ${s.winners.map((i) => s.players[i].name).join(", ")} 승리`,
  );
}
function ring(s, p) {
  const r = {
    paul: { draw: 1 },
    rabban: { troops: Object.values(s.alliances).includes(p.id) ? 2 : 1 },
    ilban: { solari: 1 },
    memnon: { spice: 1 },
    ariana: { water: 1 },
    baron: { optional: { cost: { solari: 1 }, gain: { intrigue: 1 } } },
    ilesa: {
      optional: { cost: { solari: 1 }, gain: { acquire: "foldspace" } },
    },
    yuna: {
      optional: {
        cost: { solari: 7 },
        gain: { influence: 1, troops: 1, spice: 1 },
      },
    },
    hundro: { optional: { cost: { spice: 1 }, gain: { shipment: 1 } } },
  };
  if (r[p.leader]) {
    effects(s, p.id, r[p.leader]);
    return;
  }
  if (p.leader === "leto") {
    const factions = F.filter((f) =>
      s.players.some((q) => q.id !== p.id && q.influence[f] > p.influence[f]),
    );
    if (p.spice && factions.length)
      decision(s, p.id, "신중한 외교 · 스파이스 1 지불", [
        ...factions.map((f) =>
          option(FACTIONS[f].name, {
            pay: { spice: 1 },
            influence: { faction: f, amount: 1 },
          }),
        ),
        option("사용하지 않기", {}),
      ]);
  }
  if (p.leader === "helena")
    decision(
      s,
      p.id,
      "이번 공개 턴을 위해 보관할 제국 카드",
      s.row.map((id, index) => option(CARDS[id].name, { reserveRow: index })),
    );
  if (p.leader === "armand")
    decision(s, p.id, "비용 3 이하 제국 카드 무료 획득", [
      ...s.row.flatMap((id, index) =>
        CARDS[id].cost <= 3 ? [option(CARDS[id].name, { freeRow: index })] : [],
      ),
      option("획득하지 않기", {}),
    ]);
  if (p.leader === "rhombur")
    decision(s, p.id, "기술적 재능", [
      option("협상가 1개 배치", { negotiators: 1 }),
      option("기술 구매", { tech: 0 }),
    ]);
  if (
    p.leader === "tessia" &&
    F.some((f) => p.influence[f] > 0) &&
    p.snooped.length < 4
  )
    factionDecision(s, p, -1, F, { tessiaGain: true });
}

function resolveEffect(s, item) {
  const p = s.players[item.player],
    v = item.value,
    k = item.key,
    source = item.source;
  if (["spice", "water", "solari", "persuasion", "swords", "vp"].includes(k)) {
    const bonus =
      k === "solari" &&
      v > 0 &&
      p.leader === "yuna" &&
      s.current === p.id &&
      ["agent", "reveal"].includes(s.phase) &&
      source !== "round"
        ? 1
        : 0;
    p[k] += v + bonus;
    return;
  }
  if (k === "pay") {
    pay(p, v);
    return;
  }
  if (k === "draw") {
    draw(s, p, v);
    return;
  }
  if (k === "intrigue") {
    drawIntrigue(s, p, v);
    return;
  }
  if (k === "troops") {
    recruit(s, p, v);
    return;
  }
  if (k === "combatRecruit") {
    const n = Math.min(v, troopSupply(p));
    p.troops += n;
    return;
  }
  if (k === "specimen" || k === "negotiators") {
    p[k === "specimen" ? "specimens" : "negotiators"] += Math.min(
      v,
      troopSupply(p),
    );
    return;
  }
  if (k === "dreads") {
    const occupied = Object.values(s.dreadControl).filter(
      (x) => x.player === p.id,
    ).length;
    const n = Math.min(v, 2 - occupied - p.dreadGarrison - p.dreadCombat);
    p.dreadGarrison += n;
    if (s.turnCtx?.player === p.id) s.turnCtx.dreadRecruited += n;
    return;
  }
  if (k === "influence") {
    if (typeof v === "object") influence(s, p, v.faction, v.amount);
    else factionDecision(s, p, v);
    return;
  }
  if (k === "influenceAllowed") {
    factionDecision(s, p, 1, v);
    return;
  }
  if (k === "distinctInfluence") {
    const choices = F.filter((f) => p.influence[f] < 6);
    const pairs = choices.flatMap((f, i) =>
      choices.slice(i + 1).map((g) => [f, g]),
    );
    decision(
      s,
      p.id,
      "서로 다른 두 세력 영향력 +1",
      pairs.map((pair) =>
        option(pair.map((f) => FACTIONS[f].name).join(" + "), {
          influencePair: pair,
        }),
      ),
    );
    return;
  }
  if (k === "influencePair") {
    for (const f of v) influence(s, p, f, 1);
    return;
  }
  if (k === "council") {
    p.council = true;
    if (p.leader === "memnon") effects(s, p.id, { influence: 1 });
    return;
  }
  if (k === "swordmaster") {
    p.maxAgents = 3;
    p.agents++;
    return;
  }
  if (k === "agents") {
    p.agents += v;
    return;
  }
  if (k === "nextMentat") {
    p.nextMentat = true;
    return;
  }
  if (k === "ring") {
    ring(s, p);
    return;
  }
  if (k === "acquire") {
    gainCard(s, p, v);
    return;
  }
  if (k === "topAcquired") {
    const index = p.discard.lastIndexOf(v);
    if (index >= 0) {
      p.discard.splice(index, 1);
      p.deck.unshift(v);
    }
    return;
  }
  if (k === "trashSelf") {
    const zone = p.played.includes(source)
      ? "played"
      : p.revealed.includes(source)
        ? "revealed"
        : null;
    if (zone)
      trashCard(s, p, { zone, index: p[zone].indexOf(source), id: source });
    return;
  }
  if (k === "trash") {
    trashDecision(s, p);
    return;
  }
  if (k === "trashRef") {
    trashCard(s, p, v);
    return;
  }
  if (k === "discardRef") {
    discardCard(s, p, v);
    return;
  }
  if (k === "breed") {
    trashDecision(s, p, undefined, { draw: 2 });
    return;
  }
  if (k === "trashInPlay") {
    trashDecision(s, p, ["played", "revealed"]);
    return;
  }
  if (k === "extraInfluence") {
    if (s.turnCtx && F.includes(spaceById[s.turnCtx.space].icon))
      influence(s, p, spaceById[s.turnCtx.space].icon, v);
    return;
  }
  if (k === "doubleHarvest") return;
  if (k === "harvest") {
    const ctx = s.turnCtx;
    let amount = v + (s.bonus[ctx.space] || 0);
    if (ctx.cards.includes("carryall")) amount += v;
    if (p.leader === "ariana") {
      amount--;
      draw(s, p, 1);
    }
    p.spice += amount;
    s.bonus[ctx.space] = 0;
    return;
  }
  if (k === "optional" || k === "optional2") {
    if (!canPay(p, v.cost)) return;
    const inPlay = p.played.includes(source) || p.revealed.includes(source);
    if (v.selfTrash && !inPlay) return;
    const accept = {
      pay: v.cost || {},
      ...(v.selfTrash ? { trashSelf: true } : {}),
      ...v.gain,
    };
    decision(
      s,
      p.id,
      v.selfTrash
        ? `${CARDS[source].name}을 폐기할까요?`
        : `${describe(v.cost)} → ${describe(v.gain)}`,
      [option("사용하기", accept), option("사용하지 않기", {})],
      { source },
    );
    return;
  }
  if (k === "choice") {
    decision(s, p.id, "효과를 선택하세요", v, { source });
    return;
  }
  if (k === "bond" || k === "beneBond") {
    const faction = k === "bond" ? "fremen" : "bene";
    const inPlay = [...p.played, ...p.revealed];
    const total = inPlay.filter((id) =>
      (CARDS[id].factions || [CARDS[id].faction]).includes(faction),
    ).length;
    const self = (CARDS[source]?.factions || [CARDS[source]?.faction]).includes(
      faction,
    )
      ? 1
      : 0;
    if (total - self > 0) effects(s, p.id, v, source);
    return;
  }
  if (k === "ifInfluence") {
    if (p.influence[v.faction] >= v.min) effects(s, p.id, v.effects, source);
    return;
  }
  if (k === "ifOccupied") {
    if ((s.occupied[s.turnCtx?.space] || []).some((id) => id !== p.id))
      effects(s, p.id, v, source);
    return;
  }
  if (k === "grafted") {
    if (s.turnCtx?.cards.length === 2) effects(s, p.id, v, source);
    return;
  }
  if (k === "perOtherIcons") {
    const other = s.turnCtx?.cards.find((id) => id !== source);
    if (other) effects(s, p.id, { solari: CARDS[other].icons.length });
    return;
  }
  if (k === "trashGrafted") {
    const other = s.turnCtx?.cards.find((id) => id !== source);
    const index = p.played.indexOf(other);
    if (index >= 0)
      decision(s, p.id, `${CARDS[other].name} 폐기 → ${describe(v)}`, [
        option("폐기하여 효과 사용", {
          trashRef: { zone: "played", id: other, index },
          ...v,
        }),
        option("사용하지 않기", {}),
      ]);
    return;
  }
  if (k === "masterAcquire") {
    decision(s, p.id, "틀레이락스의 대가 · 비용 6 이하 무료 획득", [
      ...s.row.flatMap((id, index) =>
        CARDS[id].cost <= 6
          ? [
              option(CARDS[id].name, {
                freeRow: index,
                ...(p.research[0] >= 8 ? { handAcquired: id } : {}),
              }),
            ]
          : [],
      ),
      option("획득하지 않기", {}),
    ]);
    return;
  }
  if (k === "handAcquired") {
    const i = p.discard.lastIndexOf(v);
    if (i >= 0) {
      p.discard.splice(i, 1);
      p.hand.push(v);
    }
    return;
  }
  if (k === "helix" || k === "helix2") {
    if (p.research[0] >= (k === "helix" ? 4 : 8)) effects(s, p.id, v, source);
    return;
  }
  if (k === "perFremen") {
    p.persuasion +=
      v *
      [...p.played, ...p.revealed].filter((id) =>
        (CARDS[id].factions || [CARDS[id].faction]).includes("fremen"),
      ).length;
    return;
  }
  if (k === "memory") {
    const refs = cardOptions(p, ["discard"]).filter(
      (ref) => CARDS[ref.id].faction === "bene",
    );
    decision(s, p.id, "타인의 기억", [
      option("카드 1장 뽑기", { draw: 1 }),
      ...refs.map((ref) =>
        option(`${CARDS[ref.id].name} 회수`, { retrieve: ref }),
      ),
    ]);
    return;
  }
  if (k === "retrieve") {
    p[v.zone].splice(v.index, 1);
    p.hand.push(v.id);
    return;
  }
  if (k === "stealIntrigue") {
    for (const q of s.players)
      if (q.id !== p.id && q.intrigues.length >= 4)
        p.intrigues.push(
          q.intrigues.splice(Math.floor(random(s) * q.intrigues.length), 1)[0],
        );
    return;
  }
  if (k === "humanity") {
    const list = s.players
      .filter((q) => q.id !== p.id)
      .map((q) => ({
        kind: "effect",
        player: q.id,
        key: "opponentLoss",
        value: true,
      }));
    prepend(s, list);
    return;
  }
  if (k === "opponentLoss") {
    const opts = p.hand.map((id, index) =>
      option(`${CARDS[id].name} 버리기`, {
        discardRef: { zone: "hand", id, index },
      }),
    );
    if (p.troops) opts.push(option("전장 병력 1개 잃기", { loseTroop: true }));
    decision(s, p.id, "인간성 시험 · 카드 또는 전장 병력 손실", opts);
    return;
  }
  if (k === "loseTroop") {
    p.troops = Math.max(0, p.troops - 1);
    return;
  }
  if (k === "reserveRow") {
    const id = s.row[v];
    p.reserved.push(id);
    s.row[v] = s.imperium.shift() || null;
    s.row = s.row.filter(Boolean);
    return;
  }
  if (k === "freeRow") {
    const id = s.row[v];
    if (id) {
      s.row[v] = s.imperium.shift() || null;
      s.row = s.row.filter(Boolean);
      gainCard(s, p, id);
    }
    return;
  }
  if (k === "baronSetup") {
    const pairs = F.flatMap((f, i) => F.slice(i + 1).map((g) => [f, g]));
    decision(
      s,
      p.id,
      "대계 · 비밀 세력 두 곳을 선택하세요",
      pairs.map((pair) =>
        option(pair.map((f) => FACTIONS[f].name).join(" + "), {
          baronFactions: pair,
        }),
      ),
    );
    return;
  }
  if (k === "baronFactions") {
    p.baronFactions = v;
    return;
  }
  if (k === "hundroSetup") {
    const cards = s.intrigueDeck.splice(0, 2);
    decision(
      s,
      p.id,
      "정보 · 음모 카드 1장을 선택하세요",
      cards.map((id, index) =>
        option(`${intrigueById[id].name} · ${intrigueById[id].text}`, {
          hundroKeep: { id, other: cards[1 - index] },
        }),
      ),
    );
    return;
  }
  if (k === "hundroKeep") {
    p.intrigues.push(v.id);
    if (v.other) s.intrigueDeck.unshift(v.other);
    return;
  }
  if (k === "ilesaStore") {
    decision(
      s,
      p.id,
      "한발 앞서 · 두 번째 턴을 위해 보관할 카드",
      p.hand.map((id, index) =>
        option(CARDS[id].name, { storeCard: { id, index } }),
      ),
    );
    return;
  }
  if (k === "storeCard") {
    p.hand.splice(v.index, 1);
    p.setAside.push(v.id);
    return;
  }
  if (k === "tessiaGain") {
    factionDecision(
      s,
      p,
      1,
      F.filter((f) => !p.snooped.includes(f)),
    );
    return;
  }
  if (k === "discardReward" || k === "discardDraw") {
    const gain = k === "discardDraw" ? { draw: 1 } : v;
    decision(s, p.id, `손패 1장 버리기 → ${describe(gain)}`, [
      ...p.hand.map((id, index) =>
        option(CARDS[id].name, {
          discardRef: { zone: "hand", id, index },
          ...gain,
        }),
      ),
      option("사용하지 않기", {}),
    ]);
    return;
  }
  if (k === "discardCards") {
    if (p.hand.length < v.count) return;
    const options = [];
    for (let i = 0; i < p.hand.length; i++)
      for (let j = i + 1; j < p.hand.length; j++)
        options.push(
          option(`${CARDS[p.hand[i]].name} + ${CARDS[p.hand[j]].name}`, {
            discardPair: [j, i],
            ...v.gain,
          }),
        );
    decision(s, p.id, "손패 2장 버리기 → 드레드노트 건조", [
      ...options,
      option("사용하지 않기", {}),
    ]);
    return;
  }
  if (k === "discardPair") {
    for (const index of v)
      discardCard(s, p, { zone: "hand", id: p.hand[index], index });
    return;
  }
  if (k === "retreat") {
    if (p.troops)
      decision(
        s,
        p.id,
        "전장 병력을 주둔지로 후퇴시킬 수 있습니다.",
        Array.from({ length: Math.min(v, p.troops) + 1 }, (_, n) =>
          option(n ? `${n}개 후퇴` : "후퇴하지 않기", { retreatCount: n }),
        ),
      );
    return;
  }
  if (k === "retreatCount") {
    p.troops -= v;
    p.garrison += v;
    return;
  }
  if (k === "sell") {
    // The board cost already includes two spice; choose the remainder here.
    const opts = [0, 1, 2, 3]
      .filter((n) => p.spice >= n)
      .map((n) =>
        option(`스파이스 ${n + 2} → 솔라리 ${[6, 8, 10, 12][n]}`, {
          pay: { spice: n },
          solari: [6, 8, 10, 12][n],
        }),
      );
    decision(s, p.id, "멜란지 판매", opts);
    return;
  }
  if (k === "shipment") {
    if (!s.options.ix) return;
    const opts = [];
    if (p.shipping < 3)
      opts.push(
        option(`수송선 전진 (${p.shipping} → ${p.shipping + 1})`, {
          shippingAdvance: true,
        }),
      );
    if (p.shipping > 0)
      opts.push(
        option(`수송선 귀환 · ${p.shipping}단계 보상`, {
          shippingRecall: p.shipping,
        }),
      );
    decision(s, p.id, "수송선 이동", opts);
    if (v > 1) s.queue.splice(1, 0, ...effectItems(p.id, { shipment: v - 1 }));
    return;
  }
  if (k === "shippingAdvance") {
    p.shipping++;
    return;
  }
  if (k === "shippingRecall") {
    p.shipping = 0;
    const es = [
      { kind: "effect", player: p.id, key: "shippingResource", value: true },
    ];
    if (v >= 2)
      es.push(...effectItems(p.id, { shippingRecruit: true, influence: 1 }));
    if (v >= 3) es.push(...effectItems(p.id, { tech: 2 }));
    prepend(s, es);
    return;
  }
  if (k === "shippingResource") {
    decision(s, p.id, "수송 보상", [
      option("스파이스 2", { spice: 2 }),
      option("솔라리 5 · 상대 각각 1", { dividends: true }),
    ]);
    return;
  }
  if (k === "dividends") {
    effects(s, p.id, { solari: 5 });
    for (const q of s.players) if (q.id !== p.id) q.solari++;
    return;
  }
  if (k === "shippingRecruit") {
    const n = recruit(s, p, hasTech(p, "transports") ? 3 : 2);
    if (hasTech(p, "transports") && n)
      decision(
        s,
        p.id,
        "병력 수송선 · 모집 병력 전장 배치",
        Array.from({ length: n + 1 }, (_, i) =>
          option(`${i}개 배치`, { transportDeploy: i }),
        ),
      );
    return;
  }
  if (k === "transportDeploy") {
    p.garrison -= v;
    p.troops += v;
    if (s.turnCtx?.player === p.id)
      s.turnCtx.recruited = Math.max(0, s.turnCtx.recruited - v);
    return;
  }
  if (k === "negotiate") {
    decision(s, p.id, "기술 협상", [
      option("협상가 1개 배치", { negotiators: 1 }),
      option("스파이스 1 할인하여 기술 구매", { tech: 1 }),
    ]);
    return;
  }
  if (k === "tech") {
    if (!s.options.ix) return;
    const opts = [];
    s.techStacks.forEach((stack, index) => {
      if (!stack.length) return;
      const t = techById[stack[0]];
      const discount = Math.min(p.negotiators, Math.max(0, t.cost - v));
      const cost = Math.max(0, t.cost - v - discount);
      if (p.spice >= cost)
        opts.push(
          option(
            `${t.name} · 스파이스 ${cost}${discount ? ` + 협상가 ${discount}` : ""}`,
            { buyTech: { index, cost, negotiators: discount } },
          ),
        );
    });
    decision(s, p.id, "기술 구매 · 협상가는 필요한 만큼 사용", [
      ...opts,
      option("구매하지 않기", {}),
    ]);
    return;
  }
  if (k === "buyTech") {
    const id = s.techStacks[v.index].shift();
    pay(p, { spice: v.cost });
    p.negotiators -= v.negotiators;
    p.techs.push(id);
    log(s, `${techById[id].name} 기술 획득`, p.id);
    if (techById[id].acquire) effects(s, p.id, techById[id].acquire);
    return;
  }
  if (k === "research") {
    if (!s.options.immortality) return;
    if (p.research[0] >= 8) {
      draw(s, p, v);
      return;
    }
    const [x, y] = p.research;
    const paths = Object.entries(RESEARCH).filter(([id]) => {
      const [a, b] = id.split(",").map(Number);
      return a === x + 1 && (x === 0 ? b === 0 : Math.abs(b - y) === 1);
    });
    decision(
      s,
      p.id,
      "연구 경로 선택",
      paths.map(([id, reward]) =>
        option(
          `${id.split(",")[1] >= 0 ? "상단" : "하단"} 경로 · ${describe(reward)}`,
          { researchMove: id },
        ),
      ),
    );
    if (v > 1) s.queue.splice(1, 0, ...effectItems(p.id, { research: v - 1 }));
    return;
  }
  if (k === "researchMove") {
    p.research = v.split(",").map(Number);
    effects(s, p.id, RESEARCH[v]);
    return;
  }
  if (k === "beetle") {
    if (!s.options.immortality) return;
    for (let i = 0; i < v; i++) {
      if (p.tleilax >= 7) break;
      p.tleilax++;
      if ([2, 6].includes(p.tleilax)) drawIntrigue(s, p, 1);
      if ([4, 7].includes(p.tleilax)) p.vp++;
      if (p.tleilax === 4 && s.tleilaxBonus) {
        p.spice += s.tleilaxBonus;
        s.tleilaxBonus = 0;
      }
    }
    return;
  }
  if (k === "intrigueResearch") {
    if (p.intrigues.length)
      decision(s, p.id, "음모 1장을 폐기하여 카드와 음모를 뽑을 수 있습니다.", [
        ...p.intrigues.map((id, index) =>
          option(intrigueById[id].name, {
            removeIntrigue: index,
            draw: 1,
            intrigue: 1,
          }),
        ),
        option("사용하지 않기", {}),
      ]);
    return;
  }
  if (k === "removeIntrigue") {
    p.intrigues.splice(v, 1);
    return;
  }
  if (k === "control") {
    s.control[v] = p.id;
    return;
  }
  if (k === "dreadVictory") {
    const opts = ["arrakeen", "carthag", "basin"]
      .filter((id) => !s.dreadControl[id])
      .map((id) =>
        option(`${spaceById[id].name} 한 라운드 지배`, { dreadPlace: id }),
      );
    if (hasTech(p, "detonation"))
      opts.push(
        option("폭파 장치 · 드레드노트 파괴 → 승점 1", { dreadDetonate: true }),
      );
    decision(s, p.id, "승리한 드레드노트", opts);
    return;
  }
  if (k === "dreadPlace") {
    p.dreadCombat--;
    s.dreadControl[v] = { player: p.id, until: s.round + 1 };
    return;
  }
  if (k === "dreadDetonate") {
    p.dreadCombat--;
    p.vp++;
    return;
  }
  if (k === "satelliteScore") {
    pay(p, { spice: 3 });
    p.vp++;
    return;
  }
  if (k === "replaceIntrigues") {
    decision(s, p.id, "감청기로 교체할 음모를 고른 후 완료하세요.", [
      ...p.intrigues.map((id, index) =>
        option(intrigueById[id].name, {
          cycleIntrigue: index,
          replaceIntrigues: true,
        }),
      ),
      option(`${p.recycling || 0}장 교체 완료`, {
        finishIntrigueReplace: true,
      }),
    ]);
    return;
  }
  if (k === "cycleIntrigue") {
    s.intrigueDeck.push(p.intrigues.splice(v, 1)[0]);
    p.recycling = (p.recycling || 0) + 1;
    return;
  }
  if (k === "finishIntrigueReplace") {
    drawIntrigue(s, p, p.recycling || 0);
    p.recycling = 0;
    return;
  }
  if (k === "invasion") {
    if (p.hand.length)
      decision(s, p.id, "침공선 · 카드 1장 버려 이번 파견의 상대 점유 무시", [
        ...p.hand.map((id, index) =>
          option(CARDS[id].name, {
            discardRef: { id, index, zone: "hand" },
            invasionReady: true,
          }),
        ),
        option("사용하지 않기", {}),
      ]);
    return;
  }
  if (k === "invasionReady") {
    p.invasionReady = true;
    return;
  }
  throw new Error(`구현되지 않은 효과: ${k}`);
}

function settle(s) {
  let iterations = 0;
  while (s.queue.length && s.queue[0].kind !== "decision") {
    assert(iterations++ < 1000, "효과 처리 한도를 넘었습니다.");
    const item = s.queue.shift();
    if (item.kind === "effect") {
      resolveEffect(s, item);
      continue;
    }
    if (item.task === "newRound") newRound(s);
    else if (item.task === "endTurn") nextTurn(s);
    else if (item.task === "combatCleanup") cleanupCombat(s);
    else if (item.task === "endGame") endGame(s);
    else if (item.task === "finishAgent") {
      const p = s.players[item.player],
        ctx = s.turnCtx,
        space = spaceById[ctx.space];
      if (space.combat && p.garrison + p.dreadGarrison > 0) {
        const limit = 2 + ctx.recruited + ctx.dreadRecruited;
        s.queue.unshift({
          kind: "decision",
          player: p.id,
          title: "전장 배치",
          deploy: true,
          limit,
          options: [],
        });
      } else prepend(s, [{ kind: "system", task: "endTurn" }]);
    } else if (item.task === "finishReveal") {
      const p = s.players[item.player];
      if (hasTech(p, "artillery"))
        p.swords += p.revealed.filter(
          (id) =>
            (CARDS[id].reveal.swords || 0) > 0 ||
            (CARDS[id].reveal.bond?.swords &&
              [...p.played, ...p.revealed].filter(
                (c) => CARDS[c].faction === "fremen",
              ).length > 1),
        ).length;
      if (hasTech(p, "disposal") && p.persuasion >= 6)
        effects(s, p.id, { trashInPlay: true });
    }
  }
}

export function act(state, action) {
  const s = clone(state);
  const d = pending(s);
  const p = s.players[d ? d.player : s.current];
  assert(s.phase !== "ended", "종료된 게임입니다.");
  if (d) {
    if (d.deploy) {
      assert(action.type === "deploy", "전장 배치를 먼저 결정하세요.");
      const troops = action.troops ?? 0,
        dreads = action.dreads ?? 0;
      assert(
        Number.isInteger(troops) &&
          Number.isInteger(dreads) &&
          troops >= 0 &&
          dreads >= 0,
        "잘못된 병력 수입니다.",
      );
      assert(
        troops <= p.garrison && dreads <= p.dreadGarrison,
        "보유 병력을 넘었습니다.",
      );
      const ctx = s.turnCtx;
      const extra =
        Math.max(0, troops - ctx.recruited) +
        Math.max(0, dreads - ctx.dreadRecruited);
      assert(extra <= 2, "기존 주둔지에서는 최대 2개 유닛을 보낼 수 있습니다.");
      p.garrison -= troops;
      p.troops += troops;
      p.dreadGarrison -= dreads;
      p.dreadCombat += dreads;
      s.queue.shift();
      log(
        s,
        `전장에 병력 ${troops}${dreads ? ` · 드레드노트 ${dreads}` : ""} 배치`,
        p.id,
      );
      s.queue.unshift({ kind: "system", task: "endTurn" });
      if (p.leader === "baron" && !p.masterstroke && troops >= 4) {
        p.masterstroke = true;
        effects(s, p.id, { influencePair: p.baronFactions });
        log(s, "대계 발동 · 비밀 세력 공개", p.id);
      }
    } else {
      assert(action.type === "choose", "효과를 먼저 선택하세요.");
      assert(
        Number.isInteger(action.index) &&
          action.index >= 0 &&
          action.index < d.options.length,
        "선택할 수 없는 항목입니다.",
      );
      s.queue.shift();
      effects(s, p.id, d.options[action.index].effects, d.source);
    }
  } else if (action.type === "agent") {
    assert(s.phase === "agent", "지금은 요원 파견 단계가 아닙니다.");
    const indexes = [...(action.cards || [])];
    assert(
      indexes.length >= 1 &&
        indexes.length <= 2 &&
        new Set(indexes).size === indexes.length &&
        indexes.every(
          (i) => Number.isInteger(i) && i >= 0 && i < p.hand.length,
        ),
      "손패를 선택하세요.",
    );
    const ids = indexes.map((i) => p.hand[i]),
      space = spaceById[action.space];
    assert(space, "알 수 없는 장소입니다.");
    assert(
      !legalReason(s, p, space, indexes),
      legalReason(s, p, space, indexes),
    );
    const cost = spaceCost(p, space, ids);
    pay(p, cost);
    indexes.sort((a, b) => b - a).forEach((i) => p.hand.splice(i, 1));
    p.played.push(...ids);
    p.agents--;
    p.invasionReady = false;
    (s.occupied[space.id] ??= []).push(p.id);
    s.turnCtx = {
      player: p.id,
      space: space.id,
      cards: ids,
      recruited: 0,
      dreadRecruited: 0,
    };
    log(
      s,
      `${ids.map((id) => CARDS[id].name).join(" + ")} → ${space.name}`,
      p.id,
    );
    const items = [];
    if (p.leader === "ilban" && (cost.solari || 0) > 0)
      items.push(...effectItems(p.id, { draw: 1 }));
    if (
      p.leader === "ilesa" &&
      p.turns === 2 &&
      p.ileBonus &&
      ids.includes(p.ileBonus)
    )
      items.push(
        ...effectItems(
          p.id,
          CARDS[p.ileBonus].icons.length === 1 ? { spice: 1 } : { solari: 1 },
        ),
      );
    const boardEffect =
      space.id === "research" && s.options.immortality
        ? { draw: 2, research: 1 }
        : space.effect;
    items.push(...effectItems(p.id, boardEffect));
    for (const id of ids) items.push(...effectItems(p.id, CARDS[id].agent, id));
    const owner = controller(s, space.id);
    if (owner !== null && space.control)
      items.push(...effectItems(owner, { [space.control]: 1 }));
    items.push({ kind: "system", task: "finishAgent", player: p.id });
    s.queue.push(...items);
  } else if (action.type === "reveal") {
    assert(s.phase === "agent" && !p.revealedTurn, "이미 공개했습니다.");
    s.phase = "reveal";
    p.revealed.push(...p.hand);
    p.hand = [];
    if (p.council) p.persuasion += 2;
    for (const id of p.techs) {
      const t = techById[id];
      if (t.reveal) s.queue.push(...effectItems(p.id, t.reveal));
      if (t.revealCouncil && p.council)
        s.queue.push(...effectItems(p.id, t.revealCouncil));
    }
    for (const id of p.revealed)
      s.queue.push(...effectItems(p.id, CARDS[id].reveal, id));
    if (
      p.leader === "armand" &&
      Object.entries(s.occupied).filter(
        ([id, list]) =>
          list.includes(p.id) &&
          ["city", "landsraad", "spiceTrade"].includes(spaceById[id].icon),
      ).length >= 2
    )
      s.queue.push(...effectItems(p.id, { trashInPlay: true }));
    s.queue.push({ kind: "system", task: "finishReveal", player: p.id });
    log(s, "손패 공개", p.id);
  } else if (action.type === "buy") {
    assert(s.phase === "reveal", "카드는 공개 턴에 구매할 수 있습니다.");
    const zone = action.zone || "row";
    let id, cost;
    if (zone === "row") {
      id = s.row[action.index];
      cost = CARDS[id]?.cost;
    }
    if (zone === "reserve") {
      id = action.id;
      assert(
        ["liaison", "spiceFlow"].includes(id),
        "구매할 수 없는 예비 카드입니다.",
      );
      cost = CARDS[id].cost;
    }
    if (zone === "reserved") {
      id = p.reserved[action.index];
      cost = Math.max(0, (CARDS[id]?.cost || 0) - 1);
    }
    if (zone === "tleilax") {
      assert(s.options.immortality, "불멸 확장이 필요합니다.");
      id = s.tleilaxRow[action.index];
      cost = CARDS[id]?.cost;
    }
    assert(
      id && CARDS[id] && Number.isFinite(cost),
      "구매할 수 없는 카드입니다.",
    );
    if (zone === "tleilax") pay(p, { specimens: cost });
    else pay(p, { persuasion: cost });
    if (zone === "row") {
      s.row.splice(action.index, 1);
      if (s.imperium.length) s.row.splice(action.index, 0, s.imperium.shift());
    }
    if (zone === "reserved") p.reserved.splice(action.index, 1);
    if (zone === "tleilax") {
      s.tleilaxRow.splice(action.index, 1);
      if (s.tleilaxDeck.length)
        s.tleilaxRow.splice(action.index, 0, s.tleilaxDeck.shift());
    }
    gainCard(s, p, id, { tleilaxu: zone === "tleilax" });
  } else if (action.type === "reclaimed") {
    assert(
      s.phase === "reveal" && s.options.immortality,
      "불멸 공개 턴에 사용하세요.",
    );
    pay(p, { specimens: 3 });
    effects(
      s,
      p.id,
      action.reward === "troops" ? { troops: 2 } : { beetle: 1 },
    );
  } else if (action.type === "endReveal") {
    assert(s.phase === "reveal", "공개 턴이 아닙니다.");
    p.discard.push(...p.played, ...p.revealed, ...p.hand, ...p.setAside);
    p.played = [];
    p.revealed = [];
    p.hand = [];
    p.setAside = [];
    p.reserved.forEach((id) => s.imperium.push(id));
    p.reserved = [];
    p.revealedTurn = true;
    p.persuasion = 0;
    nextTurn(s);
  } else if (action.type === "intrigue") {
    const id = p.intrigues[action.index],
      card = intrigueById[id];
    assert(card, "음모 카드가 없습니다.");
    assert(
      card.timing === "combat"
        ? s.phase === "combat" && strength(p) > 0
        : card.timing === "plot" && ["agent", "reveal"].includes(s.phase),
      "지금 사용할 수 없는 음모 카드입니다.",
    );
    pay(p, card.cost);
    p.intrigues.splice(action.index, 1);
    s.intrigueDiscard.push(id);
    effects(s, p.id, card.effect);
    if (s.phase === "combat") s.passCount = 0;
    log(s, `${card.name} 음모 사용`, p.id);
  } else if (action.type === "passCombat") {
    assert(s.phase === "combat", "전투 단계가 아닙니다.");
    s.passCount++;
    if (s.passCount >= s.players.filter((q) => strength(q) > 0).length)
      resolveCombat(s);
    else {
      s.current = (s.current + 1) % s.players.length;
      seekCombatant(s);
    }
  } else if (action.type === "nextRound") {
    assert(s.phase === "roundEnd", "라운드가 끝나지 않았습니다.");
    s.first = (s.first + 1) % s.players.length;
    newRound(s);
  } else if (action.type === "atomics") {
    assert(
      ["agent", "reveal"].includes(s.phase) && p.atomics,
      "가문 원자탄을 사용할 수 없습니다.",
    );
    p.atomics = false;
    log(s, "가문 원자탄 · 제국 열 교체", p.id);
    s.row = s.imperium.splice(0, 5);
  } else if (action.type === "tech") {
    assert(
      ["agent", "reveal"].includes(s.phase),
      "자신의 턴에만 기술을 사용하세요.",
    );
    const t = techById[action.id];
    assert(t && hasTech(p, t.id), "이 기술이 없습니다.");
    assert(t.activate || t.consume, "직접 사용하지 않는 기술입니다.");
    if (t.activate) {
      assert(!p.usedTechs.includes(t.id), "이번 라운드에 사용한 기술입니다.");
      if (["holoprojectors", "invasion"].includes(t.id))
        assert(p.hand.length > 0, "버릴 손패가 없습니다.");
      if (t.id === "invasion")
        assert(s.phase === "agent", "요원 턴에만 침공선을 사용하세요.");
      if (t.costUse) pay(p, t.costUse);
      p.usedTechs.push(t.id);
      effects(s, p.id, t.activate);
    } else {
      if (t.id === "satellites")
        assert(p.spice >= 3, "스파이스 3이 필요합니다.");
      p.techs.splice(p.techs.indexOf(t.id), 1);
      effects(s, p.id, t.consume);
    }
  } else throw new Error("알 수 없는 행동입니다.");
  s.actionCount++;
  settle(s);
  assertState(s);
  return s;
}

export function assertState(s) {
  assert(
    s &&
      s.version === VERSION &&
      Array.isArray(s.players) &&
      s.players.length >= 2 &&
      s.players.length <= 4,
    "저장 데이터 형식이 올바르지 않습니다.",
  );
  assert(
    ["agent", "reveal", "combat", "roundEnd", "ended"].includes(s.phase),
    "잘못된 단계입니다.",
  );
  assert(
    Number.isInteger(s.current) &&
      s.current >= 0 &&
      s.current < s.players.length,
    "잘못된 차례입니다.",
  );
  assert(
    Number.isInteger(s.rng) &&
      s.rng >= 0 &&
      Number.isInteger(s.round) &&
      s.round >= 0 &&
      s.round <= 10,
    "잘못된 라운드입니다.",
  );
  for (const p of s.players) {
    assert(leaderById[p.leader], "알 수 없는 지도자입니다.");
    assert(
      Number.isInteger(p.id) &&
        p.id >= 0 &&
        p.id < s.players.length &&
        s.players[p.id] === p,
      "플레이어 순서가 올바르지 않습니다.",
    );
    assert(
      typeof p.name === "string" &&
        p.name.length <= 50 &&
        typeof p.ai === "boolean",
      "플레이어 정보가 올바르지 않습니다.",
    );
    assert(
      /^#[0-9a-f]{6}$/i.test(p.color),
      "플레이어 색상이 올바르지 않습니다.",
    );
    for (const key of [
      "spice",
      "water",
      "solari",
      "vp",
      "garrison",
      "troops",
      "dreadGarrison",
      "dreadCombat",
      "specimens",
      "negotiators",
      "agents",
      "persuasion",
      "swords",
    ])
      assert(
        Number.isInteger(p[key]) && p[key] >= 0,
        `${key} 값이 올바르지 않습니다.`,
      );
    assert(
      p.garrison + p.troops + p.specimens + p.negotiators <= 16,
      "병력 총수가 16개를 넘었습니다.",
    );
    for (const key of [
      "deck",
      "hand",
      "played",
      "discard",
      "revealed",
      "setAside",
      "reserved",
    ])
      assert(
        Array.isArray(p[key]) && p[key].every((id) => CARDS[id]),
        "알 수 없는 카드가 있습니다.",
      );
    assert(
      p.intrigues.every((id) => intrigueById[id]) &&
        p.techs.every((id) => techById[id]),
      "알 수 없는 기술 또는 음모입니다.",
    );
    for (const f of F)
      assert(
        Number.isInteger(p.influence[f]) &&
          p.influence[f] >= 0 &&
          p.influence[f] <= 6,
        "영향력이 범위를 넘었습니다.",
      );
  }
  return true;
}
export function restore(text) {
  const s = JSON.parse(text);
  assertState(s);
  assert(
    s.options &&
      ["easy", "normal", "hard"].includes(s.options.difficulty) &&
      ["solo", "hotseat"].includes(s.options.mode) &&
      [10, 11].includes(s.options.target),
    "게임 설정이 올바르지 않습니다.",
  );
  assert(
    Array.isArray(s.queue) && s.queue.length < 1000,
    "효과 목록이 올바르지 않습니다.",
  );
  for (const field of ["row", "imperium", "tleilaxRow", "tleilaxDeck"])
    assert(
      Array.isArray(s[field]) && s[field].every((id) => CARDS[id]),
      "카드 덱이 올바르지 않습니다.",
    );
  assert(
    s.conflicts?.length === 10 && s.conflicts.every((id) => conflictById[id]),
    "전투 덱이 올바르지 않습니다.",
  );
  assert(
    s.queue.every(
      (i) =>
        i &&
        ["decision", "system", "effect"].includes(i.kind) &&
        (!(i.kind === "decision") ||
          (s.players[i.player] &&
            typeof i.title === "string" &&
            Array.isArray(i.options) &&
            i.options.every(
              (o) =>
                typeof o.label === "string" &&
                o.effects &&
                typeof o.effects === "object",
            ))),
    ),
    "저장된 효과가 올바르지 않습니다.",
  );
  assert(
    Array.isArray(s.log) &&
      s.log.every(
        (i) =>
          typeof i.text === "string" &&
          (i.player === null || s.players[i.player]),
      ),
    "게임 기록이 올바르지 않습니다.",
  );
  assert(
    Array.isArray(s.techStacks) &&
      s.techStacks.every(
        (stack) => Array.isArray(stack) && stack.every((id) => techById[id]),
      ),
    "기술 덱이 올바르지 않습니다.",
  );
  for (const f of F)
    assert(
      s.alliances && (s.alliances[f] === null || s.players[s.alliances[f]]),
      "동맹이 올바르지 않습니다.",
    );
  assert(
    s.occupied &&
      Object.entries(s.occupied).every(
        ([id, list]) =>
          spaceById[id] &&
          Array.isArray(list) &&
          list.every((i) => s.players[i]),
      ),
    "점유지가 올바르지 않습니다.",
  );
  assert(s.control && s.dreadControl && s.bonus, "보드 데이터가 없습니다.");
  return s;
}
