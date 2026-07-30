import { GMMysteryPanel } from './GMMysteryPanel.js';
import { DetectiveNotebook } from './DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;

/**
 * DockUI injects native tab buttons directly into Foundry's #sidebar-tabs container.
 * This guarantees 100% compatibility with any UI theme/module, matching Foundry's exact
 * icon stacking, vertical layout, tooltips, and open/close sliding behavior.
 */
export class DockUI {
  static renderSidebarButtons() {
    const sidebarTabs = document.querySelector('#sidebar-tabs');
    if (!sidebarTabs) return;

    // Clean up any legacy custom dock wrappers if present
    document.getElementById('hintz-manor-vertical-dock')?.remove();
    document.getElementById('hintz-manor-dock')?.remove();

    // 1. Inject Detective Notebook Tab into #sidebar-tabs
    if (!document.getElementById('hm-tab-notebook')) {
      const notebookBtn = document.createElement('a');
      notebookBtn.id = 'hm-tab-notebook';
      notebookBtn.className = 'item hintz-manor-sidebar-tab';
      notebookBtn.setAttribute('data-tab', 'hintz-notebook');
      notebookBtn.setAttribute('data-tooltip', 'Detective Notebook');
      notebookBtn.setAttribute('aria-label', 'Detective Notebook');
      notebookBtn.innerHTML = '<i class="fa-solid fa-book-skull"></i>';

      notebookBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!notebookInstance) notebookInstance = new DetectiveNotebook();
        notebookInstance.render(true);
      });

      sidebarTabs.appendChild(notebookBtn);
    }

    // 2. Inject GM Control Center Tab into #sidebar-tabs (GM Only)
    if (game.user.isGM && !document.getElementById('hm-tab-gm')) {
      const gmBtn = document.createElement('a');
      gmBtn.id = 'hm-tab-gm';
      gmBtn.className = 'item hintz-manor-sidebar-tab';
      gmBtn.setAttribute('data-tab', 'hintz-gm-panel');
      gmBtn.setAttribute('data-tooltip', 'GM Mystery Control Center');
      gmBtn.setAttribute('aria-label', 'GM Mystery Control Center');
      gmBtn.innerHTML = '<i class="fa-solid fa-masks-theater"></i>';

      gmBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
        gmPanelInstance.render(true);
      });

      sidebarTabs.appendChild(gmBtn);
    }
  }
}
