import { RegionManager } from './RegionManager.js';
import { HINTZ_MANOR } from '../config.js';

/**
 * TrackingEngine records per-turn snapshots of token locations, room transitions,
 * sightlines (visible tokens via raycasting), and co-travel history.
 */
export class TrackingEngine {
  /**
   * Captures a turn snapshot when a combat turn ends or a token moves.
   * @param {Combatant|TokenDocument} entity 
   * @returns {Object} Immutable turn log entry
   */
  static recordTurnSnapshot(entity) {
    if (!canvas?.ready) return null;

    const token = entity.token || entity;
    if (!token) return null;

    const tokenId = token.id;
    const actorName = token.name || 'Unknown Character';
    const currentRoom = RegionManager.getRoomAt(token);
    const round = game.combat?.round || 1;
    const turn = game.combat?.turn || 0;

    // 1. Raycast Line-of-Sight Check to find all visible tokens
    const visibleTokens = this.getVisibleTokensFor(token);

    // 2. Identify co-occupants (tokens in the exact same room)
    const coOccupants = this.getTokensInRoom(currentRoom, tokenId);

    const logEntry = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      round,
      turn,
      tokenId,
      actorName,
      room: currentRoom,
      coords: { x: Math.round(token.x), y: Math.round(token.y) },
      visibleTokenIds: visibleTokens.map(t => t.id),
      visibleTokenNames: visibleTokens.map(t => t.name),
      coOccupantNames: coOccupants.map(t => t.name),
      isNPC: !token.actor?.hasPlayerOwner
    };

    // Save to world log history
    this.appendTurnLog(logEntry);
    return logEntry;
  }

  /**
   * Raycasts vision from source token to all other tokens on scene to test line-of-sight.
   * @param {TokenDocument|Token} sourceToken 
   * @returns {Token[]} Tokens visible to sourceToken
   */
  static getVisibleTokensFor(sourceToken) {
    const visible = [];
    if (!canvas?.ready) return visible;

    const sourceCenter = sourceToken.center || { x: sourceToken.x, y: sourceToken.y };

    for (const otherToken of canvas.tokens.placeables) {
      if (otherToken.id === sourceToken.id || !otherToken.visible) continue;

      const targetCenter = otherToken.center || { x: otherToken.x, y: otherToken.y };

      // Raycast test against walls/occlusion
      const ray = new Ray(sourceCenter, targetCenter);
      const isBlocked = canvas.walls?.checkCollision(ray, { type: 'sight', mode: 'any' });

      if (!isBlocked) {
        visible.push(otherToken);
      }
    }

    return visible;
  }

  /**
   * Retrieves all active tokens currently occupying a specific room.
   * @param {string} roomName 
   * @param {string} excludeTokenId 
   * @returns {Token[]}
   */
  static getTokensInRoom(roomName, excludeTokenId = null) {
    if (!canvas?.ready) return [];

    return canvas.tokens.placeables.filter(token => {
      if (excludeTokenId && token.id === excludeTokenId) return false;
      return RegionManager.getRoomAt(token) === roomName;
    });
  }

  /**
   * Appends log entry to Foundry world flags.
   * @param {Object} entry 
   */
  static async appendTurnLog(entry) {
    if (!game.user.isGM) return;

    const logs = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS) || [];
    logs.push(entry);
    await game.settings.set(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS, logs);
  }

  /**
   * Gets travel history for a specific token.
   * @param {string} tokenId 
   * @returns {Object[]}
   */
  static getHistoryFor(tokenId) {
    const logs = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.TURN_LOGS) || [];
    return logs.filter(log => log.tokenId === tokenId);
  }
}
