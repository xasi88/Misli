// Minimal app behavior for the Misli PWA prototype
document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('actionBtn');
  const offlineBtn = document.getElementById('offlineBtn');
  const statusEl = document.getElementById('status');

  function updateOnlineStatus(){
    statusEl.textContent = 'Status: ' + (navigator.onLine ? 'online' : 'offline');
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  actionBtn.addEventListener('click', () => {
    alert('This is a demo action — customize app.js for your logic.');
  });

  offlineBtn.addEventListener('click', async () => {
    try{
      const resp = await fetch('./index.html', {cache: 'force-cache'});
      if (!resp.ok) throw new Error('Network response not ok');
      alert('Offline test: index.html fetched from cache or network OK.');
    }catch(e){
      alert('Offline test failed: ' + e.message);
    }
  });

  // Example hook for firebase config if provided
  if (window.firebaseConfig) {
    console.info('firebaseConfig detected (example file loaded).');
    // Initialize Firebase here if you add Firebase SDK scripts
  }

  // Simple install prompt UX
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.createElement('button');
    installBtn.className = 'btn';
    installBtn.textContent = 'Install App';
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('User choice', choice);
    });
    document.querySelector('.controls').appendChild(installBtn);
  });
});
