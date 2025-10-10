// modal-manager.js - Gestionnaire de modales centralisé
class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.zIndexBase = 9999;
    }

    // Ouvrir une modale
    openModal(modalElement, options = {}) {
        this.closeAllModals(); // Fermer les autres modales d'abord
        
        const zIndex = this.zIndexBase + this.activeModals.size;
        modalElement.style.zIndex = zIndex;
        modalElement.classList.add('active');
        
        this.activeModals.add(modalElement);
        document.body.classList.add('modal-open'); // Empêcher le scroll

        // Auto-focus sur le premier élément focusable
        if (options.autoFocus !== false) {
            const focusableElement = modalElement.querySelector('input, button, textarea, select');
            if (focusableElement) {
                setTimeout(() => focusableElement.focus(), 100);
            }
        }

        // Listener pour fermer avec Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modalElement);
            }
        };
        modalElement._escapeListener = handleEscape;
        document.addEventListener('keydown', handleEscape);

        return modalElement;
    }

    // Fermer une modale spécifique
    closeModal(modalElement) {
        if (!this.activeModals.has(modalElement)) return;

        modalElement.classList.remove('active');
        this.activeModals.delete(modalElement);

        // Nettoyer les listeners
        if (modalElement._escapeListener) {
            document.removeEventListener('keydown', modalElement._escapeListener);
            delete modalElement._escapeListener;
        }

        // Réactiver le scroll si c'est la dernière modale
        if (this.activeModals.size === 0) {
            document.body.classList.remove('modal-open');
        }
    }

    // Fermer toutes les modales
    closeAllModals() {
        Array.from(this.activeModals).forEach(modal => {
            this.closeModal(modal);
        });
    }

    // Vérifier si une modale est active
    isModalActive(modalElement) {
        return this.activeModals.has(modalElement);
    }

    // Obtenir le nombre de modales actives
    getActiveModalsCount() {
        return this.activeModals.size;
    }
}

export const modalManager = new ModalManager();

// Utilitaire pour créer une modale facilement
export function createModal(content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content frost-effect">
            ${content}
        </div>
    `;

    // Fermer en cliquant sur l'arrière-plan
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modalManager.closeModal(modal);
        }
    });

    document.body.appendChild(modal);
    return modal;
}
