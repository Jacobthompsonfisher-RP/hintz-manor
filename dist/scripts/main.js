const e = {
  ID: "hintz-manor",
  TITLE: "Hintz Manor",
  FLAGS: {
    MYSTERY_STATE: "mysteryState",
    TURN_LOGS: "turnLogs",
    EVIDENCE_LEDGER: "evidenceLedger",
    NOTEBOOK: "detectiveNotebook"
  },
  SETTINGS: {
    CO_TRAVEL_PROBABILITY: "coTravelProbability",
    NOVELTY_WEIGHT: "noveltyWeight",
    AUTO_EXECUTE_NPC_MOVE: "autoExecuteNPCMove"
  },
  DEFAULTS: {
    CO_TRAVEL_PROBABILITY: 0.5,
    // 50% chance NPC co-travels with room co-occupants
    NOVELTY_WEIGHT: 0.7,
    // Weight factor preferring unvisited rooms
    AUTO_EXECUTE_NPC_MOVE: !1
  },
  STATUS: {
    SETUP: "SETUP",
    IN_PROGRESS: "IN_PROGRESS",
    CRIME_COMMITTED: "CRIME_COMMITTED"
  }
};
class R {
  /**
   * Registers all module settings in Foundry.
   */
  static registerSettings() {
    game.settings.register(e.ID, e.SETTINGS.CO_TRAVEL_PROBABILITY, {
      name: "Co-Travel Probability",
      hint: "Odds (0.0 to 1.0) that an NPC will choose to follow a character sharing their current room.",
      scope: "world",
      config: !0,
      type: Number,
      default: e.DEFAULTS.CO_TRAVEL_PROBABILITY,
      range: { min: 0, max: 1, step: 0.05 }
    }), game.settings.register(e.ID, e.SETTINGS.NOVELTY_WEIGHT, {
      name: "Novelty Room Weighting",
      hint: "Weight factor favoring rooms the NPC has not yet visited during travel.",
      scope: "world",
      config: !0,
      type: Number,
      default: e.DEFAULTS.NOVELTY_WEIGHT,
      range: { min: 0, max: 2, step: 0.1 }
    }), game.settings.register(e.ID, e.SETTINGS.AUTO_EXECUTE_NPC_MOVE, {
      name: "Auto-Execute NPC Moves",
      hint: "If enabled, NPC tokens automatically move along suggested paths when their turn starts.",
      scope: "world",
      config: !0,
      type: Boolean,
      default: e.DEFAULTS.AUTO_EXECUTE_NPC_MOVE
    }), game.settings.register(e.ID, e.FLAGS.MYSTERY_STATE, {
      scope: "world",
      config: !1,
      type: Object,
      default: {
        status: e.STATUS.SETUP,
        killerId: null,
        victimId: null,
        requiredWeapon: null,
        suspects: [],
        weapons: [],
        rooms: [],
        roomWeaponLocations: {},
        solution: null
      }
    }), game.settings.register(e.ID, e.FLAGS.TURN_LOGS, {
      scope: "world",
      config: !1,
      type: Array,
      default: []
    }), game.settings.register(e.ID, e.FLAGS.EVIDENCE_LEDGER, {
      scope: "world",
      config: !1,
      type: Array,
      default: []
    });
  }
  /**
   * Retrieves player notebook data for current user.
   * @returns {Object}
   */
  static getPlayerNotebook() {
    const o = { eliminatedSuspects: [], eliminatedWeapons: [], eliminatedRooms: [], notes: "" };
    return game.user.getFlag(e.ID, e.FLAGS.NOTEBOOK) || o;
  }
  /**
   * Saves player notebook state.
   * @param {Object} data 
   */
  static async savePlayerNotebook(o) {
    await game.user.setFlag(e.ID, e.FLAGS.NOTEBOOK, o);
  }
}
class T {
  /**
   * Identifies which named Room a token or x,y coordinate resides in.
   * @param {TokenDocument|Token|{x: number, y: number}} target - Token or coordinate object
   * @returns {string} Room name or "Corridor / Unknown"
   */
  static getRoomAt(o) {
    if (!canvas?.ready) return "Unknown";
    const t = {
      x: o.x ?? o.center?.x ?? 0,
      y: o.y ?? o.center?.y ?? 0
    };
    if (canvas.regions?.placeables)
      for (const n of canvas.regions.placeables) {
        const s = n.document.name || n.document.label;
        if (!(!s || s.toLowerCase().startsWith("unnamed")) && n.testPoint(t))
          return s;
      }
    if (canvas.drawings?.placeables)
      for (const n of canvas.drawings.placeables) {
        const s = n.document.text?.trim();
        if (!s) continue;
        const a = n.bounds;
        if (t.x >= a.x && t.x <= a.x + a.width && t.y >= a.y && t.y <= a.y + a.height)
          return s;
      }
    return "Corridor";
  }
  /**
   * Retrieves all defined Room names on the active scene.
   * @returns {string[]} List of room names
   */
  static getAllRooms() {
    const o = /* @__PURE__ */ new Set();
    if (!canvas?.ready) return Array.from(o);
    if (canvas.regions?.placeables)
      for (const t of canvas.regions.placeables) {
        const n = t.document.name || t.document.label;
        n && !n.toLowerCase().startsWith("unnamed") && o.add(n);
      }
    if (canvas.drawings?.placeables)
      for (const t of canvas.drawings.placeables) {
        const n = t.document.text?.trim();
        n && o.add(n);
      }
    return o.size === 0 ? ["Library", "Study", "Hall", "Conservatory", "Billiard Room", "Ballroom", "Dining Room", "Kitchen", "Lounge"] : Array.from(o);
  }
}
class S {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(o) {
    if (!canvas?.ready) return null;
    const t = o.token || o;
    if (!t) return null;
    const n = t.id, s = t.name || "Unknown Character", a = T.getRoomAt(t), r = game.combat?.round || 1, i = game.combat?.turn || 0, l = this.getVisibleTokensFor(t), m = this.getTokensInRoom(a, n), u = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round: r,
      turn: i,
      tokenId: n,
      actorName: s,
      room: a,
      coords: { x: Math.round(t.x), y: Math.round(t.y) },
      visibleTokenIds: l.map((c) => c.id),
      visibleTokenNames: l.map((c) => c.name),
      coOccupantNames: m.map((c) => c.name),
      isNPC: !t.actor?.hasPlayerOwner
    };
    return this.appendTurnLog(u), u;
  }
  /**
   * Raycasts vision from source token to all other tokens on scene to test line-of-sight.
   * @param {TokenDocument|Token} sourceToken 
   * @returns {Token[]} Tokens visible to sourceToken
   */
  static getVisibleTokensFor(o) {
    const t = [];
    if (!canvas?.ready) return t;
    const n = o.center || { x: o.x, y: o.y };
    for (const s of canvas.tokens.placeables) {
      if (s.id === o.id || !s.visible) continue;
      const a = s.center || { x: s.x, y: s.y }, r = new Ray(n, a);
      canvas.walls?.checkCollision(r, { type: "sight", mode: "any" }) || t.push(s);
    }
    return t;
  }
  /**
   * Retrieves all active tokens currently occupying a specific room.
   * @param {string} roomName 
   * @param {string} excludeTokenId 
   * @returns {Token[]}
   */
  static getTokensInRoom(o, t = null) {
    return canvas?.ready ? canvas.tokens.placeables.filter((n) => t && n.id === t ? !1 : T.getRoomAt(n) === o) : [];
  }
  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(o) {
    if (!game.user.isGM) return;
    const t = game.settings.get(e.ID, e.FLAGS.TURN_LOGS) || [];
    t.push(o), await game.settings.set(e.ID, e.FLAGS.TURN_LOGS, t);
  }
  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(o) {
    return (game.settings.get(e.ID, e.FLAGS.TURN_LOGS) || []).filter((n) => n.tokenId === o);
  }
}
class M {
  constructor() {
    this.adjacencyMap = /* @__PURE__ */ new Map();
  }
  /**
   * Initializes or refreshes the room graph based on active scene regions and walls/doors.
   */
  buildGraph() {
    this.adjacencyMap.clear();
    const o = T.getAllRooms();
    for (const t of o)
      this.adjacencyMap.set(t, /* @__PURE__ */ new Set());
    for (let t = 0; t < o.length; t++)
      for (let n = t + 1; n < o.length; n++) {
        const s = o[t], a = o[n];
        this.adjacencyMap.get(s).add(a), this.adjacencyMap.get(a).add(s);
      }
  }
  /**
   * Gets adjacent connected rooms for a given room.
   * @param {string} roomName 
   * @returns {string[]}
   */
  getAdjacentRooms(o) {
    return this.adjacencyMap.has(o) || this.buildGraph(), Array.from(this.adjacencyMap.get(o) || []);
  }
  /**
   * Calculates rooms reachable within a given maximum step distance.
   * @param {string} currentRoom 
   * @param {number} maxDistance 
   * @returns {string[]}
   */
  getReachableRooms(o, t = 2) {
    const n = /* @__PURE__ */ new Set([o]);
    let s = /* @__PURE__ */ new Set([o]);
    for (let a = 0; a < t; a++) {
      const r = /* @__PURE__ */ new Set();
      for (const i of s) {
        const l = this.getAdjacentRooms(i);
        for (const m of l)
          n.has(m) || (n.add(m), r.add(m));
      }
      s = r;
    }
    return Array.from(n);
  }
}
class w {
  constructor() {
    this.roomGraph = new M();
  }
  /**
   * Plans the next turn movement for an NPC token based on cascading rules.
   * @param {TokenDocument|Token} npcToken - The NPC token
   * @param {Object} options - Travel context (co-occupants, history, target tools)
   * @returns {Object} { suggestedRoom, coTraveledWith, pathReason }
   */
  planMovement(o, t = {}) {
    const n = T.getRoomAt(o), s = t.coOccupants || [], a = t.travelHistory || [], r = t.targetToolRoom || null, i = game.settings.get(e.ID, e.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5, l = game.settings.get(e.ID, e.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;
    if (s.length > 0 && Math.random() < i) {
      const g = s[Math.floor(Math.random() * s.length)], p = t.partnerDestinations?.[g.id] || null;
      if (p && p !== n)
        return {
          suggestedRoom: p,
          coTraveledWith: g.name,
          pathReason: `Co-traveling with ${g.name} (${Math.round(i * 100)}% odds triggered)`
        };
    }
    if (r && r !== n && this.roomGraph.getAdjacentRooms(n).includes(r))
      return {
        suggestedRoom: r,
        coTraveledWith: null,
        pathReason: `Seeking required crime tool in ${r}`
      };
    const m = this.roomGraph.getReachableRooms(n, 1);
    if (m.length === 0)
      return { suggestedRoom: n, coTraveledWith: null, pathReason: "No reachable rooms" };
    const u = new Set(a.map((g) => g.room)), c = m.map((g) => {
      const p = !u.has(g), k = g === n;
      let v = 1;
      return p ? v += l * 2 : k && (v *= 0.3), { room: g, weight: v };
    }), y = c.reduce((g, p) => g + p.weight, 0);
    let E = Math.random() * y, f = n;
    for (const g of c) {
      if (E <= g.weight) {
        f = g.room;
        break;
      }
      E -= g.weight;
    }
    const L = !u.has(f);
    return {
      suggestedRoom: f,
      coTraveledWith: null,
      pathReason: L ? `Selected novel unvisited room (${f})` : `Exploring adjacent room (${f})`
    };
  }
}
class C {
  /**
   * Evaluates if any NPC has met the isolation & tool criteria to commit the crime.
   * @returns {Object|null} Triggered crime result or null
   */
  static async evaluateCrimeOpportunity() {
    if (!game.user.isGM) return null;
    const o = game.settings.get(e.ID, e.FLAGS.MYSTERY_STATE);
    if (!o || o.status !== e.STATUS.IN_PROGRESS)
      return null;
    const { killerId: t, victimId: n, requiredWeapon: s, roomWeaponLocations: a } = o;
    if (!t || !n) return null;
    const r = canvas.tokens?.get(t), i = canvas.tokens?.get(n);
    if (!r || !i) return null;
    const l = T.getRoomAt(r), m = T.getRoomAt(i);
    if (l !== m || l === "Corridor") return null;
    const u = r.document.getFlag(e.ID, "acquiredTools") || [];
    if (s && !u.includes(s))
      if (a?.[s] === l)
        u.push(s), await r.document.setFlag(e.ID, "acquiredTools", u), ui.notifications.info(`${e.TITLE}: ${r.name} secretly acquired the ${s} in the ${l}!`);
      else
        return null;
    if (S.getVisibleTokensFor(r).filter((E) => E.id !== n).length > 0)
      return null;
    const y = {
      killerName: r.name,
      victimName: i.name,
      weapon: s,
      room: l,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };
    return o.status = e.STATUS.CRIME_COMMITTED, o.solution = y, await game.settings.set(e.ID, e.FLAGS.MYSTERY_STATE, o), ui.notifications.warn(`${e.TITLE}: A foul crime has occurred in the ${l}! The investigation begins!`), i && await i.document.update({ overlayEffect: "icons/svg/skull.svg" }), y;
  }
}
const { ApplicationV2: O, HandlebarsApplicationMixin: N } = foundry.applications.api;
class h extends N(O) {
  static DEFAULT_OPTIONS = {
    id: "hintz-manor-gm-panel",
    tag: "form",
    window: {
      title: "Hintz Manor - GM Control Panel",
      icon: "fa-solid fa-masks-theater",
      resizable: !0
    },
    position: {
      width: 680,
      height: 580
    },
    actions: {
      initializeMystery: h._onInitializeMystery,
      placeWeapon: h._onPlaceWeapon,
      resetMystery: h._onResetMystery
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/gm-panel.hbs"
    }
  };
  async _prepareContext(o) {
    const t = game.settings.get(e.ID, e.FLAGS.MYSTERY_STATE) || {}, n = game.settings.get(e.ID, e.FLAGS.TURN_LOGS) || [], s = canvas.tokens?.placeables.map((i) => ({ id: i.id, name: i.name })) || [], a = T.getAllRooms(), r = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench"];
    return {
      mysteryState: t,
      turnLogs: n.slice(-15).reverse(),
      // Show latest 15 turn logs
      tokens: s,
      rooms: a,
      defaultWeapons: r,
      isSetup: t.status === e.STATUS.SETUP,
      isInProgress: t.status === e.STATUS.IN_PROGRESS,
      isCrimeCommitted: t.status === e.STATUS.CRIME_COMMITTED
    };
  }
  static async _onInitializeMystery(o, t) {
    o.preventDefault();
    const n = this.element, s = n.querySelector('[name="killerId"]')?.value, a = n.querySelector('[name="victimId"]')?.value, r = n.querySelector('[name="requiredWeapon"]')?.value;
    if (!s || !a || !r) {
      ui.notifications.error(`${e.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }
    if (s === a) {
      ui.notifications.error(`${e.TITLE}: Killer and Victim cannot be the same character!`);
      return;
    }
    const i = T.getAllRooms(), l = {
      [r]: i[Math.floor(Math.random() * i.length)]
    }, m = {
      status: e.STATUS.IN_PROGRESS,
      killerId: s,
      victimId: a,
      requiredWeapon: r,
      rooms: i,
      roomWeaponLocations: l,
      solution: null
    };
    await game.settings.set(e.ID, e.FLAGS.MYSTERY_STATE, m), ui.notifications.info(`${e.TITLE}: Mystery initialized! The secret killer has been set.`), this.render();
  }
  static async _onResetMystery(o, t) {
    o.preventDefault(), await game.settings.set(e.ID, e.FLAGS.MYSTERY_STATE, {
      status: e.STATUS.SETUP,
      killerId: null,
      victimId: null,
      requiredWeapon: null,
      solution: null
    }), await game.settings.set(e.ID, e.FLAGS.TURN_LOGS, []), ui.notifications.info(`${e.TITLE}: Mystery state reset to initial setup.`), this.render();
  }
}
const { ApplicationV2: _, HandlebarsApplicationMixin: G } = foundry.applications.api;
class I extends G(_) {
  static DEFAULT_OPTIONS = {
    id: "hintz-manor-detective-notebook",
    tag: "form",
    window: {
      title: "Detective Notebook - Hintz Manor",
      icon: "fa-solid fa-book-skull",
      resizable: !0
    },
    position: {
      width: 700,
      height: 600
    },
    actions: {
      toggleElimination: I._onToggleElimination,
      submitAccusation: I._onSubmitAccusation
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/detective-notebook.hbs"
    }
  };
  async _prepareContext(o) {
    const t = R.getPlayerNotebook(), n = game.settings.get(e.ID, e.FLAGS.MYSTERY_STATE) || {}, s = game.settings.get(e.ID, e.FLAGS.TURN_LOGS) || [], a = canvas.tokens?.placeables.map((c) => c.name) || ["Col. Mustard", "Prof. Plum", "Miss Scarlet", "Mrs. Peacock"], r = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench"], i = T.getAllRooms(), l = a.map((c) => ({
      name: c,
      isEliminated: t.eliminatedSuspects?.includes(c)
    })), m = r.map((c) => ({
      name: c,
      isEliminated: t.eliminatedWeapons?.includes(c)
    })), u = i.map((c) => ({
      name: c,
      isEliminated: t.eliminatedRooms?.includes(c)
    }));
    return {
      notebook: t,
      suspectItems: l,
      weaponItems: m,
      roomItems: u,
      turnLogs: s.slice(-20).reverse(),
      // Latest 20 turn logs for player investigation
      isCrimeCommitted: n.status === e.STATUS.CRIME_COMMITTED
    };
  }
  static async _onToggleElimination(o, t) {
    o.preventDefault();
    const n = t.dataset.type, s = t.dataset.name, a = R.getPlayerNotebook(), i = {
      suspect: "eliminatedSuspects",
      weapon: "eliminatedWeapons",
      room: "eliminatedRooms"
    }[n];
    i && (a[i] = a[i] || [], a[i].includes(s) ? a[i] = a[i].filter((l) => l !== s) : a[i].push(s), await R.savePlayerNotebook(a), this.render());
  }
  static async _onSubmitAccusation(o, t) {
    o.preventDefault();
    const n = this.element, s = n.querySelector('[name="accusedSuspect"]')?.value, a = n.querySelector('[name="accusedWeapon"]')?.value, r = n.querySelector('[name="accusedRoom"]')?.value, i = game.settings.get(e.ID, e.FLAGS.MYSTERY_STATE);
    if (!i?.solution) {
      ui.notifications.warn(`${e.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }
    const { killerName: l, weapon: m, room: u } = i.solution;
    s === l && a === m && r === u ? ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${l} committed the crime in the ${u} with the ${m}!`) : ui.notifications.error(`❌ INCORRECT ACCUSATION! Your deduction was flawed. ${game.user.name}'s claim was proven false!`);
  }
}
let A = null, b = null;
const D = new w();
Hooks.once("init", () => {
  console.log(`${e.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`), R.registerSettings();
});
Hooks.once("ready", () => {
  console.log(`${e.TITLE} | Ready! Engine active.`);
});
Hooks.on("getSceneControlButtons", (d) => {
  const o = d.find((t) => t.name === "token");
  o && (o.tools.push({
    name: "hintz-manor-notebook",
    title: "Detective Notebook",
    icon: "fa-solid fa-book-skull",
    button: !0,
    onClick: () => {
      b || (b = new I()), b.render(!0);
    }
  }), game.user.isGM && o.tools.push({
    name: "hintz-manor-gm-panel",
    title: "GM Mystery Control Panel",
    icon: "fa-solid fa-masks-theater",
    button: !0,
    onClick: () => {
      A || (A = new h()), A.render(!0);
    }
  }));
});
Hooks.on("updateCombat", async (d, o) => {
  if (!game.user.isGM) return;
  const t = d.combatant;
  if (!t) return;
  const n = S.recordTurnSnapshot(t), s = t.token;
  if (!s) return;
  if (!s.actor?.hasPlayerOwner) {
    const r = S.getTokensInRoom(n?.room, s.id), i = S.getHistoryFor(s.id), l = game.settings.get(e.ID, e.FLAGS.MYSTERY_STATE), m = l?.requiredWeapon, u = l?.roomWeaponLocations?.[m] || null, c = D.planMovement(s, {
      coOccupants: r,
      travelHistory: i,
      targetToolRoom: u
    });
    c.suggestedRoom && c.suggestedRoom !== n?.room && ui.notifications.info(`🧭 ${s.name} (${c.pathReason}): Suggested destination -> ${c.suggestedRoom}`);
  }
  await C.evaluateCrimeOpportunity();
});
Hooks.on("updateToken", async (d, o) => {
  game.user.isGM && ("x" in o || "y" in o) && (S.recordTurnSnapshot(d), await C.evaluateCrimeOpportunity());
});
//# sourceMappingURL=main.js.map
