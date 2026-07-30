const s = {
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
    game.settings.register(s.ID, s.SETTINGS.CO_TRAVEL_PROBABILITY, {
      name: "Co-Travel Probability",
      hint: "Odds (0.0 to 1.0) that an NPC will choose to follow a character sharing their current room.",
      scope: "world",
      config: !0,
      type: Number,
      default: s.DEFAULTS.CO_TRAVEL_PROBABILITY,
      range: { min: 0, max: 1, step: 0.05 }
    }), game.settings.register(s.ID, s.SETTINGS.NOVELTY_WEIGHT, {
      name: "Novelty Room Weighting",
      hint: "Weight factor favoring rooms the NPC has not yet visited during travel.",
      scope: "world",
      config: !0,
      type: Number,
      default: s.DEFAULTS.NOVELTY_WEIGHT,
      range: { min: 0, max: 2, step: 0.1 }
    }), game.settings.register(s.ID, s.SETTINGS.AUTO_EXECUTE_NPC_MOVE, {
      name: "Auto-Execute NPC Moves",
      hint: "If enabled, NPC tokens automatically move along suggested paths when their turn starts.",
      scope: "world",
      config: !0,
      type: Boolean,
      default: s.DEFAULTS.AUTO_EXECUTE_NPC_MOVE
    }), game.settings.register(s.ID, s.FLAGS.MYSTERY_STATE, {
      scope: "world",
      config: !1,
      type: Object,
      default: {
        status: s.STATUS.SETUP,
        killerId: null,
        victimId: null,
        requiredWeapon: null,
        suspects: [],
        weapons: [],
        rooms: [],
        roomWeaponLocations: {},
        solution: null
      }
    }), game.settings.register(s.ID, s.FLAGS.TURN_LOGS, {
      scope: "world",
      config: !1,
      type: Array,
      default: []
    }), game.settings.register(s.ID, s.FLAGS.EVIDENCE_LEDGER, {
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
    return game.user.getFlag(s.ID, s.FLAGS.NOTEBOOK) || o;
  }
  /**
   * Saves player notebook state.
   * @param {Object} data 
   */
  static async savePlayerNotebook(o) {
    await game.user.setFlag(s.ID, s.FLAGS.NOTEBOOK, o);
  }
}
class S {
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
      for (const e of canvas.regions.placeables) {
        const a = e.document.name || e.document.label;
        if (!(!a || a.toLowerCase().startsWith("unnamed")) && e.testPoint(t))
          return a;
      }
    if (canvas.drawings?.placeables)
      for (const e of canvas.drawings.placeables) {
        const a = e.document.text?.trim();
        if (!a) continue;
        const n = e.bounds;
        if (t.x >= n.x && t.x <= n.x + n.width && t.y >= n.y && t.y <= n.y + n.height)
          return a;
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
        const e = t.document.name || t.document.label;
        e && !e.toLowerCase().startsWith("unnamed") && o.add(e);
      }
    if (canvas.drawings?.placeables)
      for (const t of canvas.drawings.placeables) {
        const e = t.document.text?.trim();
        e && o.add(e);
      }
    return o.size === 0 ? ["Library", "Study", "Hall", "Conservatory", "Billiard Room", "Ballroom", "Dining Room", "Kitchen", "Lounge"] : Array.from(o);
  }
}
class k {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(o) {
    if (!canvas?.ready) return null;
    const t = o.token || o;
    if (!t) return null;
    const e = t.id, a = t.name || "Unknown Character", n = S.getRoomAt(t), i = game.combat?.round || 1, c = game.combat?.turn || 0, d = this.getVisibleTokensFor(t), r = this.getTokensInRoom(n, e), l = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round: i,
      turn: c,
      tokenId: e,
      actorName: a,
      room: n,
      coords: { x: Math.round(t.x), y: Math.round(t.y) },
      visibleTokenIds: d.map((m) => m.id),
      visibleTokenNames: d.map((m) => m.name),
      coOccupantNames: r.map((m) => m.name),
      isNPC: !t.actor?.hasPlayerOwner
    };
    return this.appendTurnLog(l), l;
  }
  /**
   * Raycasts vision from source token to all other tokens on scene to test line-of-sight.
   * @param {TokenDocument|Token} sourceToken 
   * @returns {Token[]} Tokens visible to sourceToken
   */
  static getVisibleTokensFor(o) {
    const t = [];
    if (!canvas?.ready) return t;
    const e = o.center || { x: o.x, y: o.y };
    for (const a of canvas.tokens.placeables) {
      if (a.id === o.id || !a.visible) continue;
      const n = a.center || { x: a.x, y: a.y }, i = new Ray(e, n);
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
  static getTokensInRoom(o, t = null) {
    return canvas?.ready ? canvas.tokens.placeables.filter((e) => t && e.id === t ? !1 : S.getRoomAt(e) === o) : [];
  }
  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(o) {
    if (!game.user.isGM) return;
    const t = game.settings.get(s.ID, s.FLAGS.TURN_LOGS) || [];
    t.push(o), await game.settings.set(s.ID, s.FLAGS.TURN_LOGS, t);
  }
  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(o) {
    return (game.settings.get(s.ID, s.FLAGS.TURN_LOGS) || []).filter((e) => e.tokenId === o);
  }
}
class D {
  constructor() {
    this.adjacencyMap = /* @__PURE__ */ new Map();
  }
  /**
   * Initializes or refreshes the room graph based on active scene regions and walls/doors.
   */
  buildGraph() {
    this.adjacencyMap.clear();
    const o = S.getAllRooms();
    for (const t of o)
      this.adjacencyMap.set(t, /* @__PURE__ */ new Set());
    for (let t = 0; t < o.length; t++)
      for (let e = t + 1; e < o.length; e++) {
        const a = o[t], n = o[e];
        this.adjacencyMap.get(a).add(n), this.adjacencyMap.get(n).add(a);
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
    const e = /* @__PURE__ */ new Set([o]);
    let a = /* @__PURE__ */ new Set([o]);
    for (let n = 0; n < t; n++) {
      const i = /* @__PURE__ */ new Set();
      for (const c of a) {
        const d = this.getAdjacentRooms(c);
        for (const r of d)
          e.has(r) || (e.add(r), i.add(r));
      }
      a = i;
    }
    return Array.from(e);
  }
}
class O {
  constructor() {
    this.roomGraph = new D();
  }
  /**
   * Plans the next turn movement for an NPC token based on cascading rules.
   * @param {TokenDocument|Token} npcToken - The NPC token
   * @param {Object} options - Travel context (co-occupants, history, target tools)
   * @returns {Object} { suggestedRoom, coTraveledWith, pathReason }
   */
  planMovement(o, t = {}) {
    const e = S.getRoomAt(o), a = t.coOccupants || [], n = t.travelHistory || [], i = t.targetToolRoom || null, c = game.settings.get(s.ID, s.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5, d = game.settings.get(s.ID, s.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;
    if (a.length > 0 && Math.random() < c) {
      const u = a[Math.floor(Math.random() * a.length)], y = t.partnerDestinations?.[u.id] || null;
      if (y && y !== e)
        return {
          suggestedRoom: y,
          coTraveledWith: u.name,
          pathReason: `Co-traveling with ${u.name} (${Math.round(c * 100)}% odds triggered)`
        };
    }
    if (i && i !== e && this.roomGraph.getAdjacentRooms(e).includes(i))
      return {
        suggestedRoom: i,
        coTraveledWith: null,
        pathReason: `Seeking required crime tool in ${i}`
      };
    const r = this.roomGraph.getReachableRooms(e, 1);
    if (r.length === 0)
      return { suggestedRoom: e, coTraveledWith: null, pathReason: "No reachable rooms" };
    const l = new Set(n.map((u) => u.room)), m = r.map((u) => {
      const y = !l.has(u), _ = u === e;
      let L = 1;
      return y ? L += d * 2 : _ && (L *= 0.3), { room: u, weight: L };
    }), T = m.reduce((u, y) => u + y.weight, 0);
    let v = Math.random() * T, f = e;
    for (const u of m) {
      if (v <= u.weight) {
        f = u.room;
        break;
      }
      v -= u.weight;
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
    const o = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE);
    if (!o || o.status !== s.STATUS.IN_PROGRESS)
      return null;
    const { killerId: t, victimId: e, requiredWeapon: a, roomWeaponLocations: n } = o;
    if (!t || !e) return null;
    const i = canvas.tokens?.get(t), c = canvas.tokens?.get(e);
    if (!i || !c) return null;
    const d = S.getRoomAt(i), r = S.getRoomAt(c);
    if (d !== r || d === "Corridor") return null;
    const l = i.document.getFlag(s.ID, "acquiredTools") || [];
    if (a && !l.includes(a))
      if (n?.[a] === d)
        l.push(a), await i.document.setFlag(s.ID, "acquiredTools", l), ui.notifications.info(`${s.TITLE}: ${i.name} secretly acquired the ${a} in the ${d}!`);
      else
        return null;
    if (k.getVisibleTokensFor(i).filter((v) => v.id !== e).length > 0)
      return null;
    const T = {
      killerName: i.name,
      victimName: c.name,
      weapon: a,
      room: d,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };
    return o.status = s.STATUS.CRIME_COMMITTED, o.solution = T, await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, o), ui.notifications.warn(`${s.TITLE}: A foul crime has occurred in the ${d}! The investigation begins!`), c && await c.document.update({ overlayEffect: "icons/svg/skull.svg" }), T;
  }
}
const E = [
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
class C {
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
    const t = E.find((l) => l.id === o) || E[0], e = E.filter((l) => l.id !== t.id), a = e[Math.floor(Math.random() * e.length)], n = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], i = n[Math.floor(Math.random() * n.length)], c = {};
    for (const l of E)
      c[l.id] = {
        motive: this.MOTIVE_TYPES[Math.floor(Math.random() * this.MOTIVE_TYPES.length)],
        secret: `Holds a secret regarding ${t.name}'s affairs.`
      };
    const d = [], r = [];
    for (let l = 0; l < e.length; l++)
      for (let m = l + 1; m < e.length; m++) {
        const T = Math.random();
        T < 0.15 ? d.push({ char1: e[l].name, char2: e[m].name }) : T > 0.85 && r.push({ char1: e[l].name, char2: e[m].name });
      }
    return {
      killerId: a.id,
      killerName: a.name,
      victimId: t.id,
      victimName: t.name,
      requiredWeapon: i,
      characterMotives: c,
      alliances: d,
      rivalries: r,
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
  static async importMap(o, t, e = null) {
    if (!game.user.isGM) return null;
    const a = typeof t == "string" ? JSON.parse(t) : t, n = a.resolution?.pixels_per_grid || 100, i = a.resolution?.map_size?.x || 30, c = a.resolution?.map_size?.y || 30, d = i * n, r = c * n;
    let l = e;
    !l && a.image && (l = a.image.startsWith("data:") ? a.image : `data:image/png;base64,${a.image}`);
    const m = [];
    if (Array.isArray(a.line_of_sight))
      for (const f of a.line_of_sight)
        for (let g = 0; g < f.length - 1; g++) {
          const u = f[g], y = f[g + 1];
          m.push({
            c: [u.x * n, u.y * n, y.x * n, y.y * n],
            door: 0,
            ds: 0
          });
        }
    if (Array.isArray(a.portals))
      for (const f of a.portals) {
        const g = f.bounds;
        if (g && g.length >= 2) {
          const u = g[0], y = g[1];
          m.push({
            c: [u.x * n, u.y * n, y.x * n, y.y * n],
            door: 1,
            ds: f.closed ? 1 : 0
          });
        }
      }
    const T = {
      name: o,
      width: d,
      height: r,
      padding: 0.1,
      background: {
        src: l
      },
      img: l,
      grid: {
        size: n,
        type: CONST.GRID_TYPES.SQUARE,
        color: "#000000",
        alpha: 0.2
      },
      walls: m,
      tokenVision: !0,
      fogExploration: !0
    }, v = await Scene.create(T);
    return ui.notifications.info(`Hintz Manor: Successfully imported scene "${o}" with background image and ${m.length} walls/doors!`), v;
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
        const t = beaversSystemInterface.getActorType?.("npc");
        if (t) return t;
      } catch (t) {
        console.warn("Hintz Manor | Error querying Beaver System Interface:", t);
      }
    const o = game.system?.documentTypes?.Actor || [];
    return o.includes("npc") ? "npc" : o.includes("character") ? "character" : o.includes("person") ? "person" : o[0] || "npc";
  }
  /**
   * Imports all 13 NPC Actors into the active Foundry world using batch document creation.
   * @returns {Promise<Actor[]>} Array of created Actors
   */
  static async importAllActors() {
    if (!game.user.isGM) return [];
    const o = this.getValidActorType();
    console.log(`Hintz Manor | System-agnostic Actor creation using type "${o}" for system "${game.system.id}".`);
    const t = [];
    for (const e of E)
      game.actors.find((n) => n.name === e.name) || t.push({
        name: e.name,
        type: o,
        img: e.avatar || "icons/svg/mystery-man.svg",
        flags: {
          "hintz-manor": {
            npcId: e.id,
            role: e.role,
            category: e.category,
            personality: e.personality,
            startingRoom: e.startingRoom
          }
        }
      });
    if (t.length > 0)
      try {
        const e = await Actor.createDocuments(t);
        return ui.notifications.info(`Hintz Manor: Successfully imported ${e.length} NPC Actors into your Actors Sidebar!`), e;
      } catch (e) {
        return console.error("Hintz Manor | Error creating Actor documents:", e), ui.notifications.error(`Hintz Manor: Error creating Actors: ${e.message}`), [];
      }
    else
      return ui.notifications.info("Hintz Manor: All 13 NPC Actors are already present in your Actors Sidebar."), [];
  }
}
const { ApplicationV2: z, HandlebarsApplicationMixin: P } = foundry.applications.api;
class h extends P(z) {
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
      switchTab: h._onSwitchTab,
      initializeMystery: h._onInitializeMystery,
      randomizeMystery: h._onRandomizeMystery,
      generateMotives: h._onGenerateMotives,
      importOpenVTTMaps: h._onImportOpenVTTMaps,
      importActors: h._onImportActors,
      resetMystery: h._onResetMystery
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/gm-panel.hbs"
    }
  };
  async _prepareContext(o) {
    let t = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE) || {};
    const e = game.settings.get(s.ID, s.FLAGS.TURN_LOGS) || [];
    if (!t.motives) {
      const r = C.generateScenario("lord-hintz");
      t = {
        ...t,
        killerId: r.killerId,
        killerName: r.killerName,
        victimId: r.victimId,
        victimName: r.victimName,
        requiredWeapon: r.requiredWeapon,
        motives: r.characterMotives,
        alliances: r.alliances,
        rivalries: r.rivalries
      }, await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, t);
    }
    const a = canvas.tokens?.placeables.map((r) => ({ id: r.id, name: r.name })) || [], n = S.getAllRooms(), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], c = E.map((r) => {
      const l = e.filter((g) => g.actorName === r.name), m = Array.from(new Set(l.map((g) => g.room))), T = Array.from(new Set(l.flatMap((g) => g.visibleTokenNames || []))), v = canvas.tokens?.placeables.find((g) => g.name === r.name), f = v ? v.document.getFlag(s.ID, "acquiredTools") || [] : [];
      return {
        name: r.name,
        role: r.role,
        currentRoom: v ? S.getRoomAt(v) : r.startingRoom,
        roomsVisited: m.length > 0 ? m.join(", ") : "None yet",
        seenTokens: T.length > 0 ? T.join(", ") : "No witnesses seen",
        tools: f.length > 0 ? f.join(", ") : "No tools acquired"
      };
    }), d = E.map((r) => {
      const l = t.motives?.[r.id] || { motive: "Secret Alibi", secret: "None" };
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        isKiller: t.killerId === r.id,
        isVictim: t.victimId === r.id,
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
      mysteryState: t,
      motivesList: d,
      npcKnowledge: c,
      alliances: t.alliances || [],
      rivalries: t.rivalries || [],
      turnLogs: e.slice(-25).reverse(),
      tokens: a,
      npcRoster: E,
      rooms: n,
      defaultWeapons: i,
      isSetup: t.status === s.STATUS.SETUP,
      isInProgress: t.status === s.STATUS.IN_PROGRESS,
      isCrimeCommitted: t.status === s.STATUS.CRIME_COMMITTED
    };
  }
  static async _onSwitchTab(o, t) {
    o.preventDefault(), this.activeTab = t.dataset.tab, this.render();
  }
  static async _onImportActors(o, t) {
    o.preventDefault(), await N.importAllActors(), this.render();
  }
  static async _onGenerateMotives(o, t) {
    o.preventDefault();
    const e = C.generateScenario("lord-hintz"), n = {
      ...game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE) || {},
      killerId: e.killerId,
      killerName: e.killerName,
      victimId: e.victimId,
      victimName: e.victimName,
      requiredWeapon: e.requiredWeapon,
      motives: e.characterMotives,
      alliances: e.alliances,
      rivalries: e.rivalries
    };
    await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, n), ui.notifications.info(`🎲 ${s.TITLE}: Motive & Relationship Matrix Initialized and Shuffled!`), this.render();
  }
  static async _onInitializeMystery(o, t) {
    o.preventDefault();
    const e = this.element, a = e.querySelector('[name="killerId"]')?.value, n = e.querySelector('[name="victimId"]')?.value, i = e.querySelector('[name="requiredWeapon"]')?.value;
    if (!a || !n || !i) {
      ui.notifications.error(`${s.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }
    const c = S.getAllRooms(), d = {
      [i]: c[Math.floor(Math.random() * c.length)]
    }, r = {
      status: s.STATUS.IN_PROGRESS,
      killerId: a,
      victimId: n,
      requiredWeapon: i,
      rooms: c,
      roomWeaponLocations: d,
      solution: null
    };
    await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, r), ui.notifications.info(`${s.TITLE}: Mystery initialized!`), this.render();
  }
  static async _onRandomizeMystery(o, t) {
    o.preventDefault();
    const e = C.generateScenario("lord-hintz"), a = S.getAllRooms(), n = {
      [e.requiredWeapon]: a[Math.floor(Math.random() * a.length)]
    }, i = {
      status: s.STATUS.IN_PROGRESS,
      killerId: e.killerId,
      killerName: e.killerName,
      victimId: e.victimId,
      victimName: e.victimName,
      requiredWeapon: e.requiredWeapon,
      motives: e.characterMotives,
      alliances: e.alliances,
      rivalries: e.rivalries,
      rooms: a,
      roomWeaponLocations: n,
      solution: null
    };
    await N.importAllActors(), await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, i), await game.settings.set(s.ID, s.FLAGS.TURN_LOGS, []), ui.notifications.info(`🎲 ${s.TITLE}: Full Game Reset! 13 Actors Imported, Mystery & Motives Randomized!`), this.render();
  }
  static async _onImportOpenVTTMaps(o, t) {
    o.preventDefault(), ui.notifications.info(`${s.TITLE}: Importing pre-built OpenVTT map scenes with background images...`);
    const e = [
      { name: "Hintz Manor 1F (Ground Floor)", file: "modules/hintz-manor/assets/maps/Hintz1f.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz1f.png" },
      { name: "Hintz Manor 2F (Upper Floor)", file: "modules/hintz-manor/assets/maps/Hintz2fa.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz2fa.png" },
      { name: "Hintz Manor Basement", file: "modules/hintz-manor/assets/maps/HintzBasement.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzBasement.png" },
      { name: "Hintz Manor Roof", file: "modules/hintz-manor/assets/maps/HintzRoof.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzRoof.png" }
    ];
    for (const a of e)
      try {
        const n = await fetch(a.file);
        if (n.ok) {
          const i = await n.json();
          await H.importMap(a.name, i, a.img);
        }
      } catch (n) {
        console.warn(`Could not import map ${a.file}:`, n);
      }
  }
  static async _onResetMystery(o, t) {
    o.preventDefault(), await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, {
      status: s.STATUS.SETUP,
      killerId: null,
      victimId: null,
      requiredWeapon: null,
      solution: null
    }), await game.settings.set(s.ID, s.FLAGS.TURN_LOGS, []), ui.notifications.info(`${s.TITLE}: Mystery state reset.`), this.render();
  }
}
const { ApplicationV2: F, HandlebarsApplicationMixin: W } = foundry.applications.api;
class R extends W(F) {
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
      toggleElimination: R._onToggleElimination,
      submitAccusation: R._onSubmitAccusation
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/detective-notebook.hbs"
    }
  };
  async _prepareContext(o) {
    const t = w.getPlayerNotebook(), e = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE) || {}, a = game.settings.get(s.ID, s.FLAGS.TURN_LOGS) || [], n = E.map((m) => m.name), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], c = S.getAllRooms(), d = n.map((m) => ({
      name: m,
      isEliminated: t.eliminatedSuspects?.includes(m)
    })), r = i.map((m) => ({
      name: m,
      isEliminated: t.eliminatedWeapons?.includes(m)
    })), l = c.map((m) => ({
      name: m,
      isEliminated: t.eliminatedRooms?.includes(m)
    }));
    return {
      notebook: t,
      suspectItems: d,
      weaponItems: r,
      roomItems: l,
      turnLogs: a.slice(-20).reverse(),
      isCrimeCommitted: e.status === s.STATUS.CRIME_COMMITTED
    };
  }
  static async _onToggleElimination(o, t) {
    o.preventDefault();
    const e = t.dataset.type, a = t.dataset.name, n = w.getPlayerNotebook(), c = {
      suspect: "eliminatedSuspects",
      weapon: "eliminatedWeapons",
      room: "eliminatedRooms"
    }[e];
    c && (n[c] = n[c] || [], n[c].includes(a) ? n[c] = n[c].filter((d) => d !== a) : n[c].push(a), await w.savePlayerNotebook(n), this.render());
  }
  static async _onSubmitAccusation(o, t) {
    o.preventDefault();
    const e = this.element, a = e.querySelector('[name="accusedSuspect"]')?.value, n = e.querySelector('[name="accusedWeapon"]')?.value, i = e.querySelector('[name="accusedRoom"]')?.value, c = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE);
    if (!c?.solution) {
      ui.notifications.warn(`${s.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }
    const { killerName: d, weapon: r, room: l } = c.solution;
    a === d && n === r && i === l ? ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${d} committed the crime in the ${l} with the ${r}!`) : ui.notifications.error(`❌ INCORRECT ACCUSATION! ${game.user.name}'s claim was proven false!`);
  }
}
let b = null, A = null;
class U {
  static registerHooks() {
    Hooks.on("renderJournalDirectory", (o, t) => {
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const a = e.querySelector(".header-actions") || e.querySelector(".directory-header");
      if (a && !e.querySelector("#hm-journal-notebook-btn")) {
        const n = document.createElement("button");
        n.id = "hm-journal-notebook-btn", n.type = "button", n.className = "hintz-notebook-btn", n.title = "Detective Notebook", n.innerHTML = '<i class="fa-solid fa-book-skull"></i> Notebook', n.addEventListener("click", (i) => {
          i.preventDefault(), A || (A = new R()), A.render(!0);
        }), a.prepend(n);
      }
    }), Hooks.on("renderActorDirectory", (o, t) => {
      if (!game.user.isGM) return;
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const a = e.querySelector(".header-actions") || e.querySelector(".directory-header");
      if (a && !e.querySelector("#hm-actor-gm-btn")) {
        const n = document.createElement("button");
        n.id = "hm-actor-gm-btn", n.type = "button", n.className = "hintz-gm-btn", n.title = "GM Mystery Control Panel", n.innerHTML = '<i class="fa-solid fa-masks-theater"></i> GM Mystery Panel', n.addEventListener("click", (i) => {
          i.preventDefault(), b || (b = new h()), b.render(!0);
        }), a.prepend(n);
      }
    }), Hooks.on("renderSceneDirectory", (o, t) => {
      if (!game.user.isGM) return;
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const a = e.querySelector(".header-actions") || e.querySelector(".directory-header");
      if (a && !e.querySelector("#hm-scene-gm-btn")) {
        const n = document.createElement("button");
        n.id = "hm-scene-gm-btn", n.type = "button", n.className = "hintz-gm-btn", n.title = "GM Mystery Control Panel", n.innerHTML = '<i class="fa-solid fa-masks-theater"></i> GM Mystery Panel', n.addEventListener("click", (i) => {
          i.preventDefault(), b || (b = new h()), b.render(!0);
        }), a.prepend(n);
      }
    }), Hooks.on("renderSettings", (o, t) => {
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const a = e.querySelector("#settings-documentation") || e.querySelector("#settings-game");
      if (a && !e.querySelector("#hm-settings-section")) {
        const n = document.createElement("div");
        n.id = "hm-settings-section", n.style.margin = "0.5rem 0", n.style.display = "flex", n.style.flexDirection = "column", n.style.gap = "0.4rem";
        let i = `
          <button type="button" class="hm-btn-secondary" id="hm-settings-notebook-btn">
            <i class="fa-solid fa-book-skull"></i> Detective Notebook
          </button>
        `;
        game.user.isGM && (i += `
            <button type="button" class="hm-btn-primary" id="hm-settings-gm-btn">
              <i class="fa-solid fa-masks-theater"></i> GM Mystery Control Center
            </button>
          `), n.innerHTML = i, a.before(n), n.querySelector("#hm-settings-notebook-btn")?.addEventListener("click", () => {
          A || (A = new R()), A.render(!0);
        }), n.querySelector("#hm-settings-gm-btn")?.addEventListener("click", () => {
          b || (b = new h()), b.render(!0);
        });
      }
    });
  }
  static renderSidebarButtons() {
  }
}
let I = null, M = null;
const V = new O();
Hooks.once("init", () => {
  console.log(`${s.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`), w.registerSettings(), U.registerHooks(), game.hintzManor = {
    openGM: () => {
      I || (I = new h()), I.render(!0);
    },
    openNotebook: () => {
      M || (M = new R()), M.render(!0);
    }
  };
});
Hooks.once("ready", () => {
  console.log(`${s.TITLE} | Ready! Engine active.`), game.user.isGM && ui.notifications.info(`🔎 ${s.TITLE} Engine Active! Access controls via Journal/Actor sidebar header buttons or Token Controls.`);
});
Hooks.on("getSceneControlButtons", (p) => {
  const o = p.find((t) => t.name === "token");
  o && (o.tools.push({
    name: "hintz-manor-notebook",
    title: "Detective Notebook",
    icon: "fa-solid fa-book-skull",
    button: !0,
    onClick: () => {
      M || (M = new R()), M.render(!0);
    }
  }), game.user.isGM && o.tools.push({
    name: "hintz-manor-gm-panel",
    title: "GM Mystery Control Panel",
    icon: "fa-solid fa-masks-theater",
    button: !0,
    onClick: () => {
      I || (I = new h()), I.render(!0);
    }
  }));
});
Hooks.on("updateCombat", async (p, o) => {
  if (!game.user.isGM) return;
  const t = p.combatant;
  if (!t) return;
  const e = k.recordTurnSnapshot(t), a = t.token;
  if (!a) return;
  if (!a.actor?.hasPlayerOwner) {
    const i = k.getTokensInRoom(e?.room, a.id), c = k.getHistoryFor(a.id), d = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE), r = d?.requiredWeapon, l = d?.roomWeaponLocations?.[r] || null, m = V.planMovement(a, {
      coOccupants: i,
      travelHistory: c,
      targetToolRoom: l
    });
    m.suggestedRoom && m.suggestedRoom !== e?.room && ui.notifications.info(`🧭 ${a.name} (${m.pathReason}): Suggested destination -> ${m.suggestedRoom}`);
  }
  await G.evaluateCrimeOpportunity();
});
Hooks.on("updateToken", async (p, o) => {
  game.user.isGM && ("x" in o || "y" in o) && (k.recordTurnSnapshot(p), await G.evaluateCrimeOpportunity());
});
//# sourceMappingURL=main.js.map
