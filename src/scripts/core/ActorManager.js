import { NPC_ROSTER } from '../data/NPCRoster.js';

/**
 * ActorManager handles creation and synchronization of the 13 NPC Actors into game.actors,
 * dynamically selecting valid system Actor types (supporting Beaver's System Interface and system-agnostic fallbacks).
 */
export class ActorManager {
  /**
   * Determines the valid Actor document type for the active game system.
   * @returns {string} Valid actor type string for active system
   */
  static getValidActorType() {
    if (game.modules?.get('beavers-system-interface')?.active && typeof beaversSystemInterface !== 'undefined') {
      try {
        const bsiType = beaversSystemInterface.getActorType?.('npc');
        if (bsiType) return bsiType;
      } catch (e) {
        console.warn('Hintz Manor | Error querying Beaver System Interface:', e);
      }
    }

    const validTypes = game.system?.documentTypes?.Actor || [];
    if (validTypes.includes('npc')) return 'npc';
    if (validTypes.includes('character')) return 'character';
    if (validTypes.includes('person')) return 'person';

    return validTypes[0] || 'npc';
  }

  /**
   * Imports all 13 NPC Actors into the active Foundry world if they do not exist.
   * @returns {Promise<Actor[]>} Array of created or existing Actors
   */
  static async importAllActors() {
    if (!game.user.isGM) return [];

    const actorType = this.getValidActorType();
    console.log(`Hintz Manor | System-agnostic Actor creation using type "${actorType}" for system "${game.system.id}".`);

    const created = [];
    for (const npc of NPC_ROSTER) {
      let existing = game.actors.find(a => a.name === npc.name);
      if (!existing) {
        try {
          existing = await Actor.create({
            name: npc.name,
            type: actorType,
            img: npc.avatar || 'icons/svg/mystery-man.svg',
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
        } catch (err) {
          console.warn(`Hintz Manor | Could not create Actor ${npc.name}:`, err);
        }
      }
      if (existing) created.push(existing);
    }

    ui.notifications.info(`Hintz Manor: Successfully imported 13 NPC Actors into your Actors Sidebar!`);
    return created;
  }
}
