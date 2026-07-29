import { NPC_ROSTER } from '../data/NPCRoster.js';

/**
 * MotiveGenerator creates randomized motives, secrets, alliances, and rivalries
 * between the 13 characters for each game session.
 */
export class MotiveGenerator {
  static MOTIVE_TYPES = [
    'Inheritance & Will Revision',
    'Blackmail & Scandal Cover-up',
    'Unpaid Gambling Debt',
    'Stolen Heirloom & Theft',
    'Jealous Romance Affair',
    'Old Military Vengeance',
    'Toxic Poison Secret'
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
  static generateScenario(victimId = 'lord-hintz') {
    const victim = NPC_ROSTER.find(c => c.id === victimId) || NPC_ROSTER[0];
    const suspects = NPC_ROSTER.filter(c => c.id !== victim.id);

    // Pick Killer randomly from suspects
    const killer = suspects[Math.floor(Math.random() * suspects.length)];

    // Weapons list
    const weapons = ['Candlestick', 'Dagger', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench', 'Poison Vial'];
    const requiredWeapon = weapons[Math.floor(Math.random() * weapons.length)];

    // Assign motives to each suspect
    const characterMotives = {};
    for (const char of NPC_ROSTER) {
      characterMotives[char.id] = {
        motive: this.MOTIVE_TYPES[Math.floor(Math.random() * this.MOTIVE_TYPES.length)],
        secret: `Holds a secret regarding ${victim.name}'s affairs.`
      };
    }

    // Generate Alliances and Rivalries
    const alliances = [];
    const rivalries = [];

    for (let i = 0; i < suspects.length; i++) {
      for (let j = i + 1; j < suspects.length; j++) {
        const rand = Math.random();
        if (rand < 0.15) {
          alliances.push({ char1: suspects[i].name, char2: suspects[j].name });
        } else if (rand > 0.85) {
          rivalries.push({ char1: suspects[i].name, char2: suspects[j].name });
        }
      }
    }

    return {
      killerId: killer.id,
      killerName: killer.name,
      victimId: victim.id,
      victimName: victim.name,
      requiredWeapon,
      characterMotives,
      alliances,
      rivalries,
      timestamp: Date.now()
    };
  }
}
