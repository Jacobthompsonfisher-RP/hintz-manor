import { HINTZ_MANOR } from '../config.js';
import { EvidenceStore } from '../core/EvidenceStore.js';
import { RegionManager } from '../core/RegionManager.js';
import { NPC_ROSTER } from '../data/NPCRoster.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * DetectiveNotebook provides players with an interactive Clue-style deduction sheet,
 * evidence timeline, sightline logs, and solution submission interface in Foundry V14.
 */
export class DetectiveNotebook extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'hintz-manor-detective-notebook',
    tag: 'form',
    window: {
      title: 'Detective Notebook - Hintz Manor',
      icon: 'fa-solid fa-book-skull',
      resizable: true
    },
    position: {
      width: 750,
      height: 650
    },
    actions: {
      toggleElimination: DetectiveNotebook._onToggleElimination,
      submitAccusation: DetectiveNotebook._onSubmitAccusation
    }
  };

  static PARTS = {
    main: {
      template: 'modules/hintz-manor/templates/detective-notebook.hbs'
    }
  };

  async _prepareContext(options) {
    const notebook = EvidenceStore.getPlayerNotebook();
    const mysteryState = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE) || {};
    const turnLogs = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS) || [];

    const suspects = NPC_ROSTER.map(c => c.name);
    const weapons = ['Candlestick', 'Dagger', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench', 'Poison Vial'];
    const rooms = RegionManager.getAllRooms();

    const suspectItems = suspects.map(name => ({
      name,
      isEliminated: notebook.eliminatedSuspects?.includes(name)
    }));

    const weaponItems = weapons.map(name => ({
      name,
      isEliminated: notebook.eliminatedWeapons?.includes(name)
    }));

    const roomItems = rooms.map(name => ({
      name,
      isEliminated: notebook.eliminatedRooms?.includes(name)
    }));

    return {
      notebook,
      suspectItems,
      weaponItems,
      roomItems,
      turnLogs: turnLogs.slice(-20).reverse(),
      isCrimeCommitted: mysteryState.status === HINTZ_MANOR.STATUS.CRIME_COMMITTED
    };
  }

  static async _onToggleElimination(event, target) {
    event.preventDefault();
    const type = target.dataset.type;
    const name = target.dataset.name;

    const notebook = EvidenceStore.getPlayerNotebook();
    const keyMap = {
      suspect: 'eliminatedSuspects',
      weapon: 'eliminatedWeapons',
      room: 'eliminatedRooms'
    };

    const key = keyMap[type];
    if (!key) return;

    notebook[key] = notebook[key] || [];

    if (notebook[key].includes(name)) {
      notebook[key] = notebook[key].filter(item => item !== name);
    } else {
      notebook[key].push(name);
    }

    await EvidenceStore.savePlayerNotebook(notebook);
    this.render();
  }

  static async _onSubmitAccusation(event, target) {
    event.preventDefault();
    const form = this.element;
    const accusedSuspect = form.querySelector('[name="accusedSuspect"]')?.value;
    const accusedWeapon = form.querySelector('[name="accusedWeapon"]')?.value;
    const accusedRoom = form.querySelector('[name="accusedRoom"]')?.value;

    const mysteryState = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE);

    if (!mysteryState?.solution) {
      ui.notifications.warn(`${HINTZ_MANOR.TITLE}: The crime has not occurred yet! Keep investigating.`);
      return;
    }

    const { killerName, weapon, room } = mysteryState.solution;

    const isCorrect =
      accusedSuspect === killerName &&
      accusedWeapon === weapon &&
      accusedRoom === room;

    if (isCorrect) {
      ui.notifications.info(`🎉 ACCUSATION CORRECT! ${game.user.name} solved the mystery! ${killerName} committed the crime in the ${room} with the ${weapon}!`);
    } else {
      ui.notifications.error(`❌ INCORRECT ACCUSATION! ${game.user.name}'s claim was proven false!`);
    }
  }
}
