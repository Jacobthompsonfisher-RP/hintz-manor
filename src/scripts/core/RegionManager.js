/**
 * RegionManager handles room identification by mapping Token coordinates
 * to Scene Regions or Drawing boundaries on the active canvas.
 */
export class RegionManager {
  /**
   * Identifies which named Room a token or x,y coordinate resides in.
   * @param {TokenDocument|Token|{x: number, y: number}} target - Token or coordinate object
   * @returns {string} Room name or "Corridor / Unknown"
   */
  static getRoomAt(target) {
    if (!canvas?.ready) return 'Unknown';

    const point = {
      x: target.x ?? target.center?.x ?? 0,
      y: target.y ?? target.center?.y ?? 0
    };

    // 1. Check Foundry Scene Regions (V14 native API)
    if (canvas.regions?.placeables) {
      for (const region of canvas.regions.placeables) {
        const regionName = region.document.name || region.document.label;
        if (!regionName || regionName.toLowerCase().startsWith('unnamed')) continue;

        if (region.testPoint(point)) {
          return regionName;
        }
      }
    }

    // 2. Check Drawings tagged as Rooms (Fallback for V11/V12 compatibility)
    if (canvas.drawings?.placeables) {
      for (const drawing of canvas.drawings.placeables) {
        const text = drawing.document.text?.trim();
        if (!text) continue;

        const bounds = drawing.bounds;
        if (
          point.x >= bounds.x &&
          point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y &&
          point.y <= bounds.y + bounds.height
        ) {
          return text;
        }
      }
    }

    return 'Corridor';
  }

  /**
   * Retrieves all defined Room names on the active scene.
   * @returns {string[]} List of room names
   */
  static getAllRooms() {
    const rooms = new Set();
    if (!canvas?.ready) return Array.from(rooms);

    if (canvas.regions?.placeables) {
      for (const region of canvas.regions.placeables) {
        const name = region.document.name || region.document.label;
        if (name && !name.toLowerCase().startsWith('unnamed')) {
          rooms.add(name);
        }
      }
    }

    if (canvas.drawings?.placeables) {
      for (const drawing of canvas.drawings.placeables) {
        const text = drawing.document.text?.trim();
        if (text) rooms.add(text);
      }
    }

    if (rooms.size === 0) {
      // Default fallback rooms if scene has no region tags yet
      return ['Library', 'Study', 'Hall', 'Conservatory', 'Billiard Room', 'Ballroom', 'Dining Room', 'Kitchen', 'Lounge'];
    }

    return Array.from(rooms);
  }
}
