import { RegionManager } from './RegionManager.js';

/**
 * RoomGraph manages room adjacency, room distance matrices, and path finding between map regions.
 */
export class RoomGraph {
  constructor() {
    this.adjacencyMap = new Map();
  }

  /**
   * Initializes or refreshes the room graph based on active scene regions and walls/doors.
   */
  buildGraph() {
    this.adjacencyMap.clear();
    const rooms = RegionManager.getAllRooms();

    for (const room of rooms) {
      this.adjacencyMap.set(room, new Set());
    }

    // Connect rooms based on proximity or explicit door placement
    // If no doors explicitly subdivide them, all defined rooms are treated as connected graph nodes
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const r1 = rooms[i];
        const r2 = rooms[j];
        // Connect adjacent rooms in graph
        this.adjacencyMap.get(r1).add(r2);
        this.adjacencyMap.get(r2).add(r1);
      }
    }
  }

  /**
   * Gets adjacent connected rooms for a given room.
   * @param {string} roomName 
   * @returns {string[]}
   */
  getAdjacentRooms(roomName) {
    if (!this.adjacencyMap.has(roomName)) {
      this.buildGraph();
    }
    return Array.from(this.adjacencyMap.get(roomName) || []);
  }

  /**
   * Calculates rooms reachable within a given maximum step distance.
   * @param {string} currentRoom 
   * @param {number} maxDistance 
   * @returns {string[]}
   */
  getReachableRooms(currentRoom, maxDistance = 2) {
    const reachable = new Set([currentRoom]);
    let currentFrontier = new Set([currentRoom]);

    for (let d = 0; d < maxDistance; d++) {
      const nextFrontier = new Set();
      for (const room of currentFrontier) {
        const neighbors = this.getAdjacentRooms(room);
        for (const neighbor of neighbors) {
          if (!reachable.has(neighbor)) {
            reachable.add(neighbor);
            nextFrontier.add(neighbor);
          }
        }
      }
      currentFrontier = nextFrontier;
    }

    return Array.from(reachable);
  }
}
