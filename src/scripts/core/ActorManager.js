import { NPC_ROSTER } from '../data/NPCRoster.js';

/**
 * ActorManager handles creation and synchronization of the 13 NPC Actors into game.actors,
 * dynamically selecting valid system Actor types (supporting Beaver's System Interface and system-agnostic fallbacks).
 */
export class ActorManager {
  /**
   * Determines the valid Actor document type for the active game system in Foundry V14.
   * @returns {string} Valid actor type string for active system
   */
  static getValidActorType() {
    // 1. Check Beaver's System Interface if active
    if (game.modules?.get('beavers-system-interface')?.active && typeof beaversSystemInterface !== 'undefined') {
      try {
        const bsiType = beaversSystemInterface.getActorType?.('npc');
        if (bsiType) return bsiType;
      } catch (e) {
        console.warn('Hintz Manor | Error querying Beaver System Interface:', e);
      }
    }

    // 2. Query Foundry V14 CONFIG.Actor & game.system document types
    const configTypes = Object.keys(CONFIG.Actor?.typeLabels || game.model?.Actor || {});
    const systemTypes = Array.isArray(game.system?.documentTypes?.Actor) 
      ? game.system.documentTypes.Actor 
      : configTypes;

    if (systemTypes.includes('npc')) return 'npc';
    if (systemTypes.includes('character')) return 'character';
    if (systemTypes.includes('person')) return 'person';
    if (systemTypes.includes('base')) return 'base';

    return systemTypes[0] || 'character';
  }

  /**
   * Imports all 13 NPC Actors into the active Foundry world using batch creation & single fallback.
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
          system: {},
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
        console.warn('Hintz Manor | Batch Actor creation failed, attempting single fallback:', err);
        const fallbackCreated = [];
        for (const data of toCreate) {
          try {
            const doc = await Actor.create(data);
            if (doc) fallbackCreated.push(doc);
          } catch (singleErr) {
            console.error(`Hintz Manor | Single Actor creation failed for ${data.name}:`, singleErr);
          }
        }

        if (fallbackCreated.length > 0) {
          ui.notifications.info(`Hintz Manor: Imported ${fallbackCreated.length} NPC Actors into your Actors Sidebar!`);
          return fallbackCreated;
        } else {
          ui.notifications.error(`Hintz Manor: Could not create Actors in system "${game.system.id}": ${err.message}`);
          return [];
        }
      }
    } else {
      ui.notifications.info(`Hintz Manor: All 13 NPC Actors are already present in your Actors Sidebar.`);
      return [];
    }
  }
}
