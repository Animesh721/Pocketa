import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Add to home screen prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Show install button or notification to user
  showInstallPrompt();
});

function showInstallPrompt() {
  // You can show a custom install prompt here
  console.log('App can be installed');

  // Example: Show a banner or button to install the app
  if (deferredPrompt) {
    const installBanner = document.createElement('div');
    installBanner.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; background: #3b82f6; color: white; padding: 12px; text-align: center; z-index: 1000; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <span style="margin-right: 16px;">📱 Install Pocketa for quick access!</span>
        <button id="install-btn" style="background: white; color: #3b82f6; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">Install</button>
        <button id="dismiss-btn" style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 4px; margin-left: 8px; cursor: pointer;">Later</button>
      </div>
    `;

    document.body.appendChild(installBanner);

    document.getElementById('install-btn').addEventListener('click', () => {
      installBanner.remove();
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
      });
    });

    document.getElementById('dismiss-btn').addEventListener('click', () => {
      installBanner.remove();
    });
  }
}