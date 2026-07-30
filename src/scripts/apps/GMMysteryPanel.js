import { HINTZ_MANOR } from '../config.js';
import { NPC_ROSTER } from '../data/NPCRoster.js';
import { MotiveGenerator } from '../core/MotiveGenerator.js';
import { RegionManager } from '../core/RegionManager.js';
import { OpenVTTImporter } from '../core/OpenVTTImporter.js';
import { ActorManager } from '../core/ActorManager.js';
import { TrackingEngine } from '../core/TrackingEngine.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GMMysteryPanel provides the GM interface for mystery setup, Motive Grids,
 * NPC Knowledge & Travel History, Map Importing, and Game Reset in Foundry V14.
 */
export class GMMysteryPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.activeTab = 'setup';
  }

  static DEFAULT_OPTIONS = {
    id: 'hintz-manor-gm-panel',
    tag: 'form',
    window: {
      title: 'Hintz Manor - GM Control Center',
      icon: 'fa-solid fa-masks-theater',
      resizable: true
    },
    position: {
      width: 780,
      height: 680
    },
    actions: {
      switchTab: GMMysteryPanel._onSwitchTab,
      initializeMystery: GMMysteryPanel._onInitializeMystery,
      randomizeMystery: GMMysteryPanel._onRandomizeMystery,
      generateMotives: GMMysteryPanel._onGenerateMotives,
      importOpenVTTMaps: GMMysteryPanel._onImportOpenVTTMaps,
      importActors: GMMysteryPanel._onImportActors,
      resetMystery: GMMysteryPanel._onResetMystery
    }
  };

  static PARTS = {
    main: {
      template: 'modules/hintz-manor/templates/gm-panel.hbs'
    }
  };

  async _prepareContext(options) {
    let mysteryState = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE) || {};
    const turnLogs = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS) || [];

    // Auto-initialize Motive Matrix if not yet generated
    if (!mysteryState.motives) {
      const scenario = MotiveGenerator.generateScenario('lord-hintz');
      mysteryState = {
        ...mysteryState,
        killerId: scenario.killerId,
        killerName: scenario.killerName,
        victimId: scenario.victimId,
        victimName: scenario.victimName,
        requiredWeapon: scenario.requiredWeapon,
        motives: scenario.characterMotives,
        alliances: scenario.alliances,
        rivalries: scenario.rivalries
      };
      await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, mysteryState);
    }

    const sceneTokens = canvas.tokens?.placeables.map(t => ({ id: t.id, name: t.name })) || [];
    const rooms = RegionManager.getAllRooms();
    const defaultWeapons = ['Candlestick', 'Dagger', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench', 'Poison Vial'];

    // Prepare Knowledge & Travel History per NPC
    const npcKnowledge = NPC_ROSTER.map(npc => {
      const history = turnLogs.filter(log => log.actorName === npc.name);
      const roomsVisited = Array.from(new Set(history.map(h => h.room)));
      const seenTokens = Array.from(new Set(history.flatMap(h => h.visibleTokenNames || [])));
      
      const token = canvas.tokens?.placeables.find(t => t.name === npc.name);
      const tools = token ? (token.document.getFlag(HINTZ_MANOR.ID, 'acquiredTools') || []) : [];

      return {
        name: npc.name,
        role: npc.role,
        currentRoom: token ? RegionManager.getRoomAt(token) : npc.startingRoom,
        roomsVisited: roomsVisited.length > 0 ? roomsVisited.join(', ') : 'None yet',
        seenTokens: seenTokens.length > 0 ? seenTokens.join(', ') : 'No witnesses seen',
        tools: tools.length > 0 ? tools.join(', ') : 'No tools acquired'
      };
    });

    // Prepare Motives List
    const motivesList = NPC_ROSTER.map(npc => {
      const motiveData = mysteryState.motives?.[npc.id] || { motive: 'Secret Alibi', secret: 'None' };
      return {
        id: npc.id,
        name: npc.name,
        role: npc.role,
        isKiller: mysteryState.killerId === npc.id,
        isVictim: mysteryState.victimId === npc.id,
        motive: motiveData.motive,
        secret: motiveData.secret
      };
    });

    return {
      activeTab: this.activeTab,
      isSetupTab: this.activeTab === 'setup',
      isMotivesTab: this.activeTab === 'motives',
      isKnowledgeTab: this.activeTab === 'knowledge',
      isRosterTab: this.activeTab === 'roster',
      mysteryState,
      motivesList,
      npcKnowledge,
      alliances: mysteryState.alliances || [],
      rivalries: mysteryState.rivalries || [],
      turnLogs: turnLogs.slice(-25).reverse(),
      tokens: sceneTokens,
      npcRoster: NPC_ROSTER,
      rooms,
      defaultWeapons,
      isSetup: mysteryState.status === HINTZ_MANOR.STATUS.SETUP,
      isInProgress: mysteryState.status === HINTZ_MANOR.STATUS.IN_PROGRESS,
      isCrimeCommitted: mysteryState.status === HINTZ_MANOR.STATUS.CRIME_COMMITTED
    };
  }

  static async _onSwitchTab(event, target) {
    event.preventDefault();
    this.activeTab = target.dataset.tab;
    this.render();
  }

  static async _onImportActors(event, target) {
    event.preventDefault();
    await ActorManager.importAllActors();
    this.render();
  }

  static async _onGenerateMotives(event, target) {
    event.preventDefault();
    const scenario = MotiveGenerator.generateScenario('lord-hintz');
    const mysteryState = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE) || {};

    const updated = {
      ...mysteryState,
      killerId: scenario.killerId,
      killerName: scenario.killerName,
      victimId: scenario.victimId,
      victimName: scenario.victimName,
      requiredWeapon: scenario.requiredWeapon,
      motives: scenario.characterMotives,
      alliances: scenario.alliances,
      rivalries: scenario.rivalries
    };

    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, updated);
    ui.notifications.info(`🎲 ${HINTZ_MANOR.TITLE}: Motive & Relationship Matrix Initialized and Shuffled!`);
    this.render();
  }

  static async _onInitializeMystery(event, target) {
    event.preventDefault();
    const form = this.element;
    const killerId = form.querySelector('[name="killerId"]')?.value;
    const victimId = form.querySelector('[name="victimId"]')?.value;
    const requiredWeapon = form.querySelector('[name="requiredWeapon"]')?.value;

    if (!killerId || !victimId || !requiredWeapon) {
      ui.notifications.error(`${HINTZ_MANOR.TITLE}: Please select a Secret Killer, Victim, and Crime Weapon.`);
      return;
    }

    const rooms = RegionManager.getAllRooms();
    const roomWeaponLocations = {
      [requiredWeapon]: rooms[Math.floor(Math.random() * rooms.length)]
    };

    const newState = {
      status: HINTZ_MANOR.STATUS.IN_PROGRESS,
      killerId,
      victimId,
      requiredWeapon,
      rooms,
      roomWeaponLocations,
      solution: null
    };

    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, newState);
    ui.notifications.info(`${HINTZ_MANOR.TITLE}: Mystery initialized!`);
    this.render();
  }

  static async _onRandomizeMystery(event, target) {
    event.preventDefault();

    const scenario = MotiveGenerator.generateScenario('lord-hintz');
    const rooms = RegionManager.getAllRooms();

    const roomWeaponLocations = {
      [scenario.requiredWeapon]: rooms[Math.floor(Math.random() * rooms.length)]
    };

    const newState = {
      status: HINTZ_MANOR.STATUS.IN_PROGRESS,
      killerId: scenario.killerId,
      killerName: scenario.killerName,
      victimId: scenario.victimId,
      victimName: scenario.victimName,
      requiredWeapon: scenario.requiredWeapon,
      motives: scenario.characterMotives,
      alliances: scenario.alliances,
      rivalries: scenario.rivalries,
      rooms,
      roomWeaponLocations,
      solution: null
    };

    await ActorManager.importAllActors();
    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, newState);
    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS, []);

    ui.notifications.info(`🎲 ${HINTZ_MANOR.TITLE}: Full Game Reset! 13 Actors Imported, Mystery & Motives Randomized!`);
    this.render();
  }

  static async _onImportOpenVTTMaps(event, target) {
    event.preventDefault();
    ui.notifications.info(`${HINTZ_MANOR.TITLE}: Importing pre-built OpenVTT map scenes with background images...`);

    const mapFiles = [
      { name: 'Hintz Manor 1F (Ground Floor)', file: 'modules/hintz-manor/assets/maps/Hintz1f.dd2vtt', img: 'modules/hintz-manor/assets/maps/Hintz1f.png' },
      { name: 'Hintz Manor 2F (Upper Floor)', file: 'modules/hintz-manor/assets/maps/Hintz2fa.dd2vtt', img: 'modules/hintz-manor/assets/maps/Hintz2fa.png' },
      { name: 'Hintz Manor Basement', file: 'modules/hintz-manor/assets/maps/HintzBasement.dd2vtt', img: 'modules/hintz-manor/assets/maps/HintzBasement.png' },
      { name: 'Hintz Manor Roof', file: 'modules/hintz-manor/assets/maps/HintzRoof.dd2vtt', img: 'modules/hintz-manor/assets/maps/HintzRoof.png' }
    ];

    for (const map of mapFiles) {
      try {
        const response = await fetch(map.file);
        if (response.ok) {
          const vttJson = await response.json();
          await OpenVTTImporter.importMap(map.name, vttJson, map.img);
        }
      } catch (err) {
        console.warn(`Could not import map ${map.file}:`, err);
      }
    }
  }

  static async _onResetMystery(event, target) {
    event.preventDefault();
    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, {
      status: HINTZ_MANOR.STATUS.SETUP,
      killerId: null,
      victimId: null,
      requiredWeapon: null,
      solution: null
    });
    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS, []);
    ui.notifications.info(`${HINTZ_MANOR.TITLE}: Mystery state reset.`);
    this.render();
  }
}
