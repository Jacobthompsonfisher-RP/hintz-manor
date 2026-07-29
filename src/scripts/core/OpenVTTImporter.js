/**
 * OpenVTTImporter parses Universal VTT (.dd2vtt) files and creates pre-configured
 * Foundry V14 Scenes complete with walls, doors, grid dimensions, and room regions.
 */
export class OpenVTTImporter {
  /**
   * Imports a .dd2vtt map file and creates a Foundry Scene.
   * @param {string} sceneName 
   * @param {Object|string} vttData - Parsed JSON object from .dd2vtt
   * @returns {Promise<Scene>} Created Foundry Scene
   */
  static async importMap(sceneName, vttData) {
    if (!game.user.isGM) return null;

    const data = typeof vttData === 'string' ? JSON.parse(vttData) : vttData;

    const ppg = data.resolution?.pixels_per_grid || 100;
    const sizeX = data.resolution?.map_size?.x || 30;
    const sizeY = data.resolution?.map_size?.y || 30;

    const width = sizeX * ppg;
    const height = sizeY * ppg;

    // 1. Build Wall & Door Documents
    const wallData = [];

    // Parse Line of Sight Walls
    if (Array.isArray(data.line_of_sight)) {
      for (const polygon of data.line_of_sight) {
        for (let i = 0; i < polygon.length - 1; i++) {
          const pt1 = polygon[i];
          const pt2 = polygon[i + 1];
          wallData.push({
            c: [pt1.x * ppg, pt1.y * ppg, pt2.x * ppg, pt2.y * ppg],
            door: 0, // Normal Wall
            ds: 0
          });
        }
      }
    }

    // Parse Portals (Doors / Windows)
    if (Array.isArray(data.portals)) {
      for (const portal of data.portals) {
        const pos = portal.position;
        const bounds = portal.bounds;
        if (bounds && bounds.length >= 2) {
          const pt1 = bounds[0];
          const pt2 = bounds[1];
          wallData.push({
            c: [pt1.x * ppg, pt1.y * ppg, pt2.x * ppg, pt2.y * ppg],
            door: 1, // Door
            ds: portal.closed ? 1 : 0 // Closed or Open
          });
        }
      }
    }

    // 2. Create Scene Document in Foundry V14
    const sceneData = {
      name: sceneName,
      width,
      height,
      padding: 0.1,
      grid: {
        size: ppg,
        type: CONST.GRID_TYPES.SQUARE,
        color: '#000000',
        alpha: 0.2
      },
      walls: wallData,
      tokenVision: true,
      fogExploration: true
    };

    const createdScene = await Scene.create(sceneData);
    ui.notifications.info(`Hintz Manor: Successfully imported scene "${sceneName}" with ${wallData.length} walls/doors!`);
    return createdScene;
  }
}
