import {
  act,
  pending,
  legalReason,
  strength,
  clone,
  conflict,
  troopSupply,
} from "./engine.js";
import {
  CARDS,
  activeSpaces,
  FACTIONS,
  techById,
  intrigueById,
} from "./data.js";

const F = Object.keys(FACTIONS);
function influenceValue(p, f, n = 1) {
  let score = 0;
  for (let i = 1; i <= n; i++) {
    const level = p.influence[f] + i;
    score += level === 2 ? 10 : level === 4 ? 13 : level < 4 ? 3.8 : 1;
  }
  return score;
}
function effectValue(s, p, e) {
  let score = 0;
  for (const [k, v] of Object.entries(e || {})) {
    if (k === "vp") score += v * 18;
    else if (k === "influence")
      score +=
        typeof v === "object"
          ? influenceValue(p, v.faction, v.amount)
          : Math.max(...F.map((f) => influenceValue(p, f, v)));
    else if (k === "spice") score += v * (p.spice < 3 ? 2.5 : 1.2);
    else if (k === "water") score += v * (p.water < 2 ? 3.2 : 1);
    else if (k === "solari") score += v * (p.maxAgents < 3 ? 2 : 0.8);
    else if (k === "draw")
      score += v * (s.phase === "agent" && p.agents > 0 ? 3.1 : 1.2);
    else if (k === "troops") score += v * (p.garrison < 4 ? 2 : 0.7);
    else if (k === "intrigue") score += v * 2.7;
    else if (k === "persuasion") score += v * 1.9;
    else if (k === "research") score += v * (p.research[0] < 4 ? 4 : 2.7);
    else if (k === "specimen") score += v * 1.3;
    else if (k === "beetle")
      score += v * ([3, 6].includes(p.tleilax) ? 11 : 3.8);
    else if (k === "shipment") score += v * (p.shipping === 3 ? 8 : 4.3);
    else if (k === "swordmaster") score += s.round <= 5 ? 25 : 13;
    else if (k === "council") score += s.round <= 5 ? 18 : 7;
    else if (k === "agents") score += 6;
    else if (k === "tech") score += p.spice >= 2 ? 4 : 1;
    else if (k === "dreads") score += 5;
    else if (k === "negotiators") score += v * 1.7;
    else if (k === "harvest")
      score += (v + (s.bonus[s.turnCtx?.space] || 0)) * 2;
    else if (k === "pay")
      score -= Object.entries(v).reduce(
        (n, [r, a]) => n + a * (r === "solari" ? 1 : r === "spice" ? 1.4 : 2),
        0,
      );
    else if (k === "trashRef") {
      const c = CARDS[v.id];
      score += c.starter ? 4 : c.cost <= 2 ? 0 : -c.cost;
      if (v.id === "assassination") score += 7;
    } else if (k === "discardRef")
      score -= Math.max(
        1,
        (CARDS[v.id].reveal.persuasion || 0) * 1.3 + CARDS[v.id].cost * 0.2,
      );
    else if (k === "buyTech")
      score +=
        6 +
        effectValue(s, p, techById[s.techStacks[v.index][0]].acquire) -
        v.cost;
    else if (k === "freeRow") score += cardValue(s, p, CARDS[s.row[v]]);
    else if (k === "choice")
      score += Math.max(...v.map((o) => effectValue(s, p, o.effects)));
    else if (k === "optional")
      score += Math.max(
        0,
        effectValue(s, p, v.gain) -
          Object.entries(v.cost || {}).reduce((n, [, a]) => n + a, 0),
      );
    else if (k === "swords") score += s.phase === "combat" ? v * 1.8 : v * 0.7;
    else if (k === "ring") score += 3.5;
    else if (k === "influencePair")
      score += v.reduce((n, f) => n + influenceValue(p, f), 0);
    else if (k === "researchMove") score += 3 + (v.endsWith(",-1") ? 1 : 0);
    else if (k === "shippingAdvance") score += p.shipping === 2 ? 7 : 4;
    else if (k === "shippingRecall") score += v === 3 ? 20 : v === 2 ? 12 : 4;
    else if (k === "dividends") score += p.maxAgents === 2 ? 12 : 5;
    else if (k === "hundroKeep")
      score += intrigueById[v.id].timing === "combat" ? 5 : 3;
    else if (k === "storeCard")
      score +=
        CARDS[v.id].icons.length === 1 ? 5 : CARDS[v.id].icons.length ? 3 : -1;
    else if (k === "reserveRow")
      score +=
        cardValue(s, p, CARDS[s.row[v]]) -
        Math.max(0, CARDS[s.row[v]].cost - 5) * 2;
    else if (k === "topAcquired") score += CARDS[v].cost > 2 ? 3 : -1;
    else if (k === "retreatCount") score -= v * 2;
    else if (k === "retrieve") score += cardValue(s, p, CARDS[v.id]) + 2;
    else if (k === "transportDeploy") score += v * 2;
    else if (k === "dreadPlace") score += v === "arrakeen" ? 5 : 4;
    else if (k === "dreadDetonate") score += 10;
    else if (k === "loseTroop") score -= 2;
    else if (k === "discardDraw") score += 1;
  }
  return score;
}
function cardValue(s, p, c) {
  if (!c) return -100;
  return (
    (c.acquire?.vp ? 16 : 0) +
    c.cost * 0.65 +
    effectValue(s, p, c.reveal) * 0.6 +
    effectValue(s, p, c.agent) * 0.5 +
    c.icons.length * 0.25 +
    (c.graft && s.round < 8 ? 1 : 0) -
    (s.round > 7 && c.cost < 4 ? 3 : 0)
  );
}
function noise(s, scale) {
  return (
    ((((s.rng ^ Math.imul(s.actionCount + 7, 2654435761)) >>> 0) % 1000) /
      1000) *
    scale
  );
}
export function chooseAI(s) {
  const d = pending(s),
    p = s.players[d ? d.player : s.current],
    difficulty = s.options.difficulty;
  if (d) {
    if (d.deploy) {
      let troops = Math.min(p.garrison, 2 + (s.turnCtx?.recruited || 0));
      let dreads = Math.min(
        p.dreadGarrison,
        Math.max(0, 2 - Math.max(0, troops - (s.turnCtx?.recruited || 0))) +
          (s.turnCtx?.dreadRecruited || 0),
      );
      if (difficulty === "hard") {
        const other = Math.max(
          0,
          ...s.players.filter((q) => q.id !== p.id).map(strength),
        );
        const reward = conflict(s).rewards[0].vp || 0;
        if (!reward && other > p.troops * 2 + troops * 2 + 8 && s.round < 7) {
          troops = Math.min(troops, 1);
          dreads = 0;
        }
      }
      return { type: "deploy", troops, dreads };
    }
    const scored = d.options
      .map((o, index) => ({ index, score: effectValue(s, p, o.effects) }))
      .sort((a, b) => b.score - a.score);
    const pick =
      difficulty === "easy" && scored.length > 1
        ? Math.min(scored.length - 1, (s.rng >>> 6) % 3)
        : 0;
    return { type: "choose", index: scored[pick].index };
  }
  if (s.phase === "roundEnd") return { type: "nextRound" };
  if (s.phase === "combat") {
    const other = Math.max(
      0,
      ...s.players.filter((q) => q.id !== p.id).map(strength),
    );
    const cards = p.intrigues
      .map((id, index) => ({ c: intrigueById[id], index }))
      .filter(
        ({ c }) =>
          c.timing === "combat" &&
          Object.entries(c.cost || {}).every(([r, n]) => p[r] >= n),
      );
    const win = cards.find(
      ({ c }) =>
        strength(p) + (c.effect.swords || c.effect.combatRecruit * 2 || 0) >
        other,
    );
    if (win && strength(p) <= other)
      return { type: "intrigue", index: win.index };
    return { type: "passCombat" };
  }
  if (s.phase === "reveal") {
    const offers = s.row.map((id, index) => ({
      type: "buy",
      zone: "row",
      index,
      c: CARDS[id],
    }));
    offers.push(
      { type: "buy", zone: "reserve", id: "spiceFlow", c: CARDS.spiceFlow },
      { type: "buy", zone: "reserve", id: "liaison", c: CARDS.liaison },
    );
    offers.push(
      ...p.reserved.map((id, index) => ({
        type: "buy",
        zone: "reserved",
        index,
        c: CARDS[id],
      })),
    );
    const affordable = offers
      .filter(
        (o) =>
          p.persuasion >=
          Math.max(0, o.c.cost - (o.zone === "reserved" ? 1 : 0)),
      )
      .map((o) => ({ ...o, score: cardValue(s, p, o.c) }))
      .sort((a, b) => b.score - a.score);
    if (affordable.length && (affordable[0].score > 0 || s.round < 7)) {
      const { c, score, ...action } = affordable[0];
      return action;
    }
    const tleilax = s.tleilaxRow
      .map((id, index) => ({ id, index }))
      .filter(({ id }) => CARDS[id].cost <= p.specimens);
    if (tleilax.length)
      return {
        type: "buy",
        zone: "tleilax",
        index: tleilax.sort((a, b) => CARDS[b.id].cost - CARDS[a.id].cost)[0]
          .index,
      };
    if (s.options.immortality && p.specimens >= 3)
      return { type: "reclaimed", reward: p.tleilax < 7 ? "beetle" : "troops" };
    return { type: "endReveal" };
  }
  if (s.phase === "agent") {
    const plot = p.intrigues
      .map((id, index) => ({ id, index }))
      .find(
        ({ id }) =>
          intrigueById[id].timing === "plot" &&
          Object.entries(intrigueById[id].cost || {}).every(
            ([k, n]) => p[k] >= n,
          ),
      );
    if (plot) return { type: "intrigue", index: plot.index };
    const tech = p.techs.find(
      (id) =>
        techById[id].activate &&
        !p.usedTechs.includes(id) &&
        (!techById[id].costUse ||
          Object.entries(techById[id].costUse).every(([k, n]) => p[k] >= n)) &&
        (!["holoprojectors", "invasion"].includes(id) || p.hand.length > 1),
    );
    if (tech) return { type: "tech", id: tech };
    const combos = p.hand.map((_, i) => [i]);
    p.hand.forEach((id, i) => {
      if (CARDS[id].graft)
        p.hand.forEach((_, j) => {
          if (i !== j) combos.push([i, j]);
        });
    });
    const moves = [];
    for (const cards of combos)
      for (const space of activeSpaces(s.options)) {
        if (legalReason(s, p, space, cards)) continue;
        let score = effectValue(s, p, space.effect);
        if (space.maker) score += (s.bonus[space.id] || 0) * 2.4;
        if (space.cost?.solari) score -= space.cost.solari * 0.7;
        if (space.cost?.spice) score -= space.cost.spice * 1.1;
        if (space.cost?.water)
          score -= space.cost.water * (p.water <= space.cost.water ? 2.2 : 1);
        if (space.combat) {
          const own = strength(p),
            other = Math.max(
              0,
              ...s.players.filter((q) => q.id !== p.id).map(strength),
            );
          score += p.garrison ? 3 : 0;
          if (own + Math.min(p.garrison, 2) * 2 > other) score += 3;
        }
        for (const i of cards) {
          const c = CARDS[p.hand[i]];
          score += effectValue(s, p, c.agent) * 0.7;
          score -= effectValue(s, p, c.reveal) * 0.5;
        }
        score +=
          (((Math.imul(s.rng ^ (cards[0] + 1), space.id.charCodeAt(0) + 11) >>>
            0) %
            100) /
            100) *
          (difficulty === "easy" ? 10 : difficulty === "normal" ? 3 : 0.7);
        if (difficulty === "hard" && space.icon in FACTIONS) {
          const f = space.icon;
          const owner = s.alliances[f];
          if (
            owner !== null &&
            owner !== p.id &&
            p.influence[f] + 1 > s.players[owner].influence[f]
          )
            score += 12;
        }
        moves.push({ type: "agent", cards, space: space.id, score });
      }
    moves.sort((a, b) => b.score - a.score);
    if (!moves.length) return { type: "reveal" };
    if (difficulty === "hard" && p.agents === 1) {
      const persuasion =
        p.hand.reduce(
          (n, id) => n + (CARDS[id].reveal.persuasion || 0),
          p.council ? 2 : 0,
        ) + p.persuasion;
      if (persuasion >= 9 && moves[0].score < 14) return { type: "reveal" };
    }
    const { score, ...action } = moves[0];
    return action;
  }
  return null;
}
export function simulateGame(config, seed = 1, max = 2500) {
  let s = createSimulation(config, seed);
  let n = 0;
  while (s.phase !== "ended" && n++ < max) s = act(s, chooseAI(s));
  if (s.phase !== "ended")
    throw new Error(`게임이 ${max} 행동 안에 끝나지 않았습니다.`);
  return s;
}
// Lazy boundary keeps simulation setup out of browser action evaluation.
import { createGame as createSimulation } from "./engine.js";
