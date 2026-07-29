import { GMMysteryPanel } from './GMMysteryPanel.js';
import { DetectiveNotebook } from './DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;

/**
 * DockUI integrates Hintz Manor control buttons directly into Foundry's right-hand sidebar tabs (#sidebar-tabs),
 * adopting native Foundry UI styling, tooltips, and collapsing behavior.
 */
export class DockUI {
  static renderSidebarButtons() {
    const sidebarTabs = document.querySelector('#sidebar-tabs');
    if (!sidebarTabs) return;

    // Check if notebook button already exists
    if (!document.getElementById('hm-sidebar-notebook')) {
      const notebookBtn = document.createElement('a');
      notebookBtn.id = 'hm-sidebar-notebook';
      notebookBtn.className = 'item hintz-manor-tab';
      notebookBtn.setAttribute('data-tooltip', 'Detective Notebook');
      notebookBtn.setAttribute('aria-label', 'Detective Notebook');
      notebookBtn.innerHTML = '<i class="fa-solid fa-book-skull"></i>';

      notebookBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!notebookInstance) notebookInstance = new DetectiveNotebook();
        notebookInstance.render(true);
      });

      sidebarTabs.appendChild(notebookBtn);
    }

    // Check if GM button already exists (GM only)
    if (game.user.isGM && !document.getElementById('hm-sidebar-gm')) {
      const gmBtn = document.createElement('a');
      gmBtn.id = 'hm-sidebar-gm';
      gmBtn.className = 'item hintz-manor-tab';
      gmBtn.setAttribute('data-tooltip', 'GM Mystery Control Center');
      gmBtn.setAttribute('aria-label', 'GM Mystery Control Center');
      gmBtn.innerHTML = '<i class="fa-solid fa-masks-theater"></i>';

      gmBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
        gmPanelInstance.render(true);
      });

      sidebarTabs.appendChild(gmBtn);
    }
  }
}
