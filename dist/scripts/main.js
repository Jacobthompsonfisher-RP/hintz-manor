const o = {
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
class k {
  /**
   * Registers all module settings in Foundry.
   */
  static registerSettings() {
    game.settings.register(o.ID, o.SETTINGS.CO_TRAVEL_PROBABILITY, {
      name: "Co-Travel Probability",
      hint: "Odds (0.0 to 1.0) that an NPC will choose to follow a character sharing their current room.",
      scope: "world",
      config: !0,
      type: Number,
      default: o.DEFAULTS.CO_TRAVEL_PROBABILITY,
      range: { min: 0, max: 1, step: 0.05 }
    }), game.settings.register(o.ID, o.SETTINGS.NOVELTY_WEIGHT, {
      name: "Novelty Room Weighting",
      hint: "Weight factor favoring rooms the NPC has not yet visited during travel.",
      scope: "world",
      config: !0,
      type: Number,
      default: o.DEFAULTS.NOVELTY_WEIGHT,
      range: { min: 0, max: 2, step: 0.1 }
    }), game.settings.register(o.ID, o.SETTINGS.AUTO_EXECUTE_NPC_MOVE, {
      name: "Auto-Execute NPC Moves",
      hint: "If enabled, NPC tokens automatically move along suggested paths when their turn starts.",
      scope: "world",
      config: !0,
      type: Boolean,
      default: o.DEFAULTS.AUTO_EXECUTE_NPC_MOVE
    }), game.settings.register(o.ID, o.FLAGS.MYSTERY_STATE, {
      scope: "world",
      config: !1,
      type: Object,
      default: {
        status: o.STATUS.SETUP,
        killerId: null,
        victimId: null,
        requiredWeapon: null,
        suspects: [],
        weapons: [],
        rooms: [],
        roomWeaponLocations: {},
        solution: null
      }
    }), game.settings.register(o.ID, o.FLAGS.TURN_LOGS, {
      scope: "world",
      config: !1,
      type: Array,
      default: []
    }), game.settings.register(o.ID, o.FLAGS.EVIDENCE_LEDGER, {
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
    const n = { eliminatedSuspects: [], eliminatedWeapons: [], eliminatedRooms: [], notes: "" };
    return game.user.getFlag(o.ID, o.FLAGS.NOTEBOOK) || n;
  }
  /**
   * Saves player notebook state.
   * @param {Object} data 
   */
  static async savePlayerNotebook(n) {
    await game.user.setFlag(o.ID, o.FLAGS.NOTEBOOK, n);
  }
}
class y {
  /**
   * Identifies which named Room a token or x,y coordinate resides in.
   * @param {TokenDocument|Token|{x: number, y: number}} target - Token or coordinate object
   * @returns {string} Room name or "Corridor / Unknown"
   */
  static getRoomAt(n) {
    if (!canvas?.ready) return "Unknown";
    const t = {
      x: n.x ?? n.center?.x ?? 0,
      y: n.y ?? n.center?.y ?? 0
    };
    if (canvas.regions?.placeables)
      for (const e of canvas.regions.placeables) {
        const a = e.document.name || e.document.label;
        if (!(!a || a.toLowerCase().startsWith("unnamed")) && e.testPoint(t))
          return a;
      }
    if (canvas.drawings?.placeables)
      for (const e of canvas.drawings.placeables) {
        const a = e.document.text?.trim();
        if (!a) continue;
        const s = e.bounds;
        if (t.x >= s.x && t.x <= s.x + s.width && t.y >= s.y && t.y <= s.y + s.height)
          return a;
      }
    return "Corridor";
  }
  /**
   * Retrieves all defined Room names on the active scene.
   * @returns {string[]} List of room names
   */
  static getAllRooms() {
    const n = /* @__PURE__ */ new Set();
    if (!canvas?.ready) return Array.from(n);
    if (canvas.regions?.placeables)
      for (const t of canvas.regions.placeables) {
        const e = t.document.name || t.document.label;
        e && !e.toLowerCase().startsWith("unnamed") && n.add(e);
      }
    if (canvas.drawings?.placeables)
      for (const t of canvas.drawings.placeables) {
        const e = t.document.text?.trim();
        e && n.add(e);
      }
    return n.size === 0 ? ["Library", "Study", "Hall", "Conservatory", "Billiard Room", "Ballroom", "Dining Room", "Kitchen", "Lounge"] : Array.from(n);
  }
}
class M {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(n) {
    if (!canvas?.ready) return null;
    const t = n.token || n;
    if (!t) return null;
    const e = t.id, a = t.name || "Unknown Character", s = y.getRoomAt(t), i = game.combat?.round || 1, r = game.combat?.turn || 0, c = this.getVisibleTokensFor(t), d = this.getTokensInRoom(s, e), m = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round: i,
      turn: r,
      tokenId: e,
      actorName: a,
      room: s,
      coords: { x: Math.round(t.x), y: Math.round(t.y) },
      visibleTokenIds: c.map((l) => l.id),
      visibleTokenNames: c.map((l) => l.name),
      coOccupantNames: d.map((l) => l.name),
      isNPC: !t.actor?.hasPlayerOwner
    };
    return this.appendTurnLog(m), m;
  }
  /**
   * Raycasts vision from source token to all other tokens on scene to test line-of-sight.
   * @param {TokenDocument|Token} sourceToken 
   * @returns {Token[]} Tokens visible to sourceToken
   */
  static getVisibleTokensFor(n) {
    const t = [];
    if (!canvas?.ready) return t;
    const e = n.center || { x: n.x, y: n.y };
    for (const a of canvas.tokens.placeables) {
      if (a.id === n.id || !a.visible) continue;
      const s = a.center || { x: a.x, y: a.y }, i = new Ray(e, s);
      canvas.walls?.checkCollision(i, { type: "sight", mode: "any" }) || t.push(a);
    }
    return t;
  }
  /**
   * Retrieves all active tokens currently occupying a specific room.
   * @param {string} roomName 
   * @param {string} excludeTokenId 
   * @returns {Token[]}
   */
  static getTokensInRoom(n, t = null) {
    return canvas?.ready ? canvas.tokens.placeables.filter((e) => t && e.id === t ? !1 : y.getRoomAt(e) === n) : [];
  }
  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(n) {
    if (!game.user.isGM) return;
    const t = game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || [];
    t.push(n), await game.settings.set(o.ID, o.FLAGS.TURN_LOGS, t);
  }
  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(n) {
    return (game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || []).filter((e) => e.tokenId === n);
  }
}
class _ {
  constructor() {
    this.adjacencyMap = /* @__PURE__ */ new Map();
  }
  /**
   * Initializes or refreshes the room graph based on active scene regions and walls/doors.
   */
  buildGraph() {
    this.adjacencyMap.clear();
    const n = y.getAllRooms();
    for (const t of n)
      this.adjacencyMap.set(t, /* @__PURE__ */ new Set());
    for (let t = 0; t < n.length; t++)
      for (let e = t + 1; e < n.length; e++) {
        const a = n[t], s = n[e];
        this.adjacencyMap.get(a).add(s), this.adjacencyMap.get(s).add(a);
      }
  }
  /**
   * Gets adjacent connected rooms for a given room.
   * @param {string} roomName 
   * @returns {string[]}
   */
  getAdjacentRooms(n) {
    return this.adjacencyMap.has(n) || this.buildGraph(), Array.from(this.adjacencyMap.get(n) || []);
  }
  /**
   * Calculates rooms reachable within a given maximum step distance.
   * @param {string} currentRoom 
   * @param {number} maxDistance 
   * @returns {string[]}
   */
  getReachableRooms(n, t = 2) {
    const e = /* @__PURE__ */ new Set([n]);
    let a = /* @__PURE__ */ new Set([n]);
    for (let s = 0; s < t; s++) {
      const i = /* @__PURE__ */ new Set();
      for (const r of a) {
        const c = this.getAdjacentRooms(r);
        for (const d of c)
          e.has(d) || (e.add(d), i.add(d));
      }
      a = i;
    }
    return Array.from(e);
  }
}
class N {
  constructor() {
    this.roomGraph = new _();
  }
  /**
   * Plans the next turn movement for an NPC token based on cascading rules.
   * @param {TokenDocument|Token} npcToken - The NPC token
   * @param {Object} options - Travel context (co-occupants, history, target tools)
   * @returns {Object} { suggestedRoom, coTraveledWith, pathReason }
   */
  planMovement(n, t = {}) {
    const e = y.getRoomAt(n), a = t.coOccupants || [], s = t.travelHistory || [], i = t.targetToolRoom || null, r = game.settings.get(o.ID, o.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5, c = game.settings.get(o.ID, o.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;
    if (a.length > 0 && Math.random() < r) {
      const u = a[Math.floor(Math.random() * a.length)], S = t.partnerDestinations?.[u.id] || null;
      if (S && S !== e)
        return {
          suggestedRoom: S,
          coTraveledWith: u.name,
          pathReason: `Co-traveling with ${u.name} (${Math.round(r * 100)}% odds triggered)`
        };
    }
    if (i && i !== e && this.roomGraph.getAdjacentRooms(e).includes(i))
      return {
        suggestedRoom: i,
        coTraveledWith: null,
        pathReason: `Seeking required crime tool in ${i}`
      };
    const d = this.roomGraph.getReachableRooms(e, 1);
    if (d.length === 0)
      return { suggestedRoom: e, coTraveledWith: null, pathReason: "No reachable rooms" };
    const m = new Set(s.map((u) => u.room)), l = d.map((u) => {
      const S = !m.has(u), O = u === e;
      let A = 1;
      return S ? A += c * 2 : O && (A *= 0.3), { room: u, weight: A };
    }), g = l.reduce((u, S) => u + S.weight, 0);
    let h = Math.random() * g, f = e;
    for (const u of l) {
      if (h <= u.weight) {
        f = u.room;
        break;
      }
      h -= u.weight;
    }
    const v = !m.has(f);
    return {
      suggestedRoom: f,
      coTraveledWith: null,
      pathReason: v ? `Selected novel unvisited room (${f})` : `Exploring adjacent room (${f})`
    };
  }
}
class L {
  /**
   * Evaluates if any NPC has met the isolation & tool criteria to commit the crime.
   * @returns {Object|null} Triggered crime result or null
   */
  static async evaluateCrimeOpportunity() {
    if (!game.user.isGM) return null;
    const n = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE);
    if (!n || n.status !== o.STATUS.IN_PROGRESS)
      return null;
    const { killerId: t, victimId: e, requiredWeapon: a, roomWeaponLocations: s } = n;
    if (!t || !e) return null;
    const i = canvas.tokens?.get(t), r = canvas.tokens?.get(e);
    if (!i || !r) return null;
    const c = y.getRoomAt(i), d = y.getRoomAt(r);
    if (c !== d || c === "Corridor") return null;
    const m = i.document.getFlag(o.ID, "acquiredTools") || [];
    if (a && !m.includes(a))
      if (s?.[a] === c)
        m.push(a), await i.document.setFlag(o.ID, "acquiredTools", m), ui.notifications.info(`${o.TITLE}: ${i.name} secretly acquired the ${a} in the ${c}!`);
      else
        return null;
    if (M.getVisibleTokensFor(i).filter((h) => h.id !== e).length > 0)
      return null;
    const g = {
      killerName: i.name,
      victimName: r.name,
      weapon: a,
      room: c,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };
    return n.status = o.STATUS.CRIME_COMMITTED, n.solution = g, await game.settings.set(o.ID, o.FLAGS.MYSTERY_STATE, n), ui.notifications.warn(`${o.TITLE}: A foul crime has occurred in the ${c}! The investigation begins!`), r && await r.document.update({ overlayEffect: "icons/svg/skull.svg" }), g;
  }
}
const R = [
  {
    id: "lord-hintz",
    name: "Lord Reginald Hintz",
    title: "Lord of Hintz Manor",
    role: "Host / Victim",
    category: "Host",
    avatar: "icons/svg/mystery-man.svg",
    bio: "The wealthy and enigmatic owner of Hintz Manor. Known for his vast art collection, hidden debt, and rumoured sudden changes to his family testament.",
    personality: "Arrogant, secretive, and demanding.",
    startingRoom: "Study"
  },
  {
    id: "butler-higgins",
    name: "Arthur Higgins",
    title: "Head Butler",
    role: "Staff",
    category: "Staff",
    avatar: "icons/svg/mystery-man.svg",
    bio: "Has served Hintz Manor for thirty years. Knows every secret passage, keyhole, and scandal within the estate.",
    personality: "Impeccably formal, watchful, and fiercely loyal to the manor reputation.",
    startingRoom: "Hall"
  },
  {
    id: "housekeeper-gable",
    name: "Mrs. Martha Gable",
    title: "Head Housekeeper",
    role: "Staff",
    category: "Staff",
    avatar: "icons/svg/mystery-man.svg",
    bio: "Manages the linen, keys, and domestic affairs. Recently discovered missing silverware and forged financial ledgers.",
    personality: "Stern, sharp-tongued, and observant.",
    startingRoom: "Servants Quarters"
  },
  {
    id: "chef-henri",
    name: "Chef Henri Laurent",
    title: "Master Chef",
    role: "Staff",
    category: "Staff",
    avatar: "icons/svg/mystery-man.svg",
    bio: "A fiery French culinary master with a dark past. Secretly owes vast sums to underground syndicate gamblers.",
    personality: "Passionate, volatile, and proud.",
    startingRoom: "Kitchen"
  },
  {
    id: "maid-clara",
    name: "Clara Vance",
    title: "Head Parlor Maid",
    role: "Staff",
    category: "Staff",
    avatar: "icons/svg/mystery-man.svg",
    bio: "Quiet and unassuming, Clara hears every conversation whispered behind heavy velvet curtains.",
    personality: "Timid on the surface, calculating underneath.",
    startingRoom: "Dining Room"
  },
  {
    id: "valet-james",
    name: "James Sterling",
    title: "Personal Valet",
    role: "Staff",
    category: "Staff",
    avatar: "icons/svg/mystery-man.svg",
    bio: "Lord Hintz’s private valet. Holds compromising love letters between high-society guests.",
    personality: "Smooth-talking, ambitious, and stealthy.",
    startingRoom: "Billiard Room"
  },
  {
    id: "gardener-thomas",
    name: "Thomas Thorn",
    title: "Head Gardener",
    role: "Staff",
    category: "Staff",
    avatar: "icons/svg/mystery-man.svg",
    bio: "Tends the conservatory poisons, nightshades, and estate grounds. Secretly knows who dug the midnight graves.",
    personality: "Gruff, solitary, and quiet.",
    startingRoom: "Conservatory"
  },
  {
    id: "prof-sterling",
    name: "Prof. Thaddeus Sterling",
    title: "Eccentric Antiquarian",
    role: "Guest",
    category: "Guest",
    avatar: "icons/svg/mystery-man.svg",
    bio: "A disgraced university professor obsessed with ancient occult artifacts allegedly buried in Hintz Manor’s cellar.",
    personality: "Obsessive, nervous, and articulate.",
    startingRoom: "Library"
  },
  {
    id: "gen-vance",
    name: "Gen. Alistair Vance",
    title: "Retired Army General",
    role: "Guest",
    category: "Guest",
    avatar: "icons/svg/mystery-man.svg",
    bio: "Decorated military officer with a crippling gambling habit and an unresolved grudge from the colonial wars.",
    personality: "Commanding, impatient, and rigid.",
    startingRoom: "Lounge"
  },
  {
    id: "miss-vivienne",
    name: "Miss Vivienne Duclair",
    title: "Glamorous Actress",
    role: "Guest",
    category: "Guest",
    avatar: "icons/svg/mystery-man.svg",
    bio: "A famous theater star whose lavish lifestyle conceals mounting blackmail demands from an unknown extortionist.",
    personality: "Dramatic, charming, and guarded.",
    startingRoom: "Ballroom"
  },
  {
    id: "lawyer-blackwood",
    name: "Julian Blackwood, Esq.",
    title: "Family Attorney",
    role: "Guest",
    category: "Guest",
    avatar: "icons/svg/mystery-man.svg",
    bio: "The cunning lawyer handling Lord Hintz’s revised last will and testament. Would profit immensely from a sudden demise.",
    personality: "Cold, precise, and persuasive.",
    startingRoom: "Study"
  },
  {
    id: "lady-eleanor",
    name: "Lady Eleanor Hintz",
    title: "Estranged Aristocrat",
    role: "Guest",
    category: "Guest",
    avatar: "icons/svg/mystery-man.svg",
    bio: "Lord Hintz’s estranged sister who claims half the estate belonged to her late husband.",
    personality: "Haughty, vindictive, and sharp.",
    startingRoom: "Conservatory"
  },
  {
    id: "dr-aris",
    name: "Dr. Charles Aris",
    title: "Manor Physician",
    role: "Guest",
    category: "Guest",
    avatar: "icons/svg/mystery-man.svg",
    bio: "The family doctor with access to lethal medical narcotics and a suspicious history of sudden patient deaths.",
    personality: "Calm, clinical, and enigmatic.",
    startingRoom: "Library"
  }
];
class D {
  static MOTIVE_TYPES = [
    "Inheritance & Will Revision",
    "Blackmail & Scandal Cover-up",
    "Unpaid Gambling Debt",
    "Stolen Heirloom & Theft",
    "Jealous Romance Affair",
    "Old Military Vengeance",
    "Toxic Poison Secret"
  ];
  /**
   * Generates a complete mystery scenario matrix:
   * - Secret Killer (chosen from 12 suspects)
   * - Victim (Lord Hintz by default, or selectable)
   * - Secret Crime Weapon / Tool
   * - Relationship Matrix (Alliances, Rivalries)
   * - Secret Motive per Character
   * @param {string} victimId 
   * @returns {Object} Complete mystery scenario configuration
   */
  static generateScenario(n = "lord-hintz") {
    const t = R.find((m) => m.id === n) || R[0], e = R.filter((m) => m.id !== t.id), a = e[Math.floor(Math.random() * e.length)], s = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], i = s[Math.floor(Math.random() * s.length)], r = {};
    for (const m of R)
      r[m.id] = {
        motive: this.MOTIVE_TYPES[Math.floor(Math.random() * this.MOTIVE_TYPES.length)],
        secret: `Holds a secret regarding ${t.name}'s affairs.`
      };
    const c = [], d = [];
    for (let m = 0; m < e.length; m++)
      for (let l = m + 1; l < e.length; l++) {
        const g = Math.random();
        g < 0.15 ? c.push({ char1: e[m].name, char2: e[l].name }) : g > 0.85 && d.push({ char1: e[m].name, char2: e[l].name });
      }
    return {
      killerId: a.id,
      killerName: a.name,
      victimId: t.id,
      victimName: t.name,
      requiredWeapon: i,
      characterMotives: r,
      alliances: c,
      rivalries: d,
      timestamp: Date.now()
    };
  }
}
class P {
  /**
   * Imports a .dd2vtt map file and creates a Foundry Scene.
   * @param {string} sceneName 
   * @param {Object|string} vttData - Parsed JSON object from .dd2vtt
   * @returns {Promise<Scene>} Created Foundry Scene
   */
  static async importMap(n, t) {
    if (!game.user.isGM) return null;
    const e = typeof t == "string" ? JSON.parse(t) : t, a = e.resolution?.pixels_per_grid || 100, s = e.resolution?.map_size?.x || 30, i = e.resolution?.map_size?.y || 30, r = s * a, c = i * a, d = [];
    if (Array.isArray(e.line_of_sight))
      for (const g of e.line_of_sight)
        for (let h = 0; h < g.length - 1; h++) {
          const f = g[h], v = g[h + 1];
          d.push({
            c: [f.x * a, f.y * a, v.x * a, v.y * a],
            door: 0,
            // Normal Wall
            ds: 0
          });
        }
    if (Array.isArray(e.portals))
      for (const g of e.portals) {
        g.position;
        const h = g.bounds;
        if (h && h.length >= 2) {
          const f = h[0], v = h[1];
          d.push({
            c: [f.x * a, f.y * a, v.x * a, v.y * a],
            door: 1,
            // Door
            ds: g.closed ? 1 : 0
            // Closed or Open
          });
        }
      }
    const m = {
      name: n,
      width: r,
      height: c,
      padding: 0.1,
      grid: {
        size: a,
        type: CONST.GRID_TYPES.SQUARE,
        color: "#000000",
        alpha: 0.2
      },
      walls: d,
      tokenVision: !0,
      fogExploration: !0
    }, l = await Scene.create(m);
    return ui.notifications.info(`Hintz Manor: Successfully imported scene "${n}" with ${d.length} walls/doors!`), l;
  }
}
const { ApplicationV2: H, HandlebarsApplicationMixin: z } = foundry.applications.api;
class T extends z(H) {
  static DEFAULT_OPTIONS = {
    id: "hintz-manor-gm-panel",
    tag: "form",
    window: {
      title: "Hintz Manor - GM Control Center",
      icon: "fa-solid fa-masks-theater",
      resizable: !0
    },
    position: {
      width: 750,
      height: 650
    },
    actions: {
      initializeMystery: T._onInitializeMystery,
      randomizeMystery: T._onRandomizeMystery,
      importOpenVTTMaps: T._onImportOpenVTTMaps,
      resetMystery: T._onResetMystery
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/gm-panel.hbs"
    }
  };
  async _prepareContext(n) {
    const t = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE) || {}, e = game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || [], a = canvas.tokens?.placeables.map((r) => ({ id: r.id, name: r.name })) || [], s = y.getAllRooms(), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"];
    return {
      mysteryState: t,
      turnLogs: e.slice(-15).reverse(),
      tokens: a,
      npcRoster: R,
      rooms: s,
      defaultWeapons: i,
      isSetup: t.status === o.STATUS.SETUP,
      isInProgress: t.status === o.STATUS.IN_PROGRESS,
      isCrimeCommitted: t.status === o.STATUS.CRIME_COMMITTED
    };
  }
  static async _onInitializeMystery(n, t) {
    n.preventDefault();
    const e = this.element, a = e.querySelector('[name="killerId"]')?.value, s = e.querySelector('[name="victimId"]')?.value, i = e.querySelector('[name="requiredWeapon"]')?.value;
    if (!a || !s || !i) {
      ui.notifications.error(`${o.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }
    const r = y.getAllRooms(), c = {
      [i]: r[Math.floor(Math.random() * r.length)]
    }, d = {
      status: o.STATUS.IN_PROGRESS,
      killerId: a,
      victimId: s,
      requiredWeapon: i,
      rooms: r,
      roomWeaponLocations: c,
      solution: null
    };
    await game.settings.set(o.ID, o.FLAGS.MYSTERY_STATE, d), ui.notifications.info(`${o.TITLE}: Mystery initialized! The secret killer is set.`), this.render();
  }
  static async _onRandomizeMystery(n, t) {
    n.preventDefault();
    const e = D.generateScenario("lord-hintz"), a = y.getAllRooms(), s = {
      [e.requiredWeapon]: a[Math.floor(Math.random() * a.length)]
    }, i = {
      status: o.STATUS.IN_PROGRESS,
      killerId: e.killerId,
      killerName: e.killerName,
      victimId: e.victimId,
      victimName: e.victimName,
      requiredWeapon: e.requiredWeapon,
      motives: e.characterMotives,
      alliances: e.alliances,
      rivalries: e.rivalries,
      rooms: a,
      roomWeaponLocations: s,
      solution: null
    };
    await game.settings.set(o.ID, o.FLAGS.MYSTERY_STATE, i), await game.settings.set(o.ID, o.FLAGS.TURN_LOGS, []), ui.notifications.info(`🎲 ${o.TITLE}: Full Mystery Reset! Killer, Motives, and Weapon placements have been randomized!`), this.render();
  }
  static async _onImportOpenVTTMaps(n, t) {
    n.preventDefault(), ui.notifications.info(`${o.TITLE}: Importing pre-built OpenVTT map scenes (Hintz1f, Hintz2fa, HintzBasement, HintzRoof)...`);
    const e = [
      { name: "Hintz Manor 1F (Ground Floor)", file: "modules/hintz-manor/assets/maps/Hintz1f.dd2vtt" },
      { name: "Hintz Manor 2F (Upper Floor)", file: "modules/hintz-manor/assets/maps/Hintz2fa.dd2vtt" },
      { name: "Hintz Manor Basement", file: "modules/hintz-manor/assets/maps/HintzBasement.dd2vtt" },
      { name: "Hintz Manor Roof", file: "modules/hintz-manor/assets/maps/HintzRoof.dd2vtt" }
    ];
    for (const a of e)
      try {
        const s = await fetch(a.file);
        if (s.ok) {
          const i = await s.json();
          await P.importMap(a.name, i);
        }
      } catch (s) {
        console.warn(`Could not import map ${a.file}:`, s);
      }
  }
  static async _onResetMystery(n, t) {
    n.preventDefault(), await game.settings.set(o.ID, o.FLAGS.MYSTERY_STATE, {
      status: o.STATUS.SETUP,
      killerId: null,
      victimId: null,
      requiredWeapon: null,
      solution: null
    }), await game.settings.set(o.ID, o.FLAGS.TURN_LOGS, []), ui.notifications.info(`${o.TITLE}: Mystery state reset.`), this.render();
  }
}
const { ApplicationV2: U, HandlebarsApplicationMixin: F } = foundry.applications.api;
class I extends F(U) {
  static DEFAULT_OPTIONS = {
    id: "hintz-manor-detective-notebook",
    tag: "form",
    window: {
      title: "Detective Notebook - Hintz Manor",
      icon: "fa-solid fa-book-skull",
      resizable: !0
    },
    position: {
      width: 750,
      height: 650
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
  async _prepareContext(n) {
    const t = k.getPlayerNotebook(), e = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE) || {}, a = game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || [], s = R.map((l) => l.name), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], r = y.getAllRooms(), c = s.map((l) => ({
      name: l,
      isEliminated: t.eliminatedSuspects?.includes(l)
    })), d = i.map((l) => ({
      name: l,
      isEliminated: t.eliminatedWeapons?.includes(l)
    })), m = r.map((l) => ({
      name: l,
      isEliminated: t.eliminatedRooms?.includes(l)
    }));
    return {
      notebook: t,
      suspectItems: c,
      weaponItems: d,
      roomItems: m,
      turnLogs: a.slice(-20).reverse(),
      isCrimeCommitted: e.status === o.STATUS.CRIME_COMMITTED
    };
  }
  static async _onToggleElimination(n, t) {
    n.preventDefault();
    const e = t.dataset.type, a = t.dataset.name, s = k.getPlayerNotebook(), r = {
      suspect: "eliminatedSuspects",
      weapon: "eliminatedWeapons",
      room: "eliminatedRooms"
    }[e];
    r && (s[r] = s[r] || [], s[r].includes(a) ? s[r] = s[r].filter((c) => c !== a) : s[r].push(a), await k.savePlayerNotebook(s), this.render());
  }
  static async _onSubmitAccusation(n, t) {
    n.preventDefault();
    const e = this.element, a = e.querySelector('[name="accusedSuspect"]')?.value, s = e.querySelector('[name="accusedWeapon"]')?.value, i = e.querySelector('[name="accusedRoom"]')?.value, r = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE);
    if (!r?.solution) {
      ui.notifications.warn(`${o.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }
    const { killerName: c, weapon: d, room: m } = r.solution;
    a === c && s === d && i === m ? ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${c} committed the crime in the ${m} with the ${d}!`) : ui.notifications.error(`❌ INCORRECT ACCUSATION! ${game.user.name}'s claim was proven false!`);
  }
}
let w = null, C = null;
class G {
  static renderDock() {
    if (document.getElementById("hintz-manor-dock")) return;
    const n = document.createElement("div");
    n.id = "hintz-manor-dock";
    let t = `
      <button type="button" class="hm-dock-btn" id="hm-dock-notebook" title="Open Detective Notebook">
        <i class="fa-solid fa-book-skull"></i> Notebook
      </button>
    `;
    game.user.isGM && (t += `
        <button type="button" class="hm-dock-btn" id="hm-dock-gm" title="Open GM Control Center">
          <i class="fa-solid fa-masks-theater"></i> GM Mystery Panel
        </button>
      `), n.innerHTML = t, document.body.appendChild(n), n.querySelector("#hm-dock-notebook")?.addEventListener("click", () => {
      C || (C = new I()), C.render(!0);
    }), n.querySelector("#hm-dock-gm")?.addEventListener("click", () => {
      w || (w = new T()), w.render(!0);
    });
  }
}
let E = null, b = null;
const W = new N();
Hooks.once("init", () => {
  console.log(`${o.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`), k.registerSettings(), game.hintzManor = {
    openGM: () => {
      E || (E = new T()), E.render(!0);
    },
    openNotebook: () => {
      b || (b = new I()), b.render(!0);
    }
  };
});
Hooks.once("ready", () => {
  console.log(`${o.TITLE} | Ready! Engine active.`), G.renderDock(), game.user.isGM && ui.notifications.info(`🔎 ${o.TITLE} Engine Active! Use the top-right screen buttons or Token Controls to open GM Control Center.`);
});
Hooks.on("renderSceneControls", () => {
  G.renderDock();
});
Hooks.on("getSceneControlButtons", (p) => {
  const n = p.find((t) => t.name === "token");
  n && (n.tools.push({
    name: "hintz-manor-notebook",
    title: "Detective Notebook",
    icon: "fa-solid fa-book-skull",
    button: !0,
    onClick: () => {
      b || (b = new I()), b.render(!0);
    }
  }), game.user.isGM && n.tools.push({
    name: "hintz-manor-gm-panel",
    title: "GM Mystery Control Panel",
    icon: "fa-solid fa-masks-theater",
    button: !0,
    onClick: () => {
      E || (E = new T()), E.render(!0);
    }
  }));
});
Hooks.on("updateCombat", async (p, n) => {
  if (!game.user.isGM) return;
  const t = p.combatant;
  if (!t) return;
  const e = M.recordTurnSnapshot(t), a = t.token;
  if (!a) return;
  if (!a.actor?.hasPlayerOwner) {
    const i = M.getTokensInRoom(e?.room, a.id), r = M.getHistoryFor(a.id), c = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE), d = c?.requiredWeapon, m = c?.roomWeaponLocations?.[d] || null, l = W.planMovement(a, {
      coOccupants: i,
      travelHistory: r,
      targetToolRoom: m
    });
    l.suggestedRoom && l.suggestedRoom !== e?.room && ui.notifications.info(`🧭 ${a.name} (${l.pathReason}): Suggested destination -> ${l.suggestedRoom}`);
  }
  await L.evaluateCrimeOpportunity();
});
Hooks.on("updateToken", async (p, n) => {
  game.user.isGM && ("x" in n || "y" in n) && (M.recordTurnSnapshot(p), await L.evaluateCrimeOpportunity());
});
//# sourceMappingURL=main.js.map
