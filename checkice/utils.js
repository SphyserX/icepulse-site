// utils.js - FONCTIONS UTILITAIRES CHECKICE
// Modales personnalisées pour remplacer les dialogues natifs du navigateur

/**
 * Modale de confirmation personnalisée
 * @param {string} title - Titre de la modale
 * @param {string} message - Message de confirmation
 * @param {string} icon - Emoji à afficher (défaut: ⚠️)
 * @returns {Promise<boolean>} - true si confirmé, false si annulé
 */
export function showCustomConfirm(title, message, icon = '⚠️') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'custom-confirm-modal';
    
    modal.innerHTML = `
      <div class="custom-confirm-content">
        <div class="custom-confirm-icon">${icon}</div>
        <h3 class="custom-confirm-title">${title}</h3>
        <p class="custom-confirm-message">${message}</p>
        <div class="custom-confirm-buttons">
          <button class="custom-confirm-btn custom-confirm-btn-cancel" id="confirm-cancel">
            Annuler
          </button>
          <button class="custom-confirm-btn custom-confirm-btn-confirm" id="confirm-ok">
            Confirmer
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Événements
    modal.querySelector('#confirm-cancel').onclick = () => {
      modal.remove();
      resolve(false);
    };
    
    modal.querySelector('#confirm-ok').onclick = () => {
      modal.remove();
      resolve(true);
    };
    
    // Fermeture au clic sur le fond
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };
  });
}

/**
 * Modale de saisie de texte personnalisée
 * @param {string} title - Titre de la modale
 * @param {string} defaultValue - Valeur par défaut
 * @param {string} placeholder - Texte d'aide
 * @returns {Promise<string|null>} - Texte saisi ou null si annulé
 */
export function showCustomPrompt(title, defaultValue = '', placeholder = 'Votre texte...') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'custom-confirm-modal';
    
    modal.innerHTML = `
      <div class="custom-confirm-content">
        <div class="custom-confirm-icon">✏️</div>
        <h3 class="custom-confirm-title">${title}</h3>
        <textarea 
          id="prompt-input" 
          class="custom-prompt-input"
          rows="4"
          placeholder="${placeholder}"
        >${defaultValue}</textarea>
        <div class="custom-confirm-buttons">
          <button class="custom-confirm-btn custom-confirm-btn-cancel" id="prompt-cancel">
            Annuler
          </button>
          <button class="custom-confirm-btn custom-confirm-btn-confirm" id="prompt-ok">
            Valider
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const input = modal.querySelector('#prompt-input');
    input.focus();
    input.select();
    
    // Événements
    modal.querySelector('#prompt-cancel').onclick = () => {
      modal.remove();
      resolve(null);
    };
    
    modal.querySelector('#prompt-ok').onclick = () => {
      const value = input.value.trim();
      modal.remove();
      resolve(value || null);
    };
    
    // Validation avec Enter (Ctrl+Enter pour nouvelle ligne)
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        const value = input.value.trim();
        modal.remove();
        resolve(value || null);
      }
    };
    
    // Fermeture au clic sur le fond
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(null);
      }
    };
  });
}
