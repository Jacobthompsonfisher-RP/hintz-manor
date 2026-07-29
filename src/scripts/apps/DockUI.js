import { GMMysteryPanel } from './GMMysteryPanel.js';
import { DetectiveNotebook } from './DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;

/**
 * DockUI attaches a vertical column of native-styled control buttons to the right-hand sidebar (#sidebar).
 * Buttons stack vertically, adopt Foundry UI icon styling, and collapse/expand seamlessly with the sidebar.
 */
export class DockUI {
  static renderSidebarButtons() {
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;

    let dock = document.getElementById('hintz-manor-vertical-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'hintz-manor-vertical-dock';
      sidebar.appendChild(dock);
    }

    // Build Vertical Stack
    let html = `
      <button type="button" class="hm-sidebar-btn" id="hm-vertical-notebook" title="Detective Notebook" aria-label="Detective Notebook">
        <i class="fa-solid fa-book-skull"></i>
      </button>
    `;

    if (game.user.isGM) {
      html += `
        <button type="button" class="hm-sidebar-btn" id="hm-vertical-gm" title="GM Mystery Control Center" aria-label="GM Mystery Control Center">
          <i class="fa-solid fa-masks-theater"></i>
        </button>
      `;
    }

    dock.innerHTML = html;

    // Attach Click Handlers
    dock.querySelector('#hm-vertical-notebook')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (!notebookInstance) notebookInstance = new DetectiveNotebook();
      notebookInstance.render(true);
    });

    dock.querySelector('#hm-vertical-gm')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
      gmPanelInstance.render(true);
    });
  }
}
