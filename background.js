// Track if our game is already open
let gameTabId = null;
let isOffline = false;
let connectionCheckInterval = null;

// Listen for installation and startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  setupConnectionChecking();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  setupConnectionChecking();
});

// Listen for network changes
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.error === 'net::ERR_INTERNET_DISCONNECTED' || 
        details.error === 'net::ERR_NETWORK_CHANGED' ||
        details.error === 'net::ERR_NAME_NOT_RESOLVED') {
      console.log("Network error detected:", details.error);
      handleOfflineStatus();
    }
  },
  {urls: ["<all_urls>"]}
);

function setupConnectionChecking() {
  // Clear any existing interval
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  // Check immediately
  checkConnection();
  
  // Set up periodic checking every 5 seconds
  connectionCheckInterval = setInterval(checkConnection, 5000);
}

// Function to check connection status
function checkConnection() {
  // First check using navigator.onLine
  if (!navigator.onLine) {
    console.log("Device reports offline");
    handleOfflineStatus();
    return;
  }
  
  // Double-check with a fetch to a reliable endpoint
  fetch('https://www.gstatic.com/generate_204', { 
    method: 'HEAD', 
    mode: 'no-cors',
    cache: 'no-store',
    // Set a timeout to avoid long waits
    signal: AbortSignal.timeout(2000)
  })
  .then(() => {
    // We're online
    if (isOffline) {
      console.log('Status changed: back online');
      isOffline = false;
    }
  })
  .catch((error) => {
    console.log('Network check failed:', error);
    handleOfflineStatus();
  });
}

function handleOfflineStatus() {
  if (!isOffline) {
    console.log('Status changed: offline');
    isOffline = true;
    openOfflineGame();
  }
}

// Function to open our offline game
function openOfflineGame() {
  console.log("Attempting to open offline game");
  
  // Check if we already have a game tab open
  if (gameTabId !== null) {
    console.log("Game tab exists, focusing it:", gameTabId);
    // Focus the existing tab instead of opening a new one
    chrome.tabs.get(gameTabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.log("Tab doesn't exist anymore:", chrome.runtime.lastError);
        // Tab doesn't exist anymore, open a new one
        createGameTab();
      } else {
        chrome.tabs.update(gameTabId, { active: true });
      }
    });
  } else {
    console.log("No game tab exists, creating new one");
    createGameTab();
  }
}

// Create a new game tab
function createGameTab() {
  chrome.tabs.create({ url: 'offline.html' }, (tab) => {
    console.log("Created new game tab:", tab.id);
    gameTabId = tab.id;
    
    // Listen for tab close to reset our tracking
    chrome.tabs.onRemoved.addListener(function tabCloseListener(tabId) {
      if (tabId === gameTabId) {
        console.log("Game tab closed:", tabId);
        gameTabId = null;
        chrome.tabs.onRemoved.removeListener(tabCloseListener);
      }
    });
  });
}

// Handle browser action click (still keep this for manual activation)
chrome.action.onClicked.addListener(() => {
  console.log("Browser action clicked");
  openOfflineGame();
}); 