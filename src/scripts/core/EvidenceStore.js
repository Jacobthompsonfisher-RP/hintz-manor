import { HINTZ_MANOR } from '../config.js';

/**
 * EvidenceStore handles world flag persistence, system settings initialization,
 * and notebook deduction cross-off states.
 */
export class EvidenceStore {
  /**
   * Registers all module settings in Foundry.
   */
  static registerSettings() {
    game.settings.register(HINTZ_MANOR.ID, HINTZ_MANOR.SETTINGS.CO_TRAVEL_PROBABILITY, {
      name: 'Co-Travel Probability',
      hint: 'Odds (0.0 to 1.0) that an NPC will choose to follow a character sharing their current room.',
      scope: 'world',
      config: true,
      type: Number,
      default: HINTZ_MANOR.DEFAULTS.CO_TRAVEL_PROBABILITY,
      range: { min: 0.0, max: 1.0, step: 0.05 }
    });

    game.settings.register(HINTZ_MANOR.ID, HINTZ_MANOR.SETTINGS.NOVELTY_WEIGHT, {
      name: 'Novelty Room Weighting',
      hint: 'Weight factor favoring rooms the NPC has not yet visited during travel.',
      scope: 'world',
      config: true,
      type: Number,
      default: HINTZ_MANOR.DEFAULTS.NOVELTY_WEIGHT,
      range: { min: 0.0, max: 2.0, step: 0.1 }
    });

    game.settings.register(HINTZ_MANOR.ID, HINTZ_MANOR.SETTINGS.AUTO_EXECUTE_NPC_MOVE, {
      name: 'Auto-Execute NPC Moves',
      hint: 'If enabled, NPC tokens automatically move along suggested paths when their turn starts.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: HINTZ_MANOR.DEFAULTS.AUTO_EXECUTE_NPC_MOVE
    });

    game.settings.register(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, {
      scope: 'world',
      config: false,
      type: Object,
      default: {
        status: HINTZ_MANOR.STATUS.SETUP,
        killerId: null,
        victimId: null,
        requiredWeapon: null,
        suspects: [],
        weapons: [],
        rooms: [],
        roomWeaponLocations: {},
        solution: null
      }
    });

    game.settings.register(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS, {
      scope: 'world',
      config: false,
      type: Array,
      default: []
    });

    game.settings.register(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.EVIDENCE_LEDGER, {
      scope: 'world',
      config: false,
      type: Array,
      default: []
    });
  }

  /**
   * Retrieves player notebook data for current user.
   * @returns {Object}
   */
  static getPlayerNotebook() {
    const defaultData = { eliminatedSuspects: [], eliminatedWeapons: [], eliminatedRooms: [], notes: '' };
    return game.user.getFlag(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.NOTEBOOK) || defaultData;
  }

  /**
   * Saves player notebook state.
   * @param {Object} data 
   */
  static async savePlayerNotebook(data) {
    await game.user.setFlag(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.NOTEBOOK, data);
  }
}
