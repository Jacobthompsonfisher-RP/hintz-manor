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
   * Imports all 13 NPC Actors into the active Foundry world using batch document creation.
   * @returns {Promise<Actor[]>} Array of created Actors
   */
  static async importAllActors() {
    if (!game.user.isGM) return [];

    const actorType = this.getValidActorType();
    console.log(`Hintz Manor | System-agnostic Actor creation using type "${actorType}" for system "${game.system.id}".`);

    const toCreate = [];
    for (const npc of NPC_ROSTER) {
      const existing = game.actors.find(a => a.name === npc.name);
      if (!existing) {
        toCreate.push({
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
      }
    }

    if (toCreate.length > 0) {
      try {
        const created = await Actor.createDocuments(toCreate);
        ui.notifications.info(`Hintz Manor: Successfully imported ${created.length} NPC Actors into your Actors Sidebar!`);
        return created;
      } catch (err) {
        console.error('Hintz Manor | Error creating Actor documents:', err);
        ui.notifications.error(`Hintz Manor: Error creating Actors: ${err.message}`);
        return [];
      }
    } else {
      ui.notifications.info(`Hintz Manor: All 13 NPC Actors are already present in your Actors Sidebar.`);
      return [];
    }
  }
}
