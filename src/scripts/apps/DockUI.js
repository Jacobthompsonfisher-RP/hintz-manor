import { HINTZ_MANOR } from '../config.js';
import { GMMysteryPanel } from './GMMysteryPanel.js';
import { DetectiveNotebook } from './DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;

/**
 * DockUI injects a persistent, sleek floating UI dock onto the screen
 * giving GMs and Players 1-click access to the Mystery Control Center and Notebook.
 */
export class DockUI {
  static renderDock() {
    if (document.getElementById('hintz-manor-dock')) return;

    const dock = document.createElement('div');
    dock.id = 'hintz-manor-dock';

    let html = `
      <button type="button" class="hm-dock-btn" id="hm-dock-notebook" title="Open Detective Notebook">
        <i class="fa-solid fa-book-skull"></i> Notebook
      </button>
    `;

    if (game.user.isGM) {
      html += `
        <button type="button" class="hm-dock-btn" id="hm-dock-gm" title="Open GM Control Center">
          <i class="fa-solid fa-masks-theater"></i> GM Mystery Panel
        </button>
      `;
    }

    dock.innerHTML = html;
    document.body.appendChild(dock);

    // Event Listeners
    dock.querySelector('#hm-dock-notebook')?.addEventListener('click', () => {
      if (!notebookInstance) notebookInstance = new DetectiveNotebook();
      notebookInstance.render(true);
    });

    dock.querySelector('#hm-dock-gm')?.addEventListener('click', () => {
      if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
      gmPanelInstance.render(true);
    });
  }
}
