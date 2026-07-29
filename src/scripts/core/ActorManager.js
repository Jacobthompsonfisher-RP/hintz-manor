import { NPC_ROSTER } from '../data/NPCRoster.js';

/**
 * ActorManager handles creation and synchronization of the 13 NPC Actors into game.actors.
 */
export class ActorManager {
  /**
   * Imports all 13 NPC Actors into the active Foundry world if they do not exist.
   * @returns {Promise<Actor[]>} Array of created or existing Actors
   */
  static async importAllActors() {
    if (!game.user.isGM) return [];

    const created = [];
    for (const npc of NPC_ROSTER) {
      let existing = game.actors.find(a => a.name === npc.name);
      if (!existing) {
        existing = await Actor.create({
          name: npc.name,
          type: 'npc',
          img: npc.avatar || 'icons/svg/mystery-man.svg',
          system: {
            details: {
              biography: { value: npc.bio },
              notes: `${npc.title} | ${npc.role}`
            }
          },
          flags: {
            'hintz-manor': {
              npcId: npc.id,
              role: npc.role,
              category: npc.category,
              personality: npc.personality,
              startingRoom: npc.startingRoom
            }
          }
        });
        ui.notifications.info(`Hintz Manor: Imported Actor "${npc.name}" into world.`);
      }
      created.push(existing);
    }

    return created;
  }
}
