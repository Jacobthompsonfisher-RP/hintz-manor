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
    const a = { eliminatedSuspects: [], eliminatedWeapons: [], eliminatedRooms: [], notes: "" };
    return game.user.getFlag(s.ID, s.FLAGS.NOTEBOOK) || a;
  }
  /**
   * Saves player notebook state.
   * @param {Object} data 
   */
  static async savePlayerNotebook(a) {
    await game.user.setFlag(s.ID, s.FLAGS.NOTEBOOK, a);
  }
}
class S {
  /**
   * Identifies which named Room a token or x,y coordinate resides in.
   * @param {TokenDocument|Token|{x: number, y: number}} target - Token or coordinate object
   * @returns {string} Room name or "Corridor / Unknown"
   */
  static getRoomAt(a) {
    if (!canvas?.ready) return "Unknown";
    const t = {
      x: a.x ?? a.center?.x ?? 0,
      y: a.y ?? a.center?.y ?? 0
    };
    if (canvas.regions?.placeables)
      for (const e of canvas.regions.placeables) {
        const o = e.document.name || e.document.label;
        if (!(!o || o.toLowerCase().startsWith("unnamed")) && e.testPoint(t))
          return o;
      }
    if (canvas.drawings?.placeables)
      for (const e of canvas.drawings.placeables) {
        const o = e.document.text?.trim();
        if (!o) continue;
        const n = e.bounds;
        if (t.x >= n.x && t.x <= n.x + n.width && t.y >= n.y && t.y <= n.y + n.height)
          return o;
      }
    return "Corridor";
  }
  /**
   * Retrieves all defined Room names on the active scene.
   * @returns {string[]} List of room names
   */
  static getAllRooms() {
    const a = /* @__PURE__ */ new Set();
    if (!canvas?.ready) return Array.from(a);
    if (canvas.regions?.placeables)
      for (const t of canvas.regions.placeables) {
        const e = t.document.name || t.document.label;
        e && !e.toLowerCase().startsWith("unnamed") && a.add(e);
      }
    if (canvas.drawings?.placeables)
      for (const t of canvas.drawings.placeables) {
        const e = t.document.text?.trim();
        e && a.add(e);
      }
    return a.size === 0 ? ["Library", "Study", "Hall", "Conservatory", "Billiard Room", "Ballroom", "Dining Room", "Kitchen", "Lounge"] : Array.from(a);
  }
}
class k {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(a) {
    if (!canvas?.ready) return null;
    const t = a.token || a;
    if (!t) return null;
    const e = t.id, o = t.name || "Unknown Character", n = S.getRoomAt(t), i = game.combat?.round || 1, c = game.combat?.turn || 0, d = this.getVisibleTokensFor(t), r = this.getTokensInRoom(n, e), l = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round: i,
      turn: c,
      tokenId: e,
      actorName: o,
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
  static getVisibleTokensFor(a) {
    const t = [];
    if (!canvas?.ready) return t;
    const e = a.center || { x: a.x, y: a.y };
    for (const o of canvas.tokens.placeables) {
      if (o.id === a.id || !o.visible) continue;
      const n = o.center || { x: o.x, y: o.y }, i = new Ray(e, n);
      canvas.walls?.checkCollision(i, { type: "sight", mode: "any" }) || t.push(o);
    }
    return t;
  }
  /**
   * Retrieves all active tokens currently occupying a specific room.
   * @param {string} roomName 
   * @param {string} excludeTokenId 
   * @returns {Token[]}
   */
  static getTokensInRoom(a, t = null) {
    return canvas?.ready ? canvas.tokens.placeables.filter((e) => t && e.id === t ? !1 : S.getRoomAt(e) === a) : [];
  }
  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(a) {
    if (!game.user.isGM) return;
    const t = game.settings.get(s.ID, s.FLAGS.TURN_LOGS) || [];
    t.push(a), await game.settings.set(s.ID, s.FLAGS.TURN_LOGS, t);
  }
  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(a) {
    return (game.settings.get(s.ID, s.FLAGS.TURN_LOGS) || []).filter((e) => e.tokenId === a);
  }
}
class O {
  constructor() {
    this.adjacencyMap = /* @__PURE__ */ new Map();
  }
  /**
   * Initializes or refreshes the room graph based on active scene regions and walls/doors.
   */
  buildGraph() {
    this.adjacencyMap.clear();
    const a = S.getAllRooms();
    for (const t of a)
      this.adjacencyMap.set(t, /* @__PURE__ */ new Set());
    for (let t = 0; t < a.length; t++)
      for (let e = t + 1; e < a.length; e++) {
        const o = a[t], n = a[e];
        this.adjacencyMap.get(o).add(n), this.adjacencyMap.get(n).add(o);
      }
  }
  /**
   * Gets adjacent connected rooms for a given room.
   * @param {string} roomName 
   * @returns {string[]}
   */
  getAdjacentRooms(a) {
    return this.adjacencyMap.has(a) || this.buildGraph(), Array.from(this.adjacencyMap.get(a) || []);
  }
  /**
   * Calculates rooms reachable within a given maximum step distance.
   * @param {string} currentRoom 
   * @param {number} maxDistance 
   * @returns {string[]}
   */
  getReachableRooms(a, t = 2) {
    const e = /* @__PURE__ */ new Set([a]);
    let o = /* @__PURE__ */ new Set([a]);
    for (let n = 0; n < t; n++) {
      const i = /* @__PURE__ */ new Set();
      for (const c of o) {
        const d = this.getAdjacentRooms(c);
        for (const r of d)
          e.has(r) || (e.add(r), i.add(r));
      }
      o = i;
    }
    return Array.from(e);
  }
}
class D {
  constructor() {
    this.roomGraph = new O();
  }
  /**
   * Plans the next turn movement for an NPC token based on cascading rules.
   * @param {TokenDocument|Token} npcToken - The NPC token
   * @param {Object} options - Travel context (co-occupants, history, target tools)
   * @returns {Object} { suggestedRoom, coTraveledWith, pathReason }
   */
  planMovement(a, t = {}) {
    const e = S.getRoomAt(a), o = t.coOccupants || [], n = t.travelHistory || [], i = t.targetToolRoom || null, c = game.settings.get(s.ID, s.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5, d = game.settings.get(s.ID, s.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;
    if (o.length > 0 && Math.random() < c) {
      const u = o[Math.floor(Math.random() * o.length)], y = t.partnerDestinations?.[u.id] || null;
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
    const a = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE);
    if (!a || a.status !== s.STATUS.IN_PROGRESS)
      return null;
    const { killerId: t, victimId: e, requiredWeapon: o, roomWeaponLocations: n } = a;
    if (!t || !e) return null;
    const i = canvas.tokens?.get(t), c = canvas.tokens?.get(e);
    if (!i || !c) return null;
    const d = S.getRoomAt(i), r = S.getRoomAt(c);
    if (d !== r || d === "Corridor") return null;
    const l = i.document.getFlag(s.ID, "acquiredTools") || [];
    if (o && !l.includes(o))
      if (n?.[o] === d)
        l.push(o), await i.document.setFlag(s.ID, "acquiredTools", l), ui.notifications.info(`${s.TITLE}: ${i.name} secretly acquired the ${o} in the ${d}!`);
      else
        return null;
    if (k.getVisibleTokensFor(i).filter((v) => v.id !== e).length > 0)
      return null;
    const T = {
      killerName: i.name,
      victimName: c.name,
      weapon: o,
      room: d,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };
    return a.status = s.STATUS.CRIME_COMMITTED, a.solution = T, await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, a), ui.notifications.warn(`${s.TITLE}: A foul crime has occurred in the ${d}! The investigation begins!`), c && await c.document.update({ overlayEffect: "icons/svg/skull.svg" }), T;
  }
}
const A = [
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
  static generateScenario(a = "lord-hintz") {
    const t = A.find((l) => l.id === a) || A[0], e = A.filter((l) => l.id !== t.id), o = e[Math.floor(Math.random() * e.length)], n = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], i = n[Math.floor(Math.random() * n.length)], c = {};
    for (const l of A)
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
      killerId: o.id,
      killerName: o.name,
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
  static async importMap(a, t, e = null) {
    if (!game.user.isGM) return null;
    const o = typeof t == "string" ? JSON.parse(t) : t, n = o.resolution?.pixels_per_grid || 100, i = o.resolution?.map_size?.x || 30, c = o.resolution?.map_size?.y || 30, d = i * n, r = c * n;
    let l = e;
    !l && o.image && (l = o.image.startsWith("data:") ? o.image : `data:image/png;base64,${o.image}`);
    const m = [];
    if (Array.isArray(o.line_of_sight))
      for (const f of o.line_of_sight)
        for (let g = 0; g < f.length - 1; g++) {
          const u = f[g], y = f[g + 1];
          m.push({
            c: [u.x * n, u.y * n, y.x * n, y.y * n],
            door: 0,
            ds: 0
          });
        }
    if (Array.isArray(o.portals))
      for (const f of o.portals) {
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
      name: a,
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
    return ui.notifications.info(`Hintz Manor: Successfully imported scene "${a}" with background image and ${m.length} walls/doors!`), v;
  }
}
class N {
  /**
   * Determines the valid Actor document type for the active game system in Foundry V14.
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
    const a = Object.keys(CONFIG.Actor?.typeLabels || game.model?.Actor || {}), t = Array.isArray(game.system?.documentTypes?.Actor) ? game.system.documentTypes.Actor : a;
    return t.includes("npc") ? "npc" : t.includes("character") ? "character" : t.includes("person") ? "person" : t.includes("base") ? "base" : t[0] || "character";
  }
  /**
   * Imports all 13 NPC Actors into the active Foundry world using batch creation & single fallback.
   * @returns {Promise<Actor[]>} Array of created Actors
   */
  static async importAllActors() {
    if (!game.user.isGM) return [];
    const a = this.getValidActorType();
    console.log(`Hintz Manor | System-agnostic Actor creation using type "${a}" for system "${game.system.id}".`);
    const t = [];
    for (const e of A)
      game.actors.find((n) => n.name === e.name) || t.push({
        name: e.name,
        type: a,
        img: e.avatar || "icons/svg/mystery-man.svg",
        system: {},
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
        console.warn("Hintz Manor | Batch Actor creation failed, attempting single fallback:", e);
        const o = [];
        for (const n of t)
          try {
            const i = await Actor.create(n);
            i && o.push(i);
          } catch (i) {
            console.error(`Hintz Manor | Single Actor creation failed for ${n.name}:`, i);
          }
        return o.length > 0 ? (ui.notifications.info(`Hintz Manor: Imported ${o.length} NPC Actors into your Actors Sidebar!`), o) : (ui.notifications.error(`Hintz Manor: Could not create Actors in system "${game.system.id}": ${e.message}`), []);
      }
    else
      return ui.notifications.info("Hintz Manor: All 13 NPC Actors are already present in your Actors Sidebar."), [];
  }
}
const { ApplicationV2: z, HandlebarsApplicationMixin: P } = foundry.applications.api;
class h extends P(z) {
  constructor(a = {}) {
    super(a), this.activeTab = "setup";
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
  async _prepareContext(a) {
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
    const o = canvas.tokens?.placeables.map((r) => ({ id: r.id, name: r.name })) || [], n = S.getAllRooms(), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], c = A.map((r) => {
      const l = e.filter((g) => g.actorName === r.name), m = Array.from(new Set(l.map((g) => g.room))), T = Array.from(new Set(l.flatMap((g) => g.visibleTokenNames || []))), v = canvas.tokens?.placeables.find((g) => g.name === r.name), f = v ? v.document.getFlag(s.ID, "acquiredTools") || [] : [];
      return {
        name: r.name,
        role: r.role,
        currentRoom: v ? S.getRoomAt(v) : r.startingRoom,
        roomsVisited: m.length > 0 ? m.join(", ") : "None yet",
        seenTokens: T.length > 0 ? T.join(", ") : "No witnesses seen",
        tools: f.length > 0 ? f.join(", ") : "No tools acquired"
      };
    }), d = A.map((r) => {
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
      tokens: o,
      npcRoster: A,
      rooms: n,
      defaultWeapons: i,
      isSetup: t.status === s.STATUS.SETUP,
      isInProgress: t.status === s.STATUS.IN_PROGRESS,
      isCrimeCommitted: t.status === s.STATUS.CRIME_COMMITTED
    };
  }
  static async _onSwitchTab(a, t) {
    a.preventDefault(), this.activeTab = t.dataset.tab, this.render();
  }
  static async _onImportActors(a, t) {
    a.preventDefault(), await N.importAllActors(), this.render();
  }
  static async _onGenerateMotives(a, t) {
    a.preventDefault();
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
  static async _onInitializeMystery(a, t) {
    a.preventDefault();
    const e = this.element, o = e.querySelector('[name="killerId"]')?.value, n = e.querySelector('[name="victimId"]')?.value, i = e.querySelector('[name="requiredWeapon"]')?.value;
    if (!o || !n || !i) {
      ui.notifications.error(`${s.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }
    const c = S.getAllRooms(), d = {
      [i]: c[Math.floor(Math.random() * c.length)]
    }, r = {
      status: s.STATUS.IN_PROGRESS,
      killerId: o,
      victimId: n,
      requiredWeapon: i,
      rooms: c,
      roomWeaponLocations: d,
      solution: null
    };
    await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, r), ui.notifications.info(`${s.TITLE}: Mystery initialized!`), this.render();
  }
  static async _onRandomizeMystery(a, t) {
    a.preventDefault();
    const e = C.generateScenario("lord-hintz"), o = S.getAllRooms(), n = {
      [e.requiredWeapon]: o[Math.floor(Math.random() * o.length)]
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
      rooms: o,
      roomWeaponLocations: n,
      solution: null
    };
    await N.importAllActors(), await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, i), await game.settings.set(s.ID, s.FLAGS.TURN_LOGS, []), ui.notifications.info(`🎲 ${s.TITLE}: Full Game Reset! 13 Actors Imported, Mystery & Motives Randomized!`), this.render();
  }
  static async _onImportOpenVTTMaps(a, t) {
    a.preventDefault(), ui.notifications.info(`${s.TITLE}: Importing pre-built OpenVTT map scenes with background images...`);
    const e = [
      { name: "Hintz Manor 1F (Ground Floor)", file: "modules/hintz-manor/assets/maps/Hintz1f.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz1f.png" },
      { name: "Hintz Manor 2F (Upper Floor)", file: "modules/hintz-manor/assets/maps/Hintz2fa.dd2vtt", img: "modules/hintz-manor/assets/maps/Hintz2fa.png" },
      { name: "Hintz Manor Basement", file: "modules/hintz-manor/assets/maps/HintzBasement.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzBasement.png" },
      { name: "Hintz Manor Roof", file: "modules/hintz-manor/assets/maps/HintzRoof.dd2vtt", img: "modules/hintz-manor/assets/maps/HintzRoof.png" }
    ];
    for (const o of e)
      try {
        const n = await fetch(o.file);
        if (n.ok) {
          const i = await n.json();
          await H.importMap(o.name, i, o.img);
        }
      } catch (n) {
        console.warn(`Could not import map ${o.file}:`, n);
      }
  }
  static async _onResetMystery(a, t) {
    a.preventDefault(), await game.settings.set(s.ID, s.FLAGS.MYSTERY_STATE, {
      status: s.STATUS.SETUP,
      killerId: null,
      victimId: null,
      requiredWeapon: null,
      solution: null
    }), await game.settings.set(s.ID, s.FLAGS.TURN_LOGS, []), ui.notifications.info(`${s.TITLE}: Mystery state reset.`), this.render();
  }
}
const { ApplicationV2: F, HandlebarsApplicationMixin: W } = foundry.applications.api;
class E extends W(F) {
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
      toggleElimination: E._onToggleElimination,
      submitAccusation: E._onSubmitAccusation
    }
  };
  static PARTS = {
    main: {
      template: "modules/hintz-manor/templates/detective-notebook.hbs"
    }
  };
  async _prepareContext(a) {
    const t = w.getPlayerNotebook(), e = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE) || {}, o = game.settings.get(s.ID, s.FLAGS.TURN_LOGS) || [], n = A.map((m) => m.name), i = ["Candlestick", "Dagger", "Lead Pipe", "Revolver", "Rope", "Wrench", "Poison Vial"], c = S.getAllRooms(), d = n.map((m) => ({
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
      turnLogs: o.slice(-20).reverse(),
      isCrimeCommitted: e.status === s.STATUS.CRIME_COMMITTED
    };
  }
  static async _onToggleElimination(a, t) {
    a.preventDefault();
    const e = t.dataset.type, o = t.dataset.name, n = w.getPlayerNotebook(), c = {
      suspect: "eliminatedSuspects",
      weapon: "eliminatedWeapons",
      room: "eliminatedRooms"
    }[e];
    c && (n[c] = n[c] || [], n[c].includes(o) ? n[c] = n[c].filter((d) => d !== o) : n[c].push(o), await w.savePlayerNotebook(n), this.render());
  }
  static async _onSubmitAccusation(a, t) {
    a.preventDefault();
    const e = this.element, o = e.querySelector('[name="accusedSuspect"]')?.value, n = e.querySelector('[name="accusedWeapon"]')?.value, i = e.querySelector('[name="accusedRoom"]')?.value, c = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE);
    if (!c?.solution) {
      ui.notifications.warn(`${s.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }
    const { killerName: d, weapon: r, room: l } = c.solution;
    o === d && n === r && i === l ? ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${d} committed the crime in the ${l} with the ${r}!`) : ui.notifications.error(`❌ INCORRECT ACCUSATION! ${game.user.name}'s claim was proven false!`);
  }
}
let b = null, R = null;
class U {
  static registerHooks() {
    Hooks.on("renderJournalDirectory", (a, t) => {
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const o = e.querySelector(".header-actions") || e.querySelector(".directory-header");
      if (o && !e.querySelector("#hm-journal-notebook-btn")) {
        const n = document.createElement("button");
        n.id = "hm-journal-notebook-btn", n.type = "button", n.className = "hintz-notebook-btn", n.title = "Detective Notebook", n.innerHTML = '<i class="fa-solid fa-book-skull"></i> Notebook', n.addEventListener("click", (i) => {
          i.preventDefault(), R || (R = new E()), R.render(!0);
        }), o.prepend(n);
      }
    }), Hooks.on("renderActorDirectory", (a, t) => {
      if (!game.user.isGM) return;
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const o = e.querySelector(".header-actions") || e.querySelector(".directory-header");
      if (o && !e.querySelector("#hm-actor-gm-btn")) {
        const n = document.createElement("button");
        n.id = "hm-actor-gm-btn", n.type = "button", n.className = "hintz-gm-btn", n.title = "GM Mystery Control Panel", n.innerHTML = '<i class="fa-solid fa-masks-theater"></i> GM Mystery Panel', n.addEventListener("click", (i) => {
          i.preventDefault(), b || (b = new h()), b.render(!0);
        }), o.prepend(n);
      }
    }), Hooks.on("renderSceneDirectory", (a, t) => {
      if (!game.user.isGM) return;
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const o = e.querySelector(".header-actions") || e.querySelector(".directory-header");
      if (o && !e.querySelector("#hm-scene-gm-btn")) {
        const n = document.createElement("button");
        n.id = "hm-scene-gm-btn", n.type = "button", n.className = "hintz-gm-btn", n.title = "GM Mystery Control Panel", n.innerHTML = '<i class="fa-solid fa-masks-theater"></i> GM Mystery Panel', n.addEventListener("click", (i) => {
          i.preventDefault(), b || (b = new h()), b.render(!0);
        }), o.prepend(n);
      }
    }), Hooks.on("renderSettings", (a, t) => {
      const e = t instanceof HTMLElement ? t : t[0];
      if (!e) return;
      const o = e.querySelector("#settings-documentation") || e.querySelector("#settings-game");
      if (o && !e.querySelector("#hm-settings-section")) {
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
          `), n.innerHTML = i, o.before(n), n.querySelector("#hm-settings-notebook-btn")?.addEventListener("click", () => {
          R || (R = new E()), R.render(!0);
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
const V = new D();
Hooks.once("init", () => {
  console.log(`${s.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`), w.registerSettings(), U.registerHooks(), game.hintzManor = {
    openGM: () => {
      I || (I = new h()), I.render(!0);
    },
    openNotebook: () => {
      M || (M = new E()), M.render(!0);
    }
  };
});
Hooks.once("ready", () => {
  console.log(`${s.TITLE} | Ready! Engine active.`), game.user.isGM && ui.notifications.info(`🔎 ${s.TITLE} Engine Active! Access controls via Journal/Actor sidebar header buttons or Token Controls.`);
});
Hooks.on("getSceneControlButtons", (p) => {
  const a = p.find((t) => t.name === "token");
  a && (a.tools.push({
    name: "hintz-manor-notebook",
    title: "Detective Notebook",
    icon: "fa-solid fa-book-skull",
    button: !0,
    onClick: () => {
      M || (M = new E()), M.render(!0);
    }
  }), game.user.isGM && a.tools.push({
    name: "hintz-manor-gm-panel",
    title: "GM Mystery Control Panel",
    icon: "fa-solid fa-masks-theater",
    button: !0,
    onClick: () => {
      I || (I = new h()), I.render(!0);
    }
  }));
});
Hooks.on("updateCombat", async (p, a) => {
  if (!game.user.isGM) return;
  const t = p.combatant;
  if (!t) return;
  const e = k.recordTurnSnapshot(t), o = t.token;
  if (!o) return;
  if (!o.actor?.hasPlayerOwner) {
    const i = k.getTokensInRoom(e?.room, o.id), c = k.getHistoryFor(o.id), d = game.settings.get(s.ID, s.FLAGS.MYSTERY_STATE), r = d?.requiredWeapon, l = d?.roomWeaponLocations?.[r] || null, m = V.planMovement(o, {
      coOccupants: i,
      travelHistory: c,
      targetToolRoom: l
    });
    m.suggestedRoom && m.suggestedRoom !== e?.room && ui.notifications.info(`🧭 ${o.name} (${m.pathReason}): Suggested destination -> ${m.suggestedRoom}`);
  }
  await G.evaluateCrimeOpportunity();
});
Hooks.on("updateToken", async (p, a) => {
  game.user.isGM && ("x" in a || "y" in a) && (k.recordTurnSnapshot(p), await G.evaluateCrimeOpportunity());
});
//# sourceMappingURL=main.js.map
