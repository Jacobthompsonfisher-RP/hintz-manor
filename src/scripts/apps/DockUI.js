import { GMMysteryPanel } from './GMMysteryPanel.js';
import { DetectiveNotebook } from './DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;

/**
 * DockUI integrates Hintz Manor control buttons into Foundry's right-hand sidebar directory headers
 * (JournalDirectory, ActorDirectory, SceneDirectory) using official Foundry header button APIs.
 * Buttons live strictly on the right-hand side inside native sidebar headers and collapse seamlessly.
 */
export class DockUI {
  static registerHooks() {
    // Remove any legacy floating divs or custom absolute docks
    document.getElementById('hintz-manor-dock')?.remove();
    document.getElementById('hintz-manor-vertical-dock')?.remove();

    // 1. Add Detective Notebook button to Journal Directory Header (Right-hand sidebar)
    Hooks.on('getJournalDirectoryHeaderButtons', (app, buttons) => {
      buttons.unshift({
        label: 'Detective Notebook',
        class: 'hintz-notebook-btn',
        icon: 'fa-solid fa-book-skull',
        onclick: () => {
          if (!notebookInstance) notebookInstance = new DetectiveNotebook();
          notebookInstance.render(true);
        }
      });
    });

    // 2. Add GM Control Center button to Actor Directory Header (Right-hand sidebar, GM Only)
    Hooks.on('getActorDirectoryHeaderButtons', (app, buttons) => {
      if (game.user.isGM) {
        buttons.unshift({
          label: 'GM Mystery Panel',
          class: 'hintz-gm-btn',
          icon: 'fa-solid fa-masks-theater',
          onclick: () => {
            if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
            gmPanelInstance.render(true);
          }
        });
      }
    });

    // 3. Add GM Control Center button to Scene Directory Header (Right-hand sidebar, GM Only)
    Hooks.on('getSceneDirectoryHeaderButtons', (app, buttons) => {
      if (game.user.isGM) {
        buttons.unshift({
          label: 'GM Mystery Panel',
          class: 'hintz-gm-btn',
          icon: 'fa-solid fa-masks-theater',
          onclick: () => {
            if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
            gmPanelInstance.render(true);
          }
        });
      }
    });
  }

  // Legacy helper kept for backward compatibility if called
  static renderSidebarButtons() {
    document.getElementById('hintz-manor-dock')?.remove();
    document.getElementById('hintz-manor-vertical-dock')?.remove();
  }
}
