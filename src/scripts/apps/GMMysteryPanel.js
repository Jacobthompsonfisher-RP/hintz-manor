import { HINTZ_MANOR } from '../config.js';
import { RegionManager } from '../core/RegionManager.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GMMysteryPanel provides the GM interface for mystery setup, role assignment,
 * weapon placement, and crime timeline monitoring in Foundry V14.
 */
export class GMMysteryPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'hintz-manor-gm-panel',
    tag: 'form',
    window: {
      title: 'Hintz Manor - GM Control Panel',
      icon: 'fa-solid fa-masks-theater',
      resizable: true
    },
    position: {
      width: 680,
      height: 580
    },
    actions: {
      initializeMystery: GMMysteryPanel._onInitializeMystery,
      placeWeapon: GMMysteryPanel._onPlaceWeapon,
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
    const defaultWeapons = ['Candlestick', 'Dagger', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench'];

    return {
      mysteryState,
      turnLogs: turnLogs.slice(-15).reverse(), // Show latest 15 turn logs
      tokens: sceneTokens,
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

    if (killerId === victimId) {
      ui.notifications.error(`${HINTZ_MANOR.TITLE}: Killer and Victim cannot be the same character!`);
      return;
    }

    const rooms = RegionManager.getAllRooms();

    // Assign weapons to rooms
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
    ui.notifications.info(`${HINTZ_MANOR.TITLE}: Mystery initialized! The secret killer has been set.`);
    this.render();
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
    ui.notifications.info(`${HINTZ_MANOR.TITLE}: Mystery state reset to initial setup.`);
    this.render();
  }
}
