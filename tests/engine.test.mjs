import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  act,
  pending,
  legalReason,
  strength,
  combatRanks,
  restore,
  assertState,
  troopSupply,
} from "../src/engine.js";
import { CARDS, LEADERS, activeSpaces, spaceById, TECHS } from "../src/data.js";
import { chooseAI, simulateGame } from "../src/ai.js";

function fixture(config = {}) {
  let s = createGame(
    {
      ...config,
      leaders: [config.leader || "paul", "rabban", "ilban", "leto"],
    },
    772,
  );
  while (pending(s)) s = act(s, chooseAI(s));
  return s;
}
test("solo defaults: one human, two AI, shared normal resources and ten-card starter decks", () => {
  const s = fixture();
  assert.equal(s.players.length, 3);
  assert.equal(s.options.difficulty, "normal");
  assert.deepEqual(
    s.players.map((p) => p.ai),
    [false, true, true],
  );
  for (const p of s.players) {
    assert.equal(p.deck.length + p.hand.length, 10);
    assert.equal(p.water, 1);
    assert.equal(p.garrison, 3);
    assert.equal(p.agents, 2);
  }
  assert.equal(s.players[1].spice, 1);
  assert.equal(s.players[1].solari, 1);
  assert.equal(s.conflicts.length, 10);
});
test("four-player setup starts at one VP; hotseat and both expansions are independent", () => {
  assert.deepEqual(
    fixture({ aiCount: 3 }).players.map((p) => p.vp),
    [1, 1, 1, 1],
  );
  const hot = fixture({ mode: "hotseat", humans: 2 });
  assert.equal(hot.players.length, 2);
  assert(hot.players.every((p) => !p.ai));
  for (const ix of [false, true])
    for (const immortality of [false, true]) {
      const s = fixture({ ix, immortality });
      assert.equal(
        activeSpaces(s.options).some((x) => x.id === "shipping"),
        ix,
      );
      assert.equal(
        activeSpaces(s.options).some((x) => x.id === "contract"),
        !ix,
      );
      assert.equal(s.techStacks.length, ix ? 3 : 0);
      assert.equal(s.tleilaxRow.length, immortality ? 2 : 0);
      const cards = [...s.players[0].deck, ...s.players[0].hand];
      assert.equal(
        cards.filter((id) => id === "experimentation").length,
        immortality ? 2 : 0,
      );
      assert.equal(s.players[0].atomics, immortality);
    }
  assert.throws(() => createGame({ leader: "ilesa", ix: false }), /지도자/);
});
test("acts are immutable, require compatible icons, charge costs, and block occupied spaces", () => {
  const s = fixture(),
    p = s.players[0];
  p.hand = ["dagger"];
  const snapshot = JSON.stringify(s);
  assert.throws(
    () => act(s, { type: "agent", space: "wealth", cards: [0] }),
    /아이콘/,
  );
  assert.equal(JSON.stringify(s), snapshot);
  assert.match(legalReason(s, p, spaceById.hagga, [0]), /아이콘/);
  s.occupied.arrakeen = [1];
  assert.match(legalReason(s, p, spaceById.arrakeen, [0]), /상대/);
  p.leader = "helena";
  assert.equal(legalReason(s, p, spaceById.arrakeen, [0]), "");
  s.occupied.arrakeen = [0];
  assert.match(legalReason(s, p, spaceById.arrakeen, [0]), /자신/);
});
test("Leto discounts green space cost, Ilban draws only on board-space Solari payment", () => {
  let s = fixture(),
    p = s.players[0];
  p.leader = "leto";
  p.hand = ["dagger"];
  p.solari = 4;
  assert.equal(legalReason(s, p, spaceById.council, [0]), "");
  s = act(s, { type: "agent", space: "council", cards: [0] });
  assert.equal(s.players[0].solari, 0);
  assert(s.players[0].council);
  s = fixture();
  p = s.players[0];
  p.leader = "ilban";
  p.hand = ["dagger"];
  p.solari = 5;
  s = act(s, { type: "agent", space: "council", cards: [0] });
  assert.equal(s.players[0].hand.length, 1);
});
test("recruit + deployment limits conserve troops, and Baron fires once on four troops in one turn", () => {
  let s = fixture(),
    p = s.players[0];
  p.leader = "baron";
  p.baronFactions = ["emperor", "guild"];
  p.hand = ["diplomacy"];
  s = act(s, { type: "agent", space: "warriors", cards: [0] });
  assert(pending(s).deploy);
  assert.equal(s.players[0].garrison, 5);
  assert.throws(() => act(s, { type: "deploy", troops: 5 }), /최대 2/);
  s = act(s, { type: "deploy", troops: 4 });
  p = s.players[0];
  assert.equal(p.troops, 4);
  assert.equal(p.garrison, 1);
  assert(p.masterstroke);
  assert.equal(p.influence.emperor, 1);
  assert.equal(p.influence.guild, 1);
  assert.equal(p.influence.fremen, 1);
  assert.equal(p.garrison + p.troops + troopSupply(p), 16);
});
test("Graft requires exactly two cards; both boxes resolve and either card supplies icon", () => {
  let s = fixture({ immortality: true }),
    p = s.players[0];
  p.hand = ["reflexes", "diplomacy"];
  p.research = [4, 1];
  assert.match(legalReason(s, p, spaceById.wealth, [0]), /다른 카드/);
  assert.equal(legalReason(s, p, spaceById.wealth, [0, 1]), "");
  s = act(s, { type: "agent", cards: [0, 1], space: "wealth" });
  assert.equal(s.players[0].influence.emperor, 1);
  assert.equal(s.players[0].hand.length, 2);
  s = fixture();
  s.players[0].hand = ["dagger", "recon"];
  assert.match(
    legalReason(s, s.players[0], spaceById.arrakeen, [0, 1]),
    /접합/,
  );
});
test("research branches move one column right, grant specimens from supply, and unlock draw at end", () => {
  let s = fixture({ immortality: true });
  s.players[0].hand = ["experimentation"];
  s = act(s, { type: "agent", space: "basin", cards: [0] });
  assert.match(pending(s).title, /연구/);
  s = act(s, { type: "choose", index: 0 });
  assert.deepEqual(s.players[0].research, [1, 0]);
  assert.equal(s.players[0].specimens, 1);
  assert(pending(s).deploy);
  s = act(s, { type: "deploy", troops: 0 });
  assertState(s);
});
test("Ix shipping recall grants cumulative rewards, with no free dreadnought/tech purchases", () => {
  let s = fixture({ ix: true }),
    p = s.players[0];
  p.hand = ["dune"];
  p.shipping = 2;
  s = act(s, { type: "agent", space: "smuggling", cards: [0] });
  assert.match(pending(s).title, /수송선/);
  s = act(s, { type: "choose", index: 1 }); // recall from level2
  s = act(s, { type: "choose", index: 0 }); // spice2
  assert.match(pending(s).title, /영향력/);
  s = act(s, { type: "choose", index: 0 });
  p = s.players[0];
  assert.equal(p.shipping, 0);
  assert.equal(p.spice, 2);
  assert.equal(p.garrison, 5);
  assert.equal(p.influence.emperor, 1);
  assert.equal(p.solari, 1);
});
test("combat ties demote rewards, zero forces get no reward, and swords alone do not fight", () => {
  const players = [
    { id: 0, troops: 2, dreadCombat: 0, swords: 1 },
    { id: 1, troops: 2, dreadCombat: 0, swords: 1 },
    { id: 2, troops: 1, dreadCombat: 0, swords: 0 },
    { id: 3, troops: 0, dreadCombat: 0, swords: 9 },
  ];
  assert.deepEqual(
    combatRanks(players).map((r) => r.rank),
    [2, 2, 3, 99],
  );
  assert.equal(strength(players[3]), 0);
  assert.equal(
    strength({ ...players[3], dreadCombat: 1, leader: "rhombur" }),
    13,
  );
});
test("reveal buys cards into discard, Spice Must Flow gives acquisition VP, phase rules enforced", () => {
  let s = fixture();
  s.players[0].hand = Array(5).fill("argument");
  s = act(s, { type: "reveal" });
  assert.equal(s.phase, "reveal");
  assert.equal(s.players[0].persuasion, 10);
  assert.throws(
    () => act(s, { type: "agent", space: "wealth", cards: [0] }),
    /단계/,
  );
  s = act(s, { type: "buy", zone: "reserve", id: "spiceFlow" });
  assert.equal(s.players[0].vp, 1);
  assert(s.players[0].discard.includes("spiceFlow"));
  assert.equal(s.players[0].persuasion, 1);
  assert.throws(
    () => act(s, { type: "buy", zone: "reserve", id: "spiceFlow" }),
    /부족/,
  );
  s = act(s, { type: "endReveal" });
  assert(s.players[0].revealedTurn);
  assert.equal(s.players[0].persuasion, 0);
});
test("atomics replaces the market once, without changing other player resources", () => {
  let s = fixture({ immortality: true }),
    old = [...s.row],
    other = s.players[1].spice;
  s = act(s, { type: "atomics" });
  assert.notDeepEqual(s.row, old);
  assert.equal(s.players[0].atomics, false);
  assert.equal(s.players[1].spice, other);
  assert.throws(() => act(s, { type: "atomics" }), /사용/);
});
test("save restoration preserves pending choices and deterministic continuation", () => {
  let s = fixture({ ix: true, immortality: true });
  s.players[0].hand = ["experimentation"];
  s = act(s, { type: "agent", cards: [0], space: "basin" });
  const restored = restore(JSON.stringify(s));
  assert.deepEqual(restored, s);
  assert.deepEqual(
    act(restored, { type: "choose", index: 0 }),
    act(s, { type: "choose", index: 0 }),
  );
  assert.throws(() => restore('{"version":999}'), /형식/);
  const bad = structuredClone(s);
  bad.players[0].water = -1;
  assert.throws(() => restore(JSON.stringify(bad)), /올바르지/);
});
test("all fourteen original leaders and all eighteen techs have unique IDs", () => {
  assert.equal(LEADERS.length, 14);
  assert.equal(LEADERS.filter((l) => !l.expansion).length, 8);
  assert.equal(TECHS.length, 18);
  assert.equal(new Set(LEADERS.map((l) => l.id)).size, 14);
  assert.equal(new Set(TECHS.map((t) => t.id)).size, 18);
});
test("complete games: every leader, all difficulties, 2/3 AI and expansion combinations", () => {
  let games = 0;
  for (const l of LEADERS)
    for (const difficulty of ["easy", "normal", "hard"]) {
      const s = simulateGame(
        {
          leader: l.id,
          ix: !!l.expansion || games % 2 === 0,
          immortality: games % 3 !== 0,
          aiCount: games % 2 ? 2 : 3,
          difficulty,
        },
        1000 + games,
      );
      assert.equal(s.phase, "ended");
      assert(s.round >= 1 && s.round <= 10);
      assert(s.winners.length > 0);
      assertState(s);
      games++;
    }
  assert.equal(games, 42);
});
