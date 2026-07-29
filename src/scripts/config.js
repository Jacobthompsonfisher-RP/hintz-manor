/**
 * Configuration constants and default settings for Hintz Manor.
 */
export const HINTZ_MANOR = {
  ID: 'hintz-manor',
  TITLE: 'Hintz Manor',
  FLAGS: {
    MYSTERY_STATE: 'mysteryState',
    TURN_LOGS: 'turnLogs',
    EVIDENCE_LEDGER: 'evidenceLedger',
    NOTEBOOK: 'detectiveNotebook',
    ROOM_TOOLS: 'roomTools'
  },
  SETTINGS: {
    CO_TRAVEL_PROBABILITY: 'coTravelProbability',
    NOVELTY_WEIGHT: 'noveltyWeight',
    AUTO_EXECUTE_NPC_MOVE: 'autoExecuteNPCMove',
    DEBUG_LOGGING: 'debugLogging'
  },
  DEFAULTS: {
    CO_TRAVEL_PROBABILITY: 0.5, // 50% chance NPC co-travels with room co-occupants
    NOVELTY_WEIGHT: 0.7,        // Weight factor preferring unvisited rooms
    AUTO_EXECUTE_NPC_MOVE: false
  },
  STATUS: {
    SETUP: 'SETUP',
    IN_PROGRESS: 'IN_PROGRESS',
    CRIME_COMMITTED: 'CRIME_COMMITTED',
    SOLVED: 'SOLVED'
  }
};
