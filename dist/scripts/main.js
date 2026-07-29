const n = {
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
    game.settings.register(n.ID, n.SETTINGS.CO_TRAVEL_PROBABILITY, {
      name: "Co-Travel Probability",
      hint: "Odds (0.0 to 1.0) that an NPC will choose to follow a character sharing their current room.",
      scope: "world",
      config: !0,
      type: Number,
      default: n.DEFAULTS.CO_TRAVEL_PROBABILITY,
      range: { min: 0, max: 1, step: 0.05 }
    }), game.settings.register(n.ID, n.SETTINGS.NOVELTY_WEIGHT, {
      name: "Novelty Room Weighting",
      hint: "Weight factor favoring rooms the NPC has not yet visited during travel.",
      scope: "world",
      config: !0,
      type: Number,
      default: n.DEFAULTS.NOVELTY_WEIGHT,
      range: { min: 0, max: 2, step: 0.1 }
    }), game.settings.register(n.ID, n.SETTINGS.AUTO_EXECUTE_NPC_MOVE, {
      name: "Auto-Execute NPC Moves",
      hint: "If enabled, NPC tokens automatically move along suggested paths when their turn starts.",
      scope: "world",
      config: !0,
      type: Boolean,
      default: n.DEFAULTS.AUTO_EXECUTE_NPC_MOVE
    }), game.settings.register(n.ID, n.FLAGS.MYSTERY_STATE, {
      scope: "world",
      config: !1,
      type: Object,
      default: {
        status: n.STATUS.SETUP,
        killerId: null,
        victimId: null,
        requiredWeapon: null,
        suspects: [],
        weapons: [],
        rooms: [],
        roomWeaponLocations: {},
        solution: null
      }
    }), game.settings.register(n.ID, n.FLAGS.TURN_LOGS, {
      scope: "world",
      config: !1,
      type: Array,
      default: []
    }), game.settings.register(n.ID, n.FLAGS.EVIDENCE_LEDGER, {
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
    const t = { eliminatedSuspects: [], eliminatedWeapons: [], eliminatedRooms: [], notes: "" };
    return game.user.getFlag(n.ID, n.FLAGS.NOTEBOOK) || t;
  }
  /**
   * Saves player notebook state.
   * @param {Object} data 
   */
  static async savePlayerNotebook(t) {
    await game.user.setFlag(n.ID, n.FLAGS.NOTEBOOK, t);
  }
}
class v {
  /**
   * Identifies which named Room a token or x,y coordinate resides in.
   * @param {TokenDocument|Token|{x: number, y: number}} target - Token or coordinate object
   * @returns {string} Room name or "Corridor / Unknown"
   */
  static getRoomAt(t) {
    if (!canvas?.ready) return "Unknown";
    const e = {
      x: t.x ?? t.center?.x ?? 0,
      y: t.y ?? t.center?.y ?? 0
    };
    if (canvas.regions?.placeables)
      for (const o of canvas.regions.placeables) {
        const a = o.document.name || o.document.label;
        if (!(!a || a.toLowerCase().startsWith("unnamed")) && o.testPoint(e))
          return a;
      }
    if (canvas.drawings?.placeables)
      for (const o of canvas.drawings.placeables) {
        const a = o.document.text?.trim();
        if (!a) continue;
        const s = o.bounds;
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
    const t = /* @__PURE__ */ new Set();
    if (!canvas?.ready) return Array.from(t);
    if (canvas.regions?.placeables)
      for (const e of canvas.regions.placeables) {
        const o = e.document.name || e.document.label;
        o && !o.toLowerCase().startsWith("unnamed") && t.add(o);
      }
    if (canvas.drawings?.placeables)
      for (const e of canvas.drawings.placeables) {
        const o = e.document.text?.trim();
        o && t.add(o);
      }
    return t.size === 0 ? ["Library", "Study", "Hall", "Conservatory", "Billiard Room", "Ballroom", "Dining Room", "Kitchen", "Lounge"] : Array.from(t);
  }
}
class A {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(t) {
    if (!canvas?.ready) return null;
    const e = t.token || t;
    if (!e) return null;
    const o = e.id, a = e.name || "Unknown Character", s = v.getRoomAt(e), i = game.combat?.round || 1, r = game.combat?.turn || 0, d = this.getVisibleTokensFor(e), l = this.getTokensInRoom(s, o), m = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round: i,
      turn: r,
      tokenId: o,
      actorName: a,
      room: s,
      coords: { x: Math.round(e.x), y: Math.round(e.y) },
      visibleTokenIds: d.map((c) => c.id),
      visibleTokenNames: d.map((c) => c.name),
      coOccupantNames: l.map((c) => c.name),
      isNPC: !e.actor?.hasPlayerOwner
    };
    return this.appendTurnLog(m), m;
  }
  /**
   * Raycasts vision from source token to all other tokens on scene to test line-of-sight.
   * @param {TokenDocument|Token} sourceToken 
   * @returns {Token[]} Tokens visible to sourceToken
   */
  static getVisibleTokensFor(t) {
    const e = [];
    if (!canvas?.ready) return e;
    const o = t.center || { x: t.x, y: t.y };
    for (const a of canvas.tokens.placeables) {
      if (a.id === t.id || !a.visible) continue;
      const s = a.center || { x: a.x, y: a.y }, i = new Ray(o, s);
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
  static getTokensInRoom(t, e = null) {
    return canvas?.ready ? canvas.tokens.placeables.filter((o) => e && o.id === e ? !1 : v.getRoomAt(o) === t) : [];
  }
  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(t) {
    if (!game.user.isGM) return;
    const e = game.settings.get(n.ID, n.FLAGS.TURN_LOGS) || [];
    e.push(t), await game.settings.set(n.ID, n.FLAGS.TURN_LOGS, e);
  }
  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(t) {
    return (game.settings.get(n.ID, n.FLAGS.TURN_LOGS) || []).filter((o) => o.tokenId === t);
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
    const t = v.getAllRooms();
    for (const e of t)
      this.adjacencyMap.set(e, /* @__PURE__ */ new Set());
    for (let e = 0; e < t.length; e++)
      for (let o = e + 1; o < t.length; o++) {
        const a = t[e], s = t[o];
        this.adjacencyMap.get(a).add(s), this.adjacencyMap.get(s).add(a);
      }
  }
  /**
   * Gets adjacent connected rooms for a given room.
   * @param {string} roomName 
   * @returns {string[]}
   */
  getAdjacentRooms(t) {
    return this.adjacencyMap.has(t) || this.buildGraph(), Array.from(this.adjacencyMap.get(t) || []);
  }
  /**
   * Calculates rooms reachable within a given maximum step distance.
   * @param {string} currentRoom 
   * @param {number} maxDistance 
   * @returns {string[]}
   */
  getReachableRooms(t, e = 2) {
    const o = /* @__PURE__ */ new Set([t]);
    let a = /* @__PURE__ */ new Set([t]);
    for (let s = 0; s < e; s++) {
      const i = /* @__PURE__ */ new Set();
      for (const r of a) {
        const d = this.getAdjacentRooms(r);
        for (const l of d)
          o.has(l) || (o.add(l), i.add(l));
      }
      a = i;
    }
    return Array.from(o);
  }
}
class D {
  constructor() {
    this.roomGraph = new _();
  }
  /**
   * Plans the next turn movement for an NPC token based on cascading rules.
   * @param {TokenDocument|Token} npcToken - The NPC token
   * @param {Object} options - Travel context (co-occupants, history, target tools)
   * @returns {Object} { suggestedRoom, coTraveledWith, pathReason }
   */
  planMovement(t, e = {}) {
    const o = v.getRoomAt(t), a = e.coOccupants || [], s = e.travelHistory || [], i = e.targetToolRoom || null, r = game.settings.get(n.ID, n.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5, d = game.settings.get(n.ID, n.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;
    if (a.length > 0 && Math.random() < r) {
      const u = a[Math.floor(Math.random() * a.length)], f = e.partnerDestinations?.[u.id] || null;
      if (f && f !== o)
        return {
          suggestedRoom: f,
          coTraveledWith: u.name,
          pathReason: `Co-traveling with ${u.name} (${Math.round(r * 100)}% odds triggered)`
        };
    }
    if (i && i !== o && this.roomGraph.getAdjacentRooms(o).includes(i))
      return {
        suggestedRoom: i,
        coTraveledWith: null,
        pathReason: `Seeking required crime tool in ${i}`
      };
    const l = this.roomGraph.getReachableRooms(o, 1);
    if (l.length === 0)
      return { suggestedRoom: o, coTraveledWith: null, pathReason: "No reachable rooms" };
    const m = new Set(s.map((u) => u.room)), c = l.map((u) => {
      const f = !m.has(u), N = u === o;
      let w = 1;
      return f ? w += d * 2 : N && (w *= 0.3), { room: u, weight: w };
    }), y = c.reduce((u, f) => u + f.weight, 0);
    let T = Math.random() * y, h = o;
    for (const u of c) {
      if (T <= u.weight) {
        h = u.room;
        break;
      }
      T -= u.weight;
    }
    const g = !m.has(h);
    return {
      suggestedRoom: h,
      coTraveledWith: null,
      pathReason: g ? `Selected novel unvisited room (${h})` : `Exploring adjacent room (${h})`
    };
  }
}
class G {
  /**
   * Evaluates if any NPC has met the isolation & tool criteria to commit the crime.
   * @returns {Object|null} Triggered crime result or null
   */
  static async evaluateCrimeOpportunity() {
    if (!game.user.isGM) return null;
    const t = game.settings.get(n.ID, n.FLAGS.MYSTERY_STATE);
    if (!t || t.status !== n.STATUS.IN_PROGRESS)
      return null;
    const { killerId: e, victimId: o, requiredWeapon: a, roomWeaponLocations: s } = t;
    if (!e || !o) return null;
    const i = canvas.tokens?.get(e), r = canvas.tokens?.get(o);
    if (!i || !r) return null;
    const d = v.getRoomAt(i), l = v.getRoomAt(r);
    if (d !== l || d === "Corridor") return null;
    const m = i.document.getFlag(n.ID, "acquiredTools") || [];
    if (a && !m.includes(a))
      if (s?.[a] === d)
        m.push(a), await i.document.setFlag(n.ID, "acquiredTools", m), ui.notifications.info(`${n.TITLE}: ${i.name} secretly acquired the ${a} in the ${d}!`);
      else
        return null;
    if (A.getVisibleTokensFor(i).filter((T) => T.id !== o).length > 0)
      return null;
    const y = {
      killerName: i.name,
      victimName: r.name,
      weapon: a,
      room: d,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };
    return t.status = n.STATUS.CRIME_COMMITTED, t.solution = y, await game.settings.set(n.ID, n.FLAGS.MYSTERY_STATE, t), ui.notifications.warn(`${n.TITLE}: A foul crime has occurred in the ${d}! The investigation begins!`), r && await r.document.update({ overlayEffect: "icons/svg/skull.svg" }), y;
  }
}
const b = [
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
class z {
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
  static generateScenario(t = "lord-hintz") {
    const e = b.find((m) => m.id === t) || b[0], o = b.filter((m) => m.id !== e.id), a = o[Math.floor(Math.random() * o.length)], s = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], i = s[Math.floor(Math.random() * s.length)], r = {};
    for (const m of b)
      r[m.id] = {
        motive: this.MOTIVE_TYPES[Math.floor(Math.random() * this.MOTIVE_TYPES.length)],
        secret: `Holds a secret regarding ${e.name}'s affairs.`
      };
    const d = [], l = [];
    for (let m = 0; m < o.length; m++)
      for (let c = m + 1; c < o.length; c++) {
        const y = Math.random();
        y < 0.15 ? d.push({ char1: o[m].name, char2: o[c].name }) : y > 0.85 && l.push({ char1: o[m].name, char2: o[c].name });
      }
    return {
      killerId: a.id,
      killerName: a.name,
      victimId: e.id,
      victimName: e.name,
      requiredWeapon: i,
      characterMotives: r,
      alliances: d,
      rivalries: l,
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
  static async importMap(t, e, o = null) {
    if (!game.user.isGM) return null;
    const a = typeof e == "string" ? JSON.parse(e) : e, s = a.resolution?.pixels_per_grid || 100, i = a.resolution?.map_size?.x || 30, r = a.resolution?.map_size?.y || 30, d = i * s, l = r * s;
    let m = o;
    !m && a.image && (m = a.image.startsWith("data:") ? a.image : `data:image/png;base64,${a.image}`);
    const c = [];
    if (Array.isArray(a.line_of_sight))
      for (const h of a.line_of_sight)
        for (let g = 0; g < h.length - 1; g++) {
          const u = h[g], f = h[g + 1];
          c.push({
            c: [u.x * s, u.y * s, f.x * s, f.y * s],
            door: 0,
            ds: 0
          });
        }
    if (Array.isArray(a.portals))
      for (const h of a.portals) {
        const g = h.bounds;
        if (g && g.length >= 2) {
          const u = g[0], f = g[1];
          c.push({
            c: [u.x * s, u.y * s, f.x * s, f.y * s],
            door: 1,
            ds: h.closed ? 1 : 0
          });
        }
      }
    const y = {
      name: t,
      width: d,
      height: l,
      padding: 0.1,
      background: {
        src: m
      },
      grid: {
        size: s,
        type: CONST.GRID_TYPES.SQUARE,
        color: "#000000",
        alpha: 0.2
      },
      walls: c,
      tokenVision: !0,
      fogExploration: !0
    }, T = await Scene.create(y);
    return ui.notifications.info(`Hintz Manor: Successfully imported scene "${t}" with background image and ${c.length} walls/doors!`), T;
  }
}
class L {
  /**
   * Imports all 13 NPC Actors into the active Foundry world if they do not exist.
   * @returns {Promise<Actor[]>} Array of created or existing Actors
   */
  static async importAllActors() {
    if (!game.user.isGM) return [];
    const t = [];
    for (const e of b) {
      let o = game.actors.find((a) => a.name === e.name);
      o || (o = await Actor.create({
        name: e.name,
        type: "npc",
        img: e.avatar || "icons/svg/mystery-man.svg",
        system: {
          details: {
            biography: { value: e.bio },
            notes: `${e.title} | ${e.role}`
          }
        },
        flags: {
          "hintz-manor": {
            npcId: e.id,
            role: e.role,
            category: e.category,
            personality: e.personality,
            startingRoom: e.startingRoom
          }
        }
      }), ui.notifications.info(`Hintz Manor: Imported Actor "${e.name}" into world.`)), t.push(o);
    }
    return t;
  }
}
const { ApplicationV2: H, HandlebarsApplicationMixin: U } = foundry.applications.api;
class S extends U(H) {
  constructor(t = {}) {
    super(t), this.activeTab = "setup";
  }
  static DEFAULT_OPTIONS = {
    id: "hintz-manor-gm-panel",
    tag: "form",
    window: {
      title: "Hintz Manor - GM Control Center",
      icon: "fa-solid fa-masks-theater",
      resizable: !0
    },
    position: {
      width: 780,
      height: 680
    },
    actions: {
      switchTab: S._onSwitchTab,
      initializeMystery: S._onInitializeMystery,
      randomizeMystery: S._onRandomizeMystery,
      importOpenVTTMaps: S._onImportOpenVTTMaps,
      importActors: S._onImportActors,
      resetMystery: S._onResetMystery
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/gm-panel.hbs"
    }
  };
  async _prepareContext(t) {
    const e = game.settings.get(n.ID, n.FLAGS.MYSTERY_STATE) || {}, o = game.settings.get(n.ID, n.FLAGS.TURN_LOGS) || [], a = canvas.tokens?.placeables.map((l) => ({ id: l.id, name: l.name })) || [], s = v.getAllRooms(), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], r = b.map((l) => {
      const m = o.filter((g) => g.actorName === l.name), c = Array.from(new Set(m.map((g) => g.room))), y = Array.from(new Set(m.flatMap((g) => g.visibleTokenNames || []))), T = canvas.tokens?.placeables.find((g) => g.name === l.name), h = T ? T.document.getFlag(n.ID, "acquiredTools") || [] : [];
      return {
        name: l.name,
        role: l.role,
        currentRoom: T ? v.getRoomAt(T) : l.startingRoom,
        roomsVisited: c.length > 0 ? c.join(", ") : "None yet",
        seenTokens: y.length > 0 ? y.join(", ") : "No witnesses seen",
        tools: h.length > 0 ? h.join(", ") : "No tools acquired"
      };
    }), d = b.map((l) => {
      const m = e.motives?.[l.id] || { motive: "Unknown", secret: "None" };
      return {
        name: l.name,
        role: l.role,
        isKiller: e.killerId === l.id,
        isVictim: e.victimId === l.id,
        motive: m.motive,
        secret: m.secret
      };
    });
    return {
      activeTab: this.activeTab,
      isSetupTab: this.activeTab === "setup",
      isMotivesTab: this.activeTab === "motives",
      isKnowledgeTab: this.activeTab === "knowledge",
      isRosterTab: this.activeTab === "roster",
      mysteryState: e,
      motivesList: d,
      npcKnowledge: r,
      alliances: e.alliances || [],
      rivalries: e.rivalries || [],
      turnLogs: o.slice(-25).reverse(),
      tokens: a,
      npcRoster: b,
      rooms: s,
      defaultWeapons: i,
      isSetup: e.status === n.STATUS.SETUP,
      isInProgress: e.status === n.STATUS.IN_PROGRESS,
      isCrimeCommitted: e.status === n.STATUS.CRIME_COMMITTED
    };
  }
  static async _onSwitchTab(t, e) {
    t.preventDefault(), this.activeTab = e.dataset.tab, this.render();
  }
  static async _onImportActors(t, e) {
    t.preventDefault(), await L.importAllActors(), this.render();
  }
  static async _onInitializeMystery(t, e) {
    t.preventDefault();
    const o = this.element, a = o.querySelector('[name="killerId"]')?.value, s = o.querySelector('[name="victimId"]')?.value, i = o.querySelector('[name="requiredWeapon"]')?.value;
    if (!a || !s || !i) {
      ui.notifications.error(`${n.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }
    const r = v.getAllRooms(), d = {
      [i]: r[Math.floor(Math.random() * r.length)]
    }, l = {
      status: n.STATUS.IN_PROGRESS,
      killerId: a,
      victimId: s,
      requiredWeapon: i,
      rooms: r,
      roomWeaponLocations: d,
      solution: null
    };
    await game.settings.set(n.ID, n.FLAGS.MYSTERY_STATE, l), ui.notifications.info(`${n.TITLE}: Mystery initialized!`), this.render();
  }
  static async _onRandomizeMystery(t, e) {
    t.preventDefault();
    const o = z.generateScenario("lord-hintz"), a = v.getAllRooms(), s = {
      [o.requiredWeapon]: a[Math.floor(Math.random() * a.length)]
    }, i = {
      status: n.STATUS.IN_PROGRESS,
      killerId: o.killerId,
      killerName: o.killerName,
      victimId: o.victimId,
      victimName: o.victimName,
      requiredWeapon: o.requiredWeapon,
      motives: o.characterMotives,
      alliances: o.alliances,
      rivalries: o.rivalries,
      rooms: a,
      roomWeaponLocations: s,
      solution: null
    };
    await L.importAllActors(), await game.settings.set(n.ID, n.FLAGS.MYSTERY_STATE, i), await game.settings.set(n.ID, n.FLAGS.TURN_LOGS, []), ui.notifications.info(`🎲 ${n.TITLE}: Full Game Reset! 13 Actors Imported, Mystery & Motives Randomized!`), this.render();
  }
  static async _onImportOpenVTTMaps(t, e) {
    t.preventDefault(), ui.notifications.info(`${n.TITLE}: Importing pre-built OpenVTT map scenes with background images...`);
    const o = [
      { name: "Hintz Manor 1F (Ground Floor)", file: "modules/hintz-manor/assets/maps/Hintz1f.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz1f.png" },
      { name: "Hintz Manor 2F (Upper Floor)", file: "modules/hintz-manor/assets/maps/Hintz2fa.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz2fa.png" },
      { name: "Hintz Manor Basement", file: "modules/hintz-manor/assets/maps/HintzBasement.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzBasement.png" },
      { name: "Hintz Manor Roof", file: "modules/hintz-manor/assets/maps/HintzRoof.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzRoof.png" }
    ];
    for (const a of o)
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
  static async _onResetMystery(t, e) {
    t.preventDefault(), await game.settings.set(n.ID, n.FLAGS.MYSTERY_STATE, {
      status: n.STATUS.SETUP,
      killerId: null,
      victimId: null,
      requiredWeapon: null,
      solution: null
    }), await game.settings.set(n.ID, n.FLAGS.TURN_LOGS, []), ui.notifications.info(`${n.TITLE}: Mystery state reset.`), this.render();
  }
}
const { ApplicationV2: F, HandlebarsApplicationMixin: V } = foundry.applications.api;
class I extends V(F) {
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
  async _prepareContext(t) {
    const e = k.getPlayerNotebook(), o = game.settings.get(n.ID, n.FLAGS.MYSTERY_STATE) || {}, a = game.settings.get(n.ID, n.FLAGS.TURN_LOGS) || [], s = b.map((c) => c.name), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], r = v.getAllRooms(), d = s.map((c) => ({
      name: c,
      isEliminated: e.eliminatedSuspects?.includes(c)
    })), l = i.map((c) => ({
      name: c,
      isEliminated: e.eliminatedWeapons?.includes(c)
    })), m = r.map((c) => ({
      name: c,
      isEliminated: e.eliminatedRooms?.includes(c)
    }));
    return {
      notebook: e,
      suspectItems: d,
      weaponItems: l,
      roomItems: m,
      turnLogs: a.slice(-20).reverse(),
      isCrimeCommitted: o.status === n.STATUS.CRIME_COMMITTED
    };
  }
  static async _onToggleElimination(t, e) {
    t.preventDefault();
    const o = e.dataset.type, a = e.dataset.name, s = k.getPlayerNotebook(), r = {
      suspect: "eliminatedSuspects",
      weapon: "eliminatedWeapons",
      room: "eliminatedRooms"
    }[o];
    r && (s[r] = s[r] || [], s[r].includes(a) ? s[r] = s[r].filter((d) => d !== a) : s[r].push(a), await k.savePlayerNotebook(s), this.render());
  }
  static async _onSubmitAccusation(t, e) {
    t.preventDefault();
    const o = this.element, a = o.querySelector('[name="accusedSuspect"]')?.value, s = o.querySelector('[name="accusedWeapon"]')?.value, i = o.querySelector('[name="accusedRoom"]')?.value, r = game.settings.get(n.ID, n.FLAGS.MYSTERY_STATE);
    if (!r?.solution) {
      ui.notifications.warn(`${n.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }
    const { killerName: d, weapon: l, room: m } = r.solution;
    a === d && s === l && i === m ? ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${d} committed the crime in the ${m} with the ${l}!`) : ui.notifications.error(`❌ INCORRECT ACCUSATION! ${game.user.name}'s claim was proven false!`);
  }
}
let M = null, C = null;
class O {
  static renderDock() {
    if (document.getElementById("hintz-manor-dock")) return;
    const t = document.createElement("div");
    t.id = "hintz-manor-dock";
    let e = `
      <button type="button" class="hm-dock-btn" id="hm-dock-notebook" title="Open Detective Notebook">
        <i class="fa-solid fa-book-skull"></i> Notebook
      </button>
    `;
    game.user.isGM && (e += `
        <button type="button" class="hm-dock-btn" id="hm-dock-gm" title="Open GM Control Center">
          <i class="fa-solid fa-masks-theater"></i> GM Mystery Panel
        </button>
      `), t.innerHTML = e, document.body.appendChild(t), t.querySelector("#hm-dock-notebook")?.addEventListener("click", () => {
      C || (C = new I()), C.render(!0);
    }), t.querySelector("#hm-dock-gm")?.addEventListener("click", () => {
      M || (M = new S()), M.render(!0);
    });
  }
}
let R = null, E = null;
const W = new D();
Hooks.once("init", () => {
  console.log(`${n.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`), k.registerSettings(), game.hintzManor = {
    openGM: () => {
      R || (R = new S()), R.render(!0);
    },
    openNotebook: () => {
      E || (E = new I()), E.render(!0);
    }
  };
});
Hooks.once("ready", () => {
  console.log(`${n.TITLE} | Ready! Engine active.`), O.renderDock(), game.user.isGM && ui.notifications.info(`🔎 ${n.TITLE} Engine Active! Use the top-right screen buttons or Token Controls to open GM Control Center.`);
});
Hooks.on("renderSceneControls", () => {
  O.renderDock();
});
Hooks.on("getSceneControlButtons", (p) => {
  const t = p.find((e) => e.name === "token");
  t && (t.tools.push({
    name: "hintz-manor-notebook",
    title: "Detective Notebook",
    icon: "fa-solid fa-book-skull",
    button: !0,
    onClick: () => {
      E || (E = new I()), E.render(!0);
    }
  }), game.user.isGM && t.tools.push({
    name: "hintz-manor-gm-panel",
    title: "GM Mystery Control Panel",
    icon: "fa-solid fa-masks-theater",
    button: !0,
    onClick: () => {
      R || (R = new S()), R.render(!0);
    }
  }));
});
Hooks.on("updateCombat", async (p, t) => {
  if (!game.user.isGM) return;
  const e = p.combatant;
  if (!e) return;
  const o = A.recordTurnSnapshot(e), a = e.token;
  if (!a) return;
  if (!a.actor?.hasPlayerOwner) {
    const i = A.getTokensInRoom(o?.room, a.id), r = A.getHistoryFor(a.id), d = game.settings.get(n.ID, n.FLAGS.MYSTERY_STATE), l = d?.requiredWeapon, m = d?.roomWeaponLocations?.[l] || null, c = W.planMovement(a, {
      coOccupants: i,
      travelHistory: r,
      targetToolRoom: m
    });
    c.suggestedRoom && c.suggestedRoom !== o?.room && ui.notifications.info(`🧭 ${a.name} (${c.pathReason}): Suggested destination -> ${c.suggestedRoom}`);
  }
  await G.evaluateCrimeOpportunity();
});
Hooks.on("updateToken", async (p, t) => {
  game.user.isGM && ("x" in t || "y" in t) && (A.recordTurnSnapshot(p), await G.evaluateCrimeOpportunity());
});
//# sourceMappingURL=main.js.map
