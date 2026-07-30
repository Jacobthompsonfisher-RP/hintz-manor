import { GMMysteryPanel } from './GMMysteryPanel.js';
import { DetectiveNotebook } from './DetectiveNotebook.js';

let gmPanelInstance = null;
let notebookInstance = null;

/**
 * DockUI injects native control buttons into Foundry V14 ApplicationV2 Sidebar Directories
 * (JournalDirectory, ActorDirectory, SceneDirectory, Settings) using render directory hooks.
 */
export class DockUI {
  static registerHooks() {
    // 1. Inject Detective Notebook into Journal Directory Header (.header-actions)
    Hooks.on('renderJournalDirectory', (app, html) => {
      const root = html instanceof HTMLElement ? html : html[0];
      if (!root) return;

      const headerActions = root.querySelector('.header-actions') || root.querySelector('.directory-header');
      if (headerActions && !root.querySelector('#hm-journal-notebook-btn')) {
        const btn = document.createElement('button');
        btn.id = 'hm-journal-notebook-btn';
        btn.type = 'button';
        btn.className = 'hintz-notebook-btn';
        btn.title = 'Detective Notebook';
        btn.innerHTML = '<i class="fa-solid fa-book-skull"></i> Notebook';
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          if (!notebookInstance) notebookInstance = new DetectiveNotebook();
          notebookInstance.render(true);
        });
        headerActions.prepend(btn);
      }
    });

    // 2. Inject GM Mystery Panel into Actor Directory Header (GM Only)
    Hooks.on('renderActorDirectory', (app, html) => {
      if (!game.user.isGM) return;
      const root = html instanceof HTMLElement ? html : html[0];
      if (!root) return;

      const headerActions = root.querySelector('.header-actions') || root.querySelector('.directory-header');
      if (headerActions && !root.querySelector('#hm-actor-gm-btn')) {
        const btn = document.createElement('button');
        btn.id = 'hm-actor-gm-btn';
        btn.type = 'button';
        btn.className = 'hintz-gm-btn';
        btn.title = 'GM Mystery Control Panel';
        btn.innerHTML = '<i class="fa-solid fa-masks-theater"></i> GM Mystery Panel';
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
          gmPanelInstance.render(true);
        });
        headerActions.prepend(btn);
      }
    });

    // 3. Inject GM Mystery Panel into Scene Directory Header (GM Only)
    Hooks.on('renderSceneDirectory', (app, html) => {
      if (!game.user.isGM) return;
      const root = html instanceof HTMLElement ? html : html[0];
      if (!root) return;

      const headerActions = root.querySelector('.header-actions') || root.querySelector('.directory-header');
      if (headerActions && !root.querySelector('#hm-scene-gm-btn')) {
        const btn = document.createElement('button');
        btn.id = 'hm-scene-gm-btn';
        btn.type = 'button';
        btn.className = 'hintz-gm-btn';
        btn.title = 'GM Mystery Control Panel';
        btn.innerHTML = '<i class="fa-solid fa-masks-theater"></i> GM Mystery Panel';
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
          gmPanelInstance.render(true);
        });
        headerActions.prepend(btn);
      }
    });

    // 4. Inject Control Section into Settings Sidebar Tab (GM & Players)
    Hooks.on('renderSettings', (app, html) => {
      const root = html instanceof HTMLElement ? html : html[0];
      if (!root) return;

      const settingsList = root.querySelector('#settings-documentation') || root.querySelector('#settings-game');
      if (settingsList && !root.querySelector('#hm-settings-section')) {
        const section = document.createElement('div');
        section.id = 'hm-settings-section';
        section.style.margin = '0.5rem 0';
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.gap = '0.4rem';

        let btnHtml = `
          <button type="button" class="hm-btn-secondary" id="hm-settings-notebook-btn">
            <i class="fa-solid fa-book-skull"></i> Detective Notebook
          </button>
        `;

        if (game.user.isGM) {
          btnHtml += `
            <button type="button" class="hm-btn-primary" id="hm-settings-gm-btn">
              <i class="fa-solid fa-masks-theater"></i> GM Mystery Control Center
            </button>
          `;
        }

        section.innerHTML = btnHtml;
        settingsList.before(section);

        section.querySelector('#hm-settings-notebook-btn')?.addEventListener('click', () => {
          if (!notebookInstance) notebookInstance = new DetectiveNotebook();
          notebookInstance.render(true);
        });

        section.querySelector('#hm-settings-gm-btn')?.addEventListener('click', () => {
          if (!gmPanelInstance) gmPanelInstance = new GMMysteryPanel();
          gmPanelInstance.render(true);
        });
      }
    });
  }

  static renderSidebarButtons() {
    // Legacy stub
  }
}
