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
class M {
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
    const e = {
      x: n.x ?? n.center?.x ?? 0,
      y: n.y ?? n.center?.y ?? 0
    };
    if (canvas.regions?.placeables)
      for (const t of canvas.regions.placeables) {
        const a = t.document.name || t.document.label;
        if (!(!a || a.toLowerCase().startsWith("unnamed")) && t.testPoint(e))
          return a;
      }
    if (canvas.drawings?.placeables)
      for (const t of canvas.drawings.placeables) {
        const a = t.document.text?.trim();
        if (!a) continue;
        const s = t.bounds;
        if (e.x >= s.x && e.x <= s.x + s.width && e.y >= s.y && e.y <= s.y + s.height)
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
      for (const e of canvas.regions.placeables) {
        const t = e.document.name || e.document.label;
        t && !t.toLowerCase().startsWith("unnamed") && n.add(t);
      }
    if (canvas.drawings?.placeables)
      for (const e of canvas.drawings.placeables) {
        const t = e.document.text?.trim();
        t && n.add(t);
      }
    return n.size === 0 ? ["Library", "Study", "Hall", "Conservatory", "Billiard Room", "Ballroom", "Dining Room", "Kitchen", "Lounge"] : Array.from(n);
  }
}
class k {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(n) {
    if (!canvas?.ready) return null;
    const e = n.token || n;
    if (!e) return null;
    const t = e.id, a = e.name || "Unknown Character", s = y.getRoomAt(e), i = game.combat?.round || 1, r = game.combat?.turn || 0, m = this.getVisibleTokensFor(e), d = this.getTokensInRoom(s, t), c = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round: i,
      turn: r,
      tokenId: t,
      actorName: a,
      room: s,
      coords: { x: Math.round(e.x), y: Math.round(e.y) },
      visibleTokenIds: m.map((l) => l.id),
      visibleTokenNames: m.map((l) => l.name),
      coOccupantNames: d.map((l) => l.name),
      isNPC: !e.actor?.hasPlayerOwner
    };
    return this.appendTurnLog(c), c;
  }
  /**
   * Raycasts vision from source token to all other tokens on scene to test line-of-sight.
   * @param {TokenDocument|Token} sourceToken 
   * @returns {Token[]} Tokens visible to sourceToken
   */
  static getVisibleTokensFor(n) {
    const e = [];
    if (!canvas?.ready) return e;
    const t = n.center || { x: n.x, y: n.y };
    for (const a of canvas.tokens.placeables) {
      if (a.id === n.id || !a.visible) continue;
      const s = a.center || { x: a.x, y: a.y }, i = new Ray(t, s);
      canvas.walls?.checkCollision(i, { type: "sight", mode: "any" }) || e.push(a);
    }
    return e;
  }
  /**
   * Retrieves all active tokens currently occupying a specific room.
   * @param {string} roomName 
   * @param {string} excludeTokenId 
   * @returns {Token[]}
   */
  static getTokensInRoom(n, e = null) {
    return canvas?.ready ? canvas.tokens.placeables.filter((t) => e && t.id === e ? !1 : y.getRoomAt(t) === n) : [];
  }
  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(n) {
    if (!game.user.isGM) return;
    const e = game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || [];
    e.push(n), await game.settings.set(o.ID, o.FLAGS.TURN_LOGS, e);
  }
  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(n) {
    return (game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || []).filter((t) => t.tokenId === n);
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
    for (const e of n)
      this.adjacencyMap.set(e, /* @__PURE__ */ new Set());
    for (let e = 0; e < n.length; e++)
      for (let t = e + 1; t < n.length; t++) {
        const a = n[e], s = n[t];
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
  getReachableRooms(n, e = 2) {
    const t = /* @__PURE__ */ new Set([n]);
    let a = /* @__PURE__ */ new Set([n]);
    for (let s = 0; s < e; s++) {
      const i = /* @__PURE__ */ new Set();
      for (const r of a) {
        const m = this.getAdjacentRooms(r);
        for (const d of m)
          t.has(d) || (t.add(d), i.add(d));
      }
      a = i;
    }
    return Array.from(t);
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
  planMovement(n, e = {}) {
    const t = y.getRoomAt(n), a = e.coOccupants || [], s = e.travelHistory || [], i = e.targetToolRoom || null, r = game.settings.get(o.ID, o.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5, m = game.settings.get(o.ID, o.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;
    if (a.length > 0 && Math.random() < r) {
      const u = a[Math.floor(Math.random() * a.length)], p = e.partnerDestinations?.[u.id] || null;
      if (p && p !== t)
        return {
          suggestedRoom: p,
          coTraveledWith: u.name,
          pathReason: `Co-traveling with ${u.name} (${Math.round(r * 100)}% odds triggered)`
        };
    }
    if (i && i !== t && this.roomGraph.getAdjacentRooms(t).includes(i))
      return {
        suggestedRoom: i,
        coTraveledWith: null,
        pathReason: `Seeking required crime tool in ${i}`
      };
    const d = this.roomGraph.getReachableRooms(t, 1);
    if (d.length === 0)
      return { suggestedRoom: t, coTraveledWith: null, pathReason: "No reachable rooms" };
    const c = new Set(s.map((u) => u.room)), l = d.map((u) => {
      const p = !c.has(u), O = u === t;
      let A = 1;
      return p ? A += m * 2 : O && (A *= 0.3), { room: u, weight: A };
    }), T = l.reduce((u, p) => u + p.weight, 0);
    let S = Math.random() * T, h = t;
    for (const u of l) {
      if (S <= u.weight) {
        h = u.room;
        break;
      }
      S -= u.weight;
    }
    const f = !c.has(h);
    return {
      suggestedRoom: h,
      coTraveledWith: null,
      pathReason: f ? `Selected novel unvisited room (${h})` : `Exploring adjacent room (${h})`
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
    const { killerId: e, victimId: t, requiredWeapon: a, roomWeaponLocations: s } = n;
    if (!e || !t) return null;
    const i = canvas.tokens?.get(e), r = canvas.tokens?.get(t);
    if (!i || !r) return null;
    const m = y.getRoomAt(i), d = y.getRoomAt(r);
    if (m !== d || m === "Corridor") return null;
    const c = i.document.getFlag(o.ID, "acquiredTools") || [];
    if (a && !c.includes(a))
      if (s?.[a] === m)
        c.push(a), await i.document.setFlag(o.ID, "acquiredTools", c), ui.notifications.info(`${o.TITLE}: ${i.name} secretly acquired the ${a} in the ${m}!`);
      else
        return null;
    if (k.getVisibleTokensFor(i).filter((S) => S.id !== t).length > 0)
      return null;
    const T = {
      killerName: i.name,
      victimName: r.name,
      weapon: a,
      room: m,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };
    return n.status = o.STATUS.CRIME_COMMITTED, n.solution = T, await game.settings.set(o.ID, o.FLAGS.MYSTERY_STATE, n), ui.notifications.warn(`${o.TITLE}: A foul crime has occurred in the ${m}! The investigation begins!`), r && await r.document.update({ overlayEffect: "icons/svg/skull.svg" }), T;
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
    const e = R.find((c) => c.id === n) || R[0], t = R.filter((c) => c.id !== e.id), a = t[Math.floor(Math.random() * t.length)], s = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], i = s[Math.floor(Math.random() * s.length)], r = {};
    for (const c of R)
      r[c.id] = {
        motive: this.MOTIVE_TYPES[Math.floor(Math.random() * this.MOTIVE_TYPES.length)],
        secret: `Holds a secret regarding ${e.name}'s affairs.`
      };
    const m = [], d = [];
    for (let c = 0; c < t.length; c++)
      for (let l = c + 1; l < t.length; l++) {
        const T = Math.random();
        T < 0.15 ? m.push({ char1: t[c].name, char2: t[l].name }) : T > 0.85 && d.push({ char1: t[c].name, char2: t[l].name });
      }
    return {
      killerId: a.id,
      killerName: a.name,
      victimId: e.id,
      victimName: e.name,
      requiredWeapon: i,
      characterMotives: r,
      alliances: m,
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
   * @param {string} imagePath - Optional explicit image path (e.g. modules/hintz-manor/assets/maps/Hintz1f.png)
   * @returns {Promise<Scene>} Created Foundry Scene
   */
  static async importMap(n, e, t = null) {
    if (!game.user.isGM) return null;
    const a = typeof e == "string" ? JSON.parse(e) : e, s = a.resolution?.pixels_per_grid || 100, i = a.resolution?.map_size?.x || 30, r = a.resolution?.map_size?.y || 30, m = i * s, d = r * s;
    let c = t;
    !c && a.image && (c = a.image.startsWith("data:") ? a.image : `data:image/png;base64,${a.image}`);
    const l = [];
    if (Array.isArray(a.line_of_sight))
      for (const h of a.line_of_sight)
        for (let f = 0; f < h.length - 1; f++) {
          const u = h[f], p = h[f + 1];
          l.push({
            c: [u.x * s, u.y * s, p.x * s, p.y * s],
            door: 0,
            ds: 0
          });
        }
    if (Array.isArray(a.portals))
      for (const h of a.portals) {
        const f = h.bounds;
        if (f && f.length >= 2) {
          const u = f[0], p = f[1];
          l.push({
            c: [u.x * s, u.y * s, p.x * s, p.y * s],
            door: 1,
            ds: h.closed ? 1 : 0
          });
        }
      }
    const T = {
      name: n,
      width: m,
      height: d,
      padding: 0.1,
      background: {
        src: c
      },
      grid: {
        size: s,
        type: CONST.GRID_TYPES.SQUARE,
        color: "#000000",
        alpha: 0.2
      },
      walls: l,
      tokenVision: !0,
      fogExploration: !0
    }, S = await Scene.create(T);
    return ui.notifications.info(`Hintz Manor: Successfully imported scene "${n}" with background image and ${l.length} walls/doors!`), S;
  }
}
const { ApplicationV2: z, HandlebarsApplicationMixin: H } = foundry.applications.api;
class v extends H(z) {
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
      initializeMystery: v._onInitializeMystery,
      randomizeMystery: v._onRandomizeMystery,
      importOpenVTTMaps: v._onImportOpenVTTMaps,
      resetMystery: v._onResetMystery
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/gm-panel.hbs"
    }
  };
  async _prepareContext(n) {
    const e = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE) || {}, t = game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || [], a = canvas.tokens?.placeables.map((r) => ({ id: r.id, name: r.name })) || [], s = y.getAllRooms(), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"];
    return {
      mysteryState: e,
      turnLogs: t.slice(-15).reverse(),
      tokens: a,
      npcRoster: R,
      rooms: s,
      defaultWeapons: i,
      isSetup: e.status === o.STATUS.SETUP,
      isInProgress: e.status === o.STATUS.IN_PROGRESS,
      isCrimeCommitted: e.status === o.STATUS.CRIME_COMMITTED
    };
  }
  static async _onInitializeMystery(n, e) {
    n.preventDefault();
    const t = this.element, a = t.querySelector('[name="killerId"]')?.value, s = t.querySelector('[name="victimId"]')?.value, i = t.querySelector('[name="requiredWeapon"]')?.value;
    if (!a || !s || !i) {
      ui.notifications.error(`${o.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }
    const r = y.getAllRooms(), m = {
      [i]: r[Math.floor(Math.random() * r.length)]
    }, d = {
      status: o.STATUS.IN_PROGRESS,
      killerId: a,
      victimId: s,
      requiredWeapon: i,
      rooms: r,
      roomWeaponLocations: m,
      solution: null
    };
    await game.settings.set(o.ID, o.FLAGS.MYSTERY_STATE, d), ui.notifications.info(`${o.TITLE}: Mystery initialized! The secret killer is set.`), this.render();
  }
  static async _onRandomizeMystery(n, e) {
    n.preventDefault();
    const t = D.generateScenario("lord-hintz"), a = y.getAllRooms(), s = {
      [t.requiredWeapon]: a[Math.floor(Math.random() * a.length)]
    }, i = {
      status: o.STATUS.IN_PROGRESS,
      killerId: t.killerId,
      killerName: t.killerName,
      victimId: t.victimId,
      victimName: t.victimName,
      requiredWeapon: t.requiredWeapon,
      motives: t.characterMotives,
      alliances: t.alliances,
      rivalries: t.rivalries,
      rooms: a,
      roomWeaponLocations: s,
      solution: null
    };
    await game.settings.set(o.ID, o.FLAGS.MYSTERY_STATE, i), await game.settings.set(o.ID, o.FLAGS.TURN_LOGS, []), ui.notifications.info(`🎲 ${o.TITLE}: Full Mystery Reset! Killer, Motives, and Weapon placements have been randomized!`), this.render();
  }
  static async _onImportOpenVTTMaps(n, e) {
    n.preventDefault(), ui.notifications.info(`${o.TITLE}: Importing pre-built OpenVTT map scenes with background images...`);
    const t = [
      { name: "Hintz Manor 1F (Ground Floor)", file: "modules/hintz-manor/assets/maps/Hintz1f.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz1f.png" },
      { name: "Hintz Manor 2F (Upper Floor)", file: "modules/hintz-manor/assets/maps/Hintz2fa.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz2fa.png" },
      { name: "Hintz Manor Basement", file: "modules/hintz-manor/assets/maps/HintzBasement.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzBasement.png" },
      { name: "Hintz Manor Roof", file: "modules/hintz-manor/assets/maps/HintzRoof.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzRoof.png" }
    ];
    for (const a of t)
      try {
        const s = await fetch(a.file);
        if (s.ok) {
          const i = await s.json();
          await P.importMap(a.name, i, a.img);
        }
      } catch (s) {
        console.warn(`Could not import map ${a.file}:`, s);
      }
  }
  static async _onResetMystery(n, e) {
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
    const e = M.getPlayerNotebook(), t = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE) || {}, a = game.settings.get(o.ID, o.FLAGS.TURN_LOGS) || [], s = R.map((l) => l.name), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], r = y.getAllRooms(), m = s.map((l) => ({
      name: l,
      isEliminated: e.eliminatedSuspects?.includes(l)
    })), d = i.map((l) => ({
      name: l,
      isEliminated: e.eliminatedWeapons?.includes(l)
    })), c = r.map((l) => ({
      name: l,
      isEliminated: e.eliminatedRooms?.includes(l)
    }));
    return {
      notebook: e,
      suspectItems: m,
      weaponItems: d,
      roomItems: c,
      turnLogs: a.slice(-20).reverse(),
      isCrimeCommitted: t.status === o.STATUS.CRIME_COMMITTED
    };
  }
  static async _onToggleElimination(n, e) {
    n.preventDefault();
    const t = e.dataset.type, a = e.dataset.name, s = M.getPlayerNotebook(), r = {
      suspect: "eliminatedSuspects",
      weapon: "eliminatedWeapons",
      room: "eliminatedRooms"
    }[t];
    r && (s[r] = s[r] || [], s[r].includes(a) ? s[r] = s[r].filter((m) => m !== a) : s[r].push(a), await M.savePlayerNotebook(s), this.render());
  }
  static async _onSubmitAccusation(n, e) {
    n.preventDefault();
    const t = this.element, a = t.querySelector('[name="accusedSuspect"]')?.value, s = t.querySelector('[name="accusedWeapon"]')?.value, i = t.querySelector('[name="accusedRoom"]')?.value, r = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE);
    if (!r?.solution) {
      ui.notifications.warn(`${o.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }
    const { killerName: m, weapon: d, room: c } = r.solution;
    a === m && s === d && i === c ? ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${m} committed the crime in the ${c} with the ${d}!`) : ui.notifications.error(`❌ INCORRECT ACCUSATION! ${game.user.name}'s claim was proven false!`);
  }
}
let w = null, C = null;
class G {
  static renderDock() {
    if (document.getElementById("hintz-manor-dock")) return;
    const n = document.createElement("div");
    n.id = "hintz-manor-dock";
    let e = `
      <button type="button" class="hm-dock-btn" id="hm-dock-notebook" title="Open Detective Notebook">
        <i class="fa-solid fa-book-skull"></i> Notebook
      </button>
    `;
    game.user.isGM && (e += `
        <button type="button" class="hm-dock-btn" id="hm-dock-gm" title="Open GM Control Center">
          <i class="fa-solid fa-masks-theater"></i> GM Mystery Panel
        </button>
      `), n.innerHTML = e, document.body.appendChild(n), n.querySelector("#hm-dock-notebook")?.addEventListener("click", () => {
      C || (C = new I()), C.render(!0);
    }), n.querySelector("#hm-dock-gm")?.addEventListener("click", () => {
      w || (w = new v()), w.render(!0);
    });
  }
}
let E = null, b = null;
const W = new N();
Hooks.once("init", () => {
  console.log(`${o.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`), M.registerSettings(), game.hintzManor = {
    openGM: () => {
      E || (E = new v()), E.render(!0);
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
Hooks.on("getSceneControlButtons", (g) => {
  const n = g.find((e) => e.name === "token");
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
      E || (E = new v()), E.render(!0);
    }
  }));
});
Hooks.on("updateCombat", async (g, n) => {
  if (!game.user.isGM) return;
  const e = g.combatant;
  if (!e) return;
  const t = k.recordTurnSnapshot(e), a = e.token;
  if (!a) return;
  if (!a.actor?.hasPlayerOwner) {
    const i = k.getTokensInRoom(t?.room, a.id), r = k.getHistoryFor(a.id), m = game.settings.get(o.ID, o.FLAGS.MYSTERY_STATE), d = m?.requiredWeapon, c = m?.roomWeaponLocations?.[d] || null, l = W.planMovement(a, {
      coOccupants: i,
      travelHistory: r,
      targetToolRoom: c
    });
    l.suggestedRoom && l.suggestedRoom !== t?.room && ui.notifications.info(`🧭 ${a.name} (${l.pathReason}): Suggested destination -> ${l.suggestedRoom}`);
  }
  await L.evaluateCrimeOpportunity();
});
Hooks.on("updateToken", async (g, n) => {
  game.user.isGM && ("x" in n || "y" in n) && (k.recordTurnSnapshot(g), await L.evaluateCrimeOpportunity());
});
//# sourceMappingURL=main.js.map
