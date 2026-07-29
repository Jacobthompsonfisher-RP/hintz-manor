import { HINTZ_MANOR } from '../config.js';
import { NPC_ROSTER } from '../data/NPCRoster.js';
import { MotiveGenerator } from '../core/MotiveGenerator.js';
import { RegionManager } from '../core/RegionManager.js';
import { OpenVTTImporter } from '../core/OpenVTTImporter.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GMMysteryPanel provides the GM interface for mystery setup, NPC roster management,
 * OpenVTT map importing, role assignment, and crime timeline monitoring in Foundry V14.
 */
export class GMMysteryPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'hintz-manor-gm-panel',
    tag: 'form',
    window: {
      title: 'Hintz Manor - GM Control Center',
      icon: 'fa-solid fa-masks-theater',
      resizable: true
    },
    position: {
      width: 750,
      height: 650
    },
    actions: {
      initializeMystery: GMMysteryPanel._onInitializeMystery,
      randomizeMystery: GMMysteryPanel._onRandomizeMystery,
      importOpenVTTMaps: GMMysteryPanel._onImportOpenVTTMaps,
      resetMystery: GMMysteryPanel._onResetMystery
    }
  };

  static PARTS = {
    main: {
      template: 'modules/hintz-manor/templates/gm-panel.hbs'
    }
  };

  async _prepareContext(options) {
    const mysteryState = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE) || {};
    const turnLogs = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS) || [];

    const sceneTokens = canvas.tokens?.placeables.map(t => ({ id: t.id, name: t.name })) || [];
    const rooms = RegionManager.getAllRooms();
    const defaultWeapons = ['Candlestick', 'Dagger', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench', 'Poison Vial'];

    return {
      mysteryState,
      turnLogs: turnLogs.slice(-15).reverse(),
      tokens: sceneTokens,
      npcRoster: NPC_ROSTER,
      rooms,
      defaultWeapons,
      isSetup: mysteryState.status === HINTZ_MANOR.STATUS.SETUP,
      isInProgress: mysteryState.status === HINTZ_MANOR.STATUS.IN_PROGRESS,
      isCrimeCommitted: mysteryState.status === HINTZ_MANOR.STATUS.CRIME_COMMITTED
    };
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
    ui.notifications.info(`${HINTZ_MANOR.TITLE}: Mystery initialized! The secret killer is set.`);
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

    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, newState);
    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS, []);

    ui.notifications.info(`🎲 ${HINTZ_MANOR.TITLE}: Full Mystery Reset! Killer, Motives, and Weapon placements have been randomized!`);
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
