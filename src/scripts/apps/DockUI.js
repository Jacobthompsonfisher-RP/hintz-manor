import { GMMysteryPanel } from './GMMysteryPanel.js';
import { DetectiveNotebook } from './DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;

/**
 * DockUI injects a dedicated, 100% clickable vertical control dock pinned to the top-left canvas screen.
 * Stacks vertically, avoids all right-sidebar theme wrapping/clipping issues, and guarantees full clickability.
 */
export class DockUI {
  static renderSidebarButtons() {
    // Clean up any legacy sidebar elements that caused second-column wrapping or clipping
    document.getElementById('hm-tab-notebook')?.remove();
    document.getElementById('hm-tab-gm')?.remove();
    document.getElementById('hintz-manor-vertical-dock')?.remove();

    let dock = document.getElementById('hintz-manor-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'hintz-manor-dock';
      document.body.appendChild(dock);
    }

    let html = `
      <button type="button" class="hm-dock-btn" id="hm-dock-notebook" title="Detective Notebook" aria-label="Detective Notebook">
        <i class="fa-solid fa-book-skull"></i>
      </button>
    `;

    if (game.user.isGM) {
      html += `
        <button type="button" class="hm-dock-btn" id="hm-dock-gm" title="GM Mystery Control Center" aria-label="GM Mystery Control Center">
          <i class="fa-solid fa-masks-theater"></i>
        </button>
      `;
    }

    dock.innerHTML = html;

    // Attach Event Listeners
    dock.querySelector('#hm-dock-notebook')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (!notebookInstance) notebookInstance = new DetectiveNotebook();
      notebookInstance.render(true);
    });

    dock.querySelector('#hm-dock-gm')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
      gmPanelInstance.render(true);
    });
  }
}
