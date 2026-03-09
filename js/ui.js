/**
 * UI - UI helper functions
 */

export class UI {
  constructor() {
    this.toast = null;
  }

  showToast(message, duration = 3000) {
    // Remove existing toast
    this.hideToast();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-elevated);
      color: var(--text);
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    this.toast = toast;
    
    setTimeout(() => this.hideToast(), duration);
  }

  hideToast() {
    if (this.toast) {
      this.toast.remove();
      this.toast = null;
    }
  }

  showLoading() {
    const loader = document.createElement('div');
    loader.className = 'loading';
    loader.innerHTML = '<div class="spinner"></div>';
    loader.id = 'global-loader';
    loader.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000;';
    document.body.appendChild(loader);
  }

  hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.remove();
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatCountdown(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Check if element is in viewport
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Scroll to element
  scrollTo(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!');
      return true;
    } catch (e) {
      console.error('Copy failed:', e);
      return false;
    }
  }

  // Confirm dialog
  confirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      `;
      
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: var(--bg-card);
        padding: 24px;
        border-radius: 16px;
        max-width: 320px;
        text-align: center;
      `;
      
      dialog.innerHTML = `
        <p style="margin-bottom: 20px; color: var(--text);">${message}</p>
        <button id="confirm-yes" class="btn btn-primary" style="margin-bottom: 8px;">Yes</button>
        <button id="confirm-no" class="btn btn-outline">No</button>
      `;
      
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      document.getElementById('confirm-yes').onclick = () => {
        overlay.remove();
        resolve(true);
      };
      
      document.getElementById('confirm-no').onclick = () => {
        overlay.remove();
        resolve(false);
      };
    });
  }
}

// Make UI globally available
window.ui = new UI();
