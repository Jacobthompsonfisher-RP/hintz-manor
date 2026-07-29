import '../styles/hintz-manor.css';
import { HINTZ_MANOR } from './config.js';
import { EvidenceStore } from './core/EvidenceStore.js';
import { TrackingEngine } from './core/TrackingEngine.js';
import { NPCMovementPlanner } from './core/NPCMovementPlanner.js';
import { CrimeEngine } from './core/CrimeEngine.js';
import { GMMysteryPanel } from './apps/GMMysteryPanel.js';
import { DetectiveNotebook } from './apps/DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;
const movementPlanner = new NPCMovementPlanner();

Hooks.once('init', () => {
  console.log(`${HINTZ_MANOR.TITLE} | Initializing Hintz Manor Clue Engine (Foundry V14)...`);
  EvidenceStore.registerSettings();

  // Expose global API helper for macros / console access
  game.hintzManor = {
    openGM: () => {
      if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
      gmPanelInstance.render(true);
    },
    openNotebook: () => {
      if (!notebookInstance) notebookInstance = new DetectiveNotebook();
      notebookInstance.render(true);
    }
  };
});

Hooks.once('ready', () => {
  console.log(`${HINTZ_MANOR.TITLE} | Ready! Engine active.`);
  if (game.user.isGM) {
    ui.notifications.info(`🔎 ${HINTZ_MANOR.TITLE} Engine Active! Use Token Controls or type game.hintzManor.openGM() to open GM Control Center.`);
  }
});

/**
 * Register scene control buttons for opening the GM Control Panel and Detective Notebook.
 */
Hooks.on('getSceneControlButtons', (controls) => {
  const tokenControls = controls.find(c => c.name === 'token');
  if (tokenControls) {
    tokenControls.tools.push({
      name: 'hintz-manor-notebook',
      title: 'Detective Notebook',
      icon: 'fa-solid fa-book-skull',
      button: true,
      onClick: () => {
        if (!notebookInstance) notebookInstance = new DetectiveNotebook();
        notebookInstance.render(true);
      }
    });

    if (game.user.isGM) {
      tokenControls.tools.push({
        name: 'hintz-manor-gm-panel',
        title: 'GM Mystery Control Panel',
        icon: 'fa-solid fa-masks-theater',
        button: true,
        onClick: () => {
          if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
          gmPanelInstance.render(true);
        }
      });
    }
  }
});

/**
 * Combat Turn Update Hook:
 * Records turn snapshot, evaluates cascading NPC movement, and tests crime opportunity isolation.
 */
Hooks.on('updateCombat', async (combat, updateData) => {
  if (!game.user.isGM) return;

  const currentCombatant = combat.combatant;
  if (!currentCombatant) return;

  const logEntry = TrackingEngine.recordTurnSnapshot(currentCombatant);

  const token = currentCombatant.token;
  if (!token) return;

  const isNPC = !token.actor?.hasPlayerOwner;
  if (isNPC) {
    const coOccupants = TrackingEngine.getTokensInRoom(logEntry?.room, token.id);
    const history = TrackingEngine.getHistoryFor(token.id);

    const mysteryState = game.settings.get(HINTZ_MANOR.ID, HINTZ_MANOR.FLAGS.MYSTERY_STATE);
    const requiredWeapon = mysteryState?.requiredWeapon;
    const targetToolRoom = mysteryState?.roomWeaponLocations?.[requiredWeapon] || null;

    const plan = movementPlanner.planMovement(token, {
      coOccupants,
      travelHistory: history,
      targetToolRoom
    });

    if (plan.suggestedRoom && plan.suggestedRoom !== logEntry?.room) {
      ui.notifications.info(`🧭 ${token.name} (${plan.pathReason}): Suggested destination -> ${plan.suggestedRoom}`);
    }
  }

  await CrimeEngine.evaluateCrimeOpportunity();
});

/**
 * Token Movement Hook:
 * Records snapshot when a token moves across canvas.
 */
Hooks.on('updateToken', async (tokenDoc, updateData) => {
  if (!game.user.isGM) return;

  if ('x' in updateData || 'y' in updateData) {
    TrackingEngine.recordTurnSnapshot(tokenDoc);
    await CrimeEngine.evaluateCrimeOpportunity();
  }
});
