const a = {
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
class w {
  /**
   * Registers all module settings in Foundry.
   */
  static registerSettings() {
    game.settings.register(a.ID, a.SETTINGS.CO_TRAVEL_PROBABILITY, {
      name: "Co-Travel Probability",
      hint: "Odds (0.0 to 1.0) that an NPC will choose to follow a character sharing their current room.",
      scope: "world",
      config: !0,
      type: Number,
      default: a.DEFAULTS.CO_TRAVEL_PROBABILITY,
      range: { min: 0, max: 1, step: 0.05 }
    }), game.settings.register(a.ID, a.SETTINGS.NOVELTY_WEIGHT, {
      name: "Novelty Room Weighting",
      hint: "Weight factor favoring rooms the NPC has not yet visited during travel.",
      scope: "world",
      config: !0,
      type: Number,
      default: a.DEFAULTS.NOVELTY_WEIGHT,
      range: { min: 0, max: 2, step: 0.1 }
    }), game.settings.register(a.ID, a.SETTINGS.AUTO_EXECUTE_NPC_MOVE, {
      name: "Auto-Execute NPC Moves",
      hint: "If enabled, NPC tokens automatically move along suggested paths when their turn starts.",
      scope: "world",
      config: !0,
      type: Boolean,
      default: a.DEFAULTS.AUTO_EXECUTE_NPC_MOVE
    }), game.settings.register(a.ID, a.FLAGS.MYSTERY_STATE, {
      scope: "world",
      config: !1,
      type: Object,
      default: {
        status: a.STATUS.SETUP,
        killerId: null,
        victimId: null,
        requiredWeapon: null,
        suspects: [],
        weapons: [],
        rooms: [],
        roomWeaponLocations: {},
        solution: null
      }
    }), game.settings.register(a.ID, a.FLAGS.TURN_LOGS, {
      scope: "world",
      config: !1,
      type: Array,
      default: []
    }), game.settings.register(a.ID, a.FLAGS.EVIDENCE_LEDGER, {
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
    return game.user.getFlag(a.ID, a.FLAGS.NOTEBOOK) || o;
  }
  /**
   * Saves player notebook state.
   * @param {Object} data 
   */
  static async savePlayerNotebook(o) {
    await game.user.setFlag(a.ID, a.FLAGS.NOTEBOOK, o);
  }
}
class v {
  /**
   * Identifies which named Room a token or x,y coordinate resides in.
   * @param {TokenDocument|Token|{x: number, y: number}} target - Token or coordinate object
   * @returns {string} Room name or "Corridor / Unknown"
   */
  static getRoomAt(o) {
    if (!canvas?.ready) return "Unknown";
    const e = {
      x: o.x ?? o.center?.x ?? 0,
      y: o.y ?? o.center?.y ?? 0
    };
    if (canvas.regions?.placeables)
      for (const t of canvas.regions.placeables) {
        const n = t.document.name || t.document.label;
        if (!(!n || n.toLowerCase().startsWith("unnamed")) && t.testPoint(e))
          return n;
      }
    if (canvas.drawings?.placeables)
      for (const t of canvas.drawings.placeables) {
        const n = t.document.text?.trim();
        if (!n) continue;
        const s = t.bounds;
        if (e.x >= s.x && e.x <= s.x + s.width && e.y >= s.y && e.y <= s.y + s.height)
          return n;
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
      for (const e of canvas.regions.placeables) {
        const t = e.document.name || e.document.label;
        t && !t.toLowerCase().startsWith("unnamed") && o.add(t);
      }
    if (canvas.drawings?.placeables)
      for (const e of canvas.drawings.placeables) {
        const t = e.document.text?.trim();
        t && o.add(t);
      }
    return o.size === 0 ? ["Library", "Study", "Hall", "Conservatory", "Billiard Room", "Ballroom", "Dining Room", "Kitchen", "Lounge"] : Array.from(o);
  }
}
class I {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(o) {
    if (!canvas?.ready) return null;
    const e = o.token || o;
    if (!e) return null;
    const t = e.id, n = e.name || "Unknown Character", s = v.getRoomAt(e), i = game.combat?.round || 1, r = game.combat?.turn || 0, d = this.getVisibleTokensFor(e), c = this.getTokensInRoom(s, t), l = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round: i,
      turn: r,
      tokenId: t,
      actorName: n,
      room: s,
      coords: { x: Math.round(e.x), y: Math.round(e.y) },
      visibleTokenIds: d.map((m) => m.id),
      visibleTokenNames: d.map((m) => m.name),
      coOccupantNames: c.map((m) => m.name),
      isNPC: !e.actor?.hasPlayerOwner
    };
    return this.appendTurnLog(l), l;
  }
  /**
   * Raycasts vision from source token to all other tokens on scene to test line-of-sight.
   * @param {TokenDocument|Token} sourceToken 
   * @returns {Token[]} Tokens visible to sourceToken
   */
  static getVisibleTokensFor(o) {
    const e = [];
    if (!canvas?.ready) return e;
    const t = o.center || { x: o.x, y: o.y };
    for (const n of canvas.tokens.placeables) {
      if (n.id === o.id || !n.visible) continue;
      const s = n.center || { x: n.x, y: n.y }, i = new Ray(t, s);
      canvas.walls?.checkCollision(i, { type: "sight", mode: "any" }) || e.push(n);
    }
    return e;
  }
  /**
   * Retrieves all active tokens currently occupying a specific room.
   * @param {string} roomName 
   * @param {string} excludeTokenId 
   * @returns {Token[]}
   */
  static getTokensInRoom(o, e = null) {
    return canvas?.ready ? canvas.tokens.placeables.filter((t) => e && t.id === e ? !1 : v.getRoomAt(t) === o) : [];
  }
  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(o) {
    if (!game.user.isGM) return;
    const e = game.settings.get(a.ID, a.FLAGS.TURN_LOGS) || [];
    e.push(o), await game.settings.set(a.ID, a.FLAGS.TURN_LOGS, e);
  }
  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(o) {
    return (game.settings.get(a.ID, a.FLAGS.TURN_LOGS) || []).filter((t) => t.tokenId === o);
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
    const o = v.getAllRooms();
    for (const e of o)
      this.adjacencyMap.set(e, /* @__PURE__ */ new Set());
    for (let e = 0; e < o.length; e++)
      for (let t = e + 1; t < o.length; t++) {
        const n = o[e], s = o[t];
        this.adjacencyMap.get(n).add(s), this.adjacencyMap.get(s).add(n);
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
  getReachableRooms(o, e = 2) {
    const t = /* @__PURE__ */ new Set([o]);
    let n = /* @__PURE__ */ new Set([o]);
    for (let s = 0; s < e; s++) {
      const i = /* @__PURE__ */ new Set();
      for (const r of n) {
        const d = this.getAdjacentRooms(r);
        for (const c of d)
          t.has(c) || (t.add(c), i.add(c));
      }
      n = i;
    }
    return Array.from(t);
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
  planMovement(o, e = {}) {
    const t = v.getRoomAt(o), n = e.coOccupants || [], s = e.travelHistory || [], i = e.targetToolRoom || null, r = game.settings.get(a.ID, a.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5, d = game.settings.get(a.ID, a.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;
    if (n.length > 0 && Math.random() < r) {
      const u = n[Math.floor(Math.random() * n.length)], h = e.partnerDestinations?.[u.id] || null;
      if (h && h !== t)
        return {
          suggestedRoom: h,
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
    const c = this.roomGraph.getReachableRooms(t, 1);
    if (c.length === 0)
      return { suggestedRoom: t, coTraveledWith: null, pathReason: "No reachable rooms" };
    const l = new Set(s.map((u) => u.room)), m = c.map((u) => {
      const h = !l.has(u), O = u === t;
      let M = 1;
      return h ? M += d * 2 : O && (M *= 0.3), { room: u, weight: M };
    }), y = m.reduce((u, h) => u + h.weight, 0);
    let T = Math.random() * y, f = t;
    for (const u of m) {
      if (T <= u.weight) {
        f = u.room;
        break;
      }
      T -= u.weight;
    }
    const g = !l.has(f);
    return {
      suggestedRoom: f,
      coTraveledWith: null,
      pathReason: g ? `Selected novel unvisited room (${f})` : `Exploring adjacent room (${f})`
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
    const o = game.settings.get(a.ID, a.FLAGS.MYSTERY_STATE);
    if (!o || o.status !== a.STATUS.IN_PROGRESS)
      return null;
    const { killerId: e, victimId: t, requiredWeapon: n, roomWeaponLocations: s } = o;
    if (!e || !t) return null;
    const i = canvas.tokens?.get(e), r = canvas.tokens?.get(t);
    if (!i || !r) return null;
    const d = v.getRoomAt(i), c = v.getRoomAt(r);
    if (d !== c || d === "Corridor") return null;
    const l = i.document.getFlag(a.ID, "acquiredTools") || [];
    if (n && !l.includes(n))
      if (s?.[n] === d)
        l.push(n), await i.document.setFlag(a.ID, "acquiredTools", l), ui.notifications.info(`${a.TITLE}: ${i.name} secretly acquired the ${n} in the ${d}!`);
      else
        return null;
    if (I.getVisibleTokensFor(i).filter((T) => T.id !== t).length > 0)
      return null;
    const y = {
      killerName: i.name,
      victimName: r.name,
      weapon: n,
      room: d,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };
    return o.status = a.STATUS.CRIME_COMMITTED, o.solution = y, await game.settings.set(a.ID, a.FLAGS.MYSTERY_STATE, o), ui.notifications.warn(`${a.TITLE}: A foul crime has occurred in the ${d}! The investigation begins!`), r && await r.document.update({ overlayEffect: "icons/svg/skull.svg" }), y;
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
  static generateScenario(o = "lord-hintz") {
    const e = b.find((l) => l.id === o) || b[0], t = b.filter((l) => l.id !== e.id), n = t[Math.floor(Math.random() * t.length)], s = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], i = s[Math.floor(Math.random() * s.length)], r = {};
    for (const l of b)
      r[l.id] = {
        motive: this.MOTIVE_TYPES[Math.floor(Math.random() * this.MOTIVE_TYPES.length)],
        secret: `Holds a secret regarding ${e.name}'s affairs.`
      };
    const d = [], c = [];
    for (let l = 0; l < t.length; l++)
      for (let m = l + 1; m < t.length; m++) {
        const y = Math.random();
        y < 0.15 ? d.push({ char1: t[l].name, char2: t[m].name }) : y > 0.85 && c.push({ char1: t[l].name, char2: t[m].name });
      }
    return {
      killerId: n.id,
      killerName: n.name,
      victimId: e.id,
      victimName: e.name,
      requiredWeapon: i,
      characterMotives: r,
      alliances: d,
      rivalries: c,
      timestamp: Date.now()
    };
  }
}
class H {
  /**
   * Imports a .dd2vtt map file and creates a Foundry Scene.
   * @param {string} sceneName 
   * @param {Object|string} vttData - Parsed JSON object from .dd2vtt
   * @param {string} imagePath - Optional explicit image path (e.g. modules/hintz-manor/assets/maps/Hintz1f.png)
   * @returns {Promise<Scene>} Created Foundry Scene
   */
  static async importMap(o, e, t = null) {
    if (!game.user.isGM) return null;
    const n = typeof e == "string" ? JSON.parse(e) : e, s = n.resolution?.pixels_per_grid || 100, i = n.resolution?.map_size?.x || 30, r = n.resolution?.map_size?.y || 30, d = i * s, c = r * s;
    let l = t;
    !l && n.image && (l = n.image.startsWith("data:") ? n.image : `data:image/png;base64,${n.image}`);
    const m = [];
    if (Array.isArray(n.line_of_sight))
      for (const f of n.line_of_sight)
        for (let g = 0; g < f.length - 1; g++) {
          const u = f[g], h = f[g + 1];
          m.push({
            c: [u.x * s, u.y * s, h.x * s, h.y * s],
            door: 0,
            ds: 0
          });
        }
    if (Array.isArray(n.portals))
      for (const f of n.portals) {
        const g = f.bounds;
        if (g && g.length >= 2) {
          const u = g[0], h = g[1];
          m.push({
            c: [u.x * s, u.y * s, h.x * s, h.y * s],
            door: 1,
            ds: f.closed ? 1 : 0
          });
        }
      }
    const y = {
      name: o,
      width: d,
      height: c,
      padding: 0.1,
      background: {
        src: l
      },
      img: l,
      grid: {
        size: s,
        type: CONST.GRID_TYPES.SQUARE,
        color: "#000000",
        alpha: 0.2
      },
      walls: m,
      tokenVision: !0,
      fogExploration: !0
    }, T = await Scene.create(y);
    return ui.notifications.info(`Hintz Manor: Successfully imported scene "${o}" with background image and ${m.length} walls/doors!`), T;
  }
}
class N {
  /**
   * Determines the valid Actor document type for the active game system.
   * @returns {string} Valid actor type string for active system
   */
  static getValidActorType() {
    if (game.modules?.get("beavers-system-interface")?.active && typeof beaversSystemInterface < "u")
      try {
        const e = beaversSystemInterface.getActorType?.("npc");
        if (e) return e;
      } catch (e) {
        console.warn("Hintz Manor | Error querying Beaver System Interface:", e);
      }
    const o = game.system?.documentTypes?.Actor || [];
    return o.includes("npc") ? "npc" : o.includes("character") ? "character" : o.includes("person") ? "person" : o[0] || "npc";
  }
  /**
   * Imports all 13 NPC Actors into the active Foundry world if they do not exist.
   * @returns {Promise<Actor[]>} Array of created or existing Actors
   */
  static async importAllActors() {
    if (!game.user.isGM) return [];
    const o = this.getValidActorType();
    console.log(`Hintz Manor | System-agnostic Actor creation using type "${o}" for system "${game.system.id}".`);
    const e = [];
    for (const t of b) {
      let n = game.actors.find((s) => s.name === t.name);
      if (!n)
        try {
          n = await Actor.create({
            name: t.name,
            type: o,
            img: t.avatar || "icons/svg/mystery-man.svg",
            flags: {
              "hintz-manor": {
                npcId: t.id,
                role: t.role,
                category: t.category,
                personality: t.personality,
                startingRoom: t.startingRoom
              }
            }
          });
        } catch (s) {
          console.warn(`Hintz Manor | Could not create Actor ${t.name}:`, s);
        }
      n && e.push(n);
    }
    return ui.notifications.info("Hintz Manor: Successfully imported 13 NPC Actors into your Actors Sidebar!"), e;
  }
}
const { ApplicationV2: P, HandlebarsApplicationMixin: F } = foundry.applications.api;
class S extends F(P) {
  constructor(o = {}) {
    super(o), this.activeTab = "setup";
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
  async _prepareContext(o) {
    const e = game.settings.get(a.ID, a.FLAGS.MYSTERY_STATE) || {}, t = game.settings.get(a.ID, a.FLAGS.TURN_LOGS) || [], n = canvas.tokens?.placeables.map((c) => ({ id: c.id, name: c.name })) || [], s = v.getAllRooms(), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], r = b.map((c) => {
      const l = t.filter((g) => g.actorName === c.name), m = Array.from(new Set(l.map((g) => g.room))), y = Array.from(new Set(l.flatMap((g) => g.visibleTokenNames || []))), T = canvas.tokens?.placeables.find((g) => g.name === c.name), f = T ? T.document.getFlag(a.ID, "acquiredTools") || [] : [];
      return {
        name: c.name,
        role: c.role,
        currentRoom: T ? v.getRoomAt(T) : c.startingRoom,
        roomsVisited: m.length > 0 ? m.join(", ") : "None yet",
        seenTokens: y.length > 0 ? y.join(", ") : "No witnesses seen",
        tools: f.length > 0 ? f.join(", ") : "No tools acquired"
      };
    }), d = b.map((c) => {
      const l = e.motives?.[c.id] || { motive: "Unknown", secret: "None" };
      return {
        name: c.name,
        role: c.role,
        isKiller: e.killerId === c.id,
        isVictim: e.victimId === c.id,
        motive: l.motive,
        secret: l.secret
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
      turnLogs: t.slice(-25).reverse(),
      tokens: n,
      npcRoster: b,
      rooms: s,
      defaultWeapons: i,
      isSetup: e.status === a.STATUS.SETUP,
      isInProgress: e.status === a.STATUS.IN_PROGRESS,
      isCrimeCommitted: e.status === a.STATUS.CRIME_COMMITTED
    };
  }
  static async _onSwitchTab(o, e) {
    o.preventDefault(), this.activeTab = e.dataset.tab, this.render();
  }
  static async _onImportActors(o, e) {
    o.preventDefault(), await N.importAllActors(), this.render();
  }
  static async _onInitializeMystery(o, e) {
    o.preventDefault();
    const t = this.element, n = t.querySelector('[name="killerId"]')?.value, s = t.querySelector('[name="victimId"]')?.value, i = t.querySelector('[name="requiredWeapon"]')?.value;
    if (!n || !s || !i) {
      ui.notifications.error(`${a.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }
    const r = v.getAllRooms(), d = {
      [i]: r[Math.floor(Math.random() * r.length)]
    }, c = {
      status: a.STATUS.IN_PROGRESS,
      killerId: n,
      victimId: s,
      requiredWeapon: i,
      rooms: r,
      roomWeaponLocations: d,
      solution: null
    };
    await game.settings.set(a.ID, a.FLAGS.MYSTERY_STATE, c), ui.notifications.info(`${a.TITLE}: Mystery initialized!`), this.render();
  }
  static async _onRandomizeMystery(o, e) {
    o.preventDefault();
    const t = z.generateScenario("lord-hintz"), n = v.getAllRooms(), s = {
      [t.requiredWeapon]: n[Math.floor(Math.random() * n.length)]
    }, i = {
      status: a.STATUS.IN_PROGRESS,
      killerId: t.killerId,
      killerName: t.killerName,
      victimId: t.victimId,
      victimName: t.victimName,
      requiredWeapon: t.requiredWeapon,
      motives: t.characterMotives,
      alliances: t.alliances,
      rivalries: t.rivalries,
      rooms: n,
      roomWeaponLocations: s,
      solution: null
    };
    await N.importAllActors(), await game.settings.set(a.ID, a.FLAGS.MYSTERY_STATE, i), await game.settings.set(a.ID, a.FLAGS.TURN_LOGS, []), ui.notifications.info(`🎲 ${a.TITLE}: Full Game Reset! 13 Actors Imported, Mystery & Motives Randomized!`), this.render();
  }
  static async _onImportOpenVTTMaps(o, e) {
    o.preventDefault(), ui.notifications.info(`${a.TITLE}: Importing pre-built OpenVTT map scenes with background images...`);
    const t = [
      { name: "Hintz Manor 1F (Ground Floor)", file: "modules/hintz-manor/assets/maps/Hintz1f.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz1f.png" },
      { name: "Hintz Manor 2F (Upper Floor)", file: "modules/hintz-manor/assets/maps/Hintz2fa.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz2fa.png" },
      { name: "Hintz Manor Basement", file: "modules/hintz-manor/assets/maps/HintzBasement.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzBasement.png" },
      { name: "Hintz Manor Roof", file: "modules/hintz-manor/assets/maps/HintzRoof.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzRoof.png" }
    ];
    for (const n of t)
      try {
        const s = await fetch(n.file);
        if (s.ok) {
          const i = await s.json();
          await H.importMap(n.name, i, n.img);
        }
      } catch (s) {
        console.warn(`Could not import map ${n.file}:`, s);
      }
  }
  static async _onResetMystery(o, e) {
    o.preventDefault(), await game.settings.set(a.ID, a.FLAGS.MYSTERY_STATE, {
      status: a.STATUS.SETUP,
      killerId: null,
      victimId: null,
      requiredWeapon: null,
      solution: null
    }), await game.settings.set(a.ID, a.FLAGS.TURN_LOGS, []), ui.notifications.info(`${a.TITLE}: Mystery state reset.`), this.render();
  }
}
const { ApplicationV2: U, HandlebarsApplicationMixin: V } = foundry.applications.api;
class A extends V(U) {
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
      toggleElimination: A._onToggleElimination,
      submitAccusation: A._onSubmitAccusation
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/detective-notebook.hbs"
    }
  };
  async _prepareContext(o) {
    const e = w.getPlayerNotebook(), t = game.settings.get(a.ID, a.FLAGS.MYSTERY_STATE) || {}, n = game.settings.get(a.ID, a.FLAGS.TURN_LOGS) || [], s = b.map((m) => m.name), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], r = v.getAllRooms(), d = s.map((m) => ({
      name: m,
      isEliminated: e.eliminatedSuspects?.includes(m)
    })), c = i.map((m) => ({
      name: m,
      isEliminated: e.eliminatedWeapons?.includes(m)
    })), l = r.map((m) => ({
      name: m,
      isEliminated: e.eliminatedRooms?.includes(m)
    }));
    return {
      notebook: e,
      suspectItems: d,
      weaponItems: c,
      roomItems: l,
      turnLogs: n.slice(-20).reverse(),
      isCrimeCommitted: t.status === a.STATUS.CRIME_COMMITTED
    };
  }
  static async _onToggleElimination(o, e) {
    o.preventDefault();
    const t = e.dataset.type, n = e.dataset.name, s = w.getPlayerNotebook(), r = {
      suspect: "eliminatedSuspects",
      weapon: "eliminatedWeapons",
      room: "eliminatedRooms"
    }[t];
    r && (s[r] = s[r] || [], s[r].includes(n) ? s[r] = s[r].filter((d) => d !== n) : s[r].push(n), await w.savePlayerNotebook(s), this.render());
  }
  static async _onSubmitAccusation(o, e) {
    o.preventDefault();
    const t = this.element, n = t.querySelector('[name="accusedSuspect"]')?.value, s = t.querySelector('[name="accusedWeapon"]')?.value, i = t.querySelector('[name="accusedRoom"]')?.value, r = game.settings.get(a.ID, a.FLAGS.MYSTERY_STATE);
    if (!r?.solution) {
      ui.notifications.warn(`${a.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }
    const { killerName: d, weapon: c, room: l } = r.solution;
    n === d && s === c && i === l ? ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${d} committed the crime in the ${l} with the ${c}!`) : ui.notifications.error(`❌ INCORRECT ACCUSATION! ${game.user.name}'s claim was proven false!`);
  }
}
let k = null, C = null;
class L {
  static renderSidebarButtons() {
    const o = document.querySelector("#sidebar-tabs");
    if (o) {
      if (!document.getElementById("hm-sidebar-notebook")) {
        const e = document.createElement("a");
        e.id = "hm-sidebar-notebook", e.className = "item hintz-manor-tab", e.setAttribute("data-tooltip", "Detective Notebook"), e.setAttribute("aria-label", "Detective Notebook"), e.innerHTML = '<i class="fa-solid fa-book-skull"></i>', e.addEventListener("click", (t) => {
          t.preventDefault(), C || (C = new A()), C.render(!0);
        }), o.appendChild(e);
      }
      if (game.user.isGM && !document.getElementById("hm-sidebar-gm")) {
        const e = document.createElement("a");
        e.id = "hm-sidebar-gm", e.className = "item hintz-manor-tab", e.setAttribute("data-tooltip", "GM Mystery Control Center"), e.setAttribute("aria-label", "GM Mystery Control Center"), e.innerHTML = '<i class="fa-solid fa-masks-theater"></i>', e.addEventListener("click", (t) => {
          t.preventDefault(), k || (k = new S()), k.render(!0);
        }), o.appendChild(e);
      }
    }
  }
}
let R = null, E = null;
const W = new D();
Hooks.once("init", () => {
  console.log(`${a.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`), w.registerSettings(), game.hintzManor = {
    openGM: () => {
      R || (R = new S()), R.render(!0);
    },
    openNotebook: () => {
      E || (E = new A()), E.render(!0);
    }
  };
});
Hooks.once("ready", () => {
  console.log(`${a.TITLE} | Ready! Engine active.`), L.renderSidebarButtons(), game.user.isGM && ui.notifications.info(`🔎 ${a.TITLE} Engine Active! Click the right-hand sidebar tab buttons to open GM Control Center.`);
});
Hooks.on("renderSidebar", () => {
  L.renderSidebarButtons();
});
Hooks.on("renderSidebarTab", () => {
  L.renderSidebarButtons();
});
Hooks.on("getSceneControlButtons", (p) => {
  const o = p.find((e) => e.name === "token");
  o && (o.tools.push({
    name: "hintz-manor-notebook",
    title: "Detective Notebook",
    icon: "fa-solid fa-book-skull",
    button: !0,
    onClick: () => {
      E || (E = new A()), E.render(!0);
    }
  }), game.user.isGM && o.tools.push({
    name: "hintz-manor-gm-panel",
    title: "GM Mystery Control Panel",
    icon: "fa-solid fa-masks-theater",
    button: !0,
    onClick: () => {
      R || (R = new S()), R.render(!0);
    }
  }));
});
Hooks.on("updateCombat", async (p, o) => {
  if (!game.user.isGM) return;
  const e = p.combatant;
  if (!e) return;
  const t = I.recordTurnSnapshot(e), n = e.token;
  if (!n) return;
  if (!n.actor?.hasPlayerOwner) {
    const i = I.getTokensInRoom(t?.room, n.id), r = I.getHistoryFor(n.id), d = game.settings.get(a.ID, a.FLAGS.MYSTERY_STATE), c = d?.requiredWeapon, l = d?.roomWeaponLocations?.[c] || null, m = W.planMovement(n, {
      coOccupants: i,
      travelHistory: r,
      targetToolRoom: l
    });
    m.suggestedRoom && m.suggestedRoom !== t?.room && ui.notifications.info(`🧭 ${n.name} (${m.pathReason}): Suggested destination -> ${m.suggestedRoom}`);
  }
  await G.evaluateCrimeOpportunity();
});
Hooks.on("updateToken", async (p, o) => {
  game.user.isGM && ("x" in o || "y" in o) && (I.recordTurnSnapshot(p), await G.evaluateCrimeOpportunity());
});
//# sourceMappingURL=main.js.map
