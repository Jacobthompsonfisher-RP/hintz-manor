import { RegionManager } from './RegionManager.js';
import { RoomGraph } from './RoomGraph.js';
import { HINTZ_MANOR } from '../config.js';

/**
 * NPCMovementPlanner implements cascading behavioral rules to calculate suggested NPC travel paths:
 * 1. Co-travel probability with current room co-occupants
 * 2. Agenda / Tool attraction vectoring
 * 3. Novelty-weighted room selection among reachable options
 */
export class NPCMovementPlanner {
  constructor() {
    this.roomGraph = new RoomGraph();
  }

  /**
   * Plans the next turn movement for an NPC token based on cascading rules.
   * @param {TokenDocument|Token} npcToken - The NPC token
   * @param {Object} options - Travel context (co-occupants, history, target tools)
   * @returns {Object} { suggestedRoom, coTraveledWith, pathReason }
   */
  planMovement(npcToken, options = {}) {
    const currentRoom = RegionManager.getRoomAt(npcToken);
    const coOccupants = options.coOccupants || [];
    const travelHistory = options.travelHistory || [];
    const targetToolRoom = options.targetToolRoom || null;

    const coTravelProb = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.SETTINGS.CO_TRAVEL_PROBABILITY) ?? 0.5;
    const noveltyWeight = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.SETTINGS.NOVELTY_WEIGHT) ?? 0.7;

    // --- Rule 1: Co-Travel Evaluation ---
    if (coOccupants.length > 0 && Math.random() < coTravelProb) {
      // Pick a co-occupant to follow
      const targetPartner = coOccupants[Math.floor(Math.random() * coOccupants.length)];
      const partnerNextRoom = options.partnerDestinations?.[targetPartner.id] || null;

      if (partnerNextRoom && partnerNextRoom !== currentRoom) {
        return {
          suggestedRoom: partnerNextRoom,
          coTraveledWith: targetPartner.name,
          pathReason: `Co-traveling with ${targetPartner.name} (${Math.round(coTravelProb * 100)}% odds triggered)`
        };
      }
    }

    // --- Rule 2: Agenda / Tool Attraction Vectoring ---
    if (targetToolRoom && targetToolRoom !== currentRoom) {
      const adjacent = this.roomGraph.getAdjacentRooms(currentRoom);
      if (adjacent.includes(targetToolRoom)) {
        return {
          suggestedRoom: targetToolRoom,
          coTraveledWith: null,
          pathReason: `Seeking required crime tool in ${targetToolRoom}`
        };
      }
    }

    // --- Rule 3: Novelty-Weighted Room Selection ---
    const reachable = this.roomGraph.getReachableRooms(currentRoom, 1);
    if (reachable.length === 0) {
      return { suggestedRoom: currentRoom, coTraveledWith: null, pathReason: 'No reachable rooms' };
    }

    const visitedRooms = new Set(travelHistory.map(entry => entry.room));

    // Calculate selection weights for reachable rooms
    const weightedRooms = reachable.map(room => {
      const isUnvisited = !visitedRooms.has(room);
      const isCurrent = room === currentRoom;
      
      let weight = 1.0;
      if (isUnvisited) {
        weight += noveltyWeight * 2.0; // Higher weight for unvisited rooms
      } else if (isCurrent) {
        weight *= 0.3; // Lower weight to linger in current room
      }

      return { room, weight };
    });

    // Weighted random selection
    const totalWeight = weightedRooms.reduce((sum, item) => sum + item.weight, 0);
    let randomVal = Math.random() * totalWeight;
    let chosenRoom = currentRoom;

    for (const item of weightedRooms) {
      if (randomVal <= item.weight) {
        chosenRoom = item.room;
        break;
      }
      randomVal -= item.weight;
    }

    const isNovel = !visitedRooms.has(chosenRoom);
    return {
      suggestedRoom: chosenRoom,
      coTraveledWith: null,
      pathReason: isNovel ? `Selected novel unvisited room (${chosenRoom})` : `Exploring adjacent room (${chosenRoom})`
    };
  }
}
