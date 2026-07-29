import { HINTZ_MANOR } from '../config.js';
import { RegionManager } from './RegionManager.js';
import { TrackingEngine } from './TrackingEngine.js';

/**
 * CrimeEngine evaluates NPC crime opportunities and manages the mystery solution state.
 * Crime trigger condition:
 * - NPC has collected required crime tool / weapon
 * - NPC is in the same room as target victim
 * - 0 third-party witnesses have line-of-sight to the room / tokens
 */
export class CrimeEngine {
  /**
   * Evaluates if any NPC has met the isolation & tool criteria to commit the crime.
   * @returns {Object|null} Triggered crime result or null
   */
  static async evaluateCrimeOpportunity() {
    if (!game.user.isGM) return null;

    const mysteryState = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE);
    if (!mysteryState || mysteryState.status !== HINTZ_MANOR.STATUS.IN_PROGRESS) {
      return null;
    }

    const { killerId, victimId, requiredWeapon, roomWeaponLocations } = mysteryState;

    if (!killerId || !victimId) return null;

    const killerToken = canvas.tokens?.get(killerId);
    const victimToken = canvas.tokens?.get(victimId);

    if (!killerToken || !victimToken) return null;

    const killerRoom = RegionManager.getRoomAt(killerToken);
    const victimRoom = RegionManager.getRoomAt(victimToken);

    // 1. Check if Killer and Victim are in the exact same room
    if (killerRoom !== victimRoom || killerRoom === 'Corridor') return null;

    // 2. Check if Killer has collected the required weapon/tool
    const killerTools = killerToken.document.getFlag(HINTZ_MANOR.ID, 'acquiredTools') || [];
    if (requiredWeapon && !killerTools.includes(requiredWeapon)) {
      // Automatically pickup weapon if Killer is in the room where it is placed!
      if (roomWeaponLocations?.[requiredWeapon] === killerRoom) {
        killerTools.push(requiredWeapon);
        await killerToken.document.setFlag(HINTZ_MANOR.ID, 'acquiredTools', killerTools);
        ui.notifications.info(`${HINTZ_MANOR.TITLE}: ${killerToken.name} secretly acquired the ${requiredWeapon} in the ${killerRoom}!`);
      } else {
        return null; // Killer does not have the required weapon yet
      }
    }

    // 3. Check Isolation / Line-of-Sight Witnesses
    const witnesses = TrackingEngine.getVisibleTokensFor(killerToken).filter(t => t.id !== victimId);

    if (witnesses.length > 0) {
      // Opportunity blocked: witnessed by other characters!
      return null;
    }

    // --- Opportunity Met! Trigger Crime Event ---
    const crimeResult = {
      killerName: killerToken.name,
      victimName: victimToken.name,
      weapon: requiredWeapon,
      room: killerRoom,
      round: game.combat?.round || 1,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    };

    mysteryState.status = HINTZ_MANOR.STATUS.CRIME_COMMITTED;
    mysteryState.solution = crimeResult;
    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE, mysteryState);

    // Broadcast or announce crime event to GM/Players
    ui.notifications.warn(`${HINTZ_MANOR.TITLE}: A foul crime has occurred in the ${killerRoom}! The investigation begins!`);

    // Hide or modify victim token to simulate crime scene
    if (victimToken) {
      await victimToken.document.update({ overlayEffect: 'icons/svg/skull.svg' });
    }

    return crimeResult;
  }
}
