// Script pour la page de paramètres

document.addEventListener('DOMContentLoaded', () => {
  console.log('Options page chargée');

  // Charger les paramètres sauvegardés
  loadSettings();

  // Configurer les événements
  setupEventListeners();
});

// Configuration des événements
function setupEventListeners() {
  // Navigation entre onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Toggle visibilité de la clé API
  document.getElementById('toggle-visibility').addEventListener('click', toggleApiKeyVisibility);

  // Sauvegarder les paramètres
  document.getElementById('save-settings').addEventListener('click', saveSettings);

  // Tester l'API
  document.getElementById('test-api').addEventListener('click', testAPI);
}

// Changer d'onglet
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Charger les paramètres sauvegardés
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(['geminiApiKey', 'geminiModel']);

    if (result.geminiApiKey) {
      document.getElementById('api-key').value = result.geminiApiKey;
    }

    if (result.geminiModel) {
      document.getElementById('model-select').value = result.geminiModel;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres:', error);
  }
}

// Sauvegarder les paramètres
async function saveSettings() {
  try {
    const apiKey = document.getElementById('api-key').value.trim();
    const model = document.getElementById('model-select').value;

    if (!apiKey) {
      showStatus('Veuillez entrer une clé API', 'error');
      return;
    }

    // Sauvegarder dans le storage local
    await browser.storage.local.set({
      geminiApiKey: apiKey,
      geminiModel: model
    });

    showStatus('Paramètres sauvegardés avec succès', 'success');

  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    showStatus('Erreur lors de la sauvegarde des paramètres', 'error');
  }
}

// Tester la connexion à l'API
async function testAPI() {
  const testResultDiv = document.getElementById('test-result');
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('model-select').value;

  if (!apiKey) {
    showTestResult('Veuillez d\'abord entrer une clé API', 'error');
    return;
  }

  testResultDiv.textContent = 'Test en cours...';
  testResultDiv.className = 'test-result';
  testResultDiv.style.display = 'block';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Réponds simplement "OK" pour confirmer que tu es opérationnel.'
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Erreur ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0) {
      showTestResult('✓ Connexion réussie ! L\'API Gemini fonctionne correctement.', 'success');
    } else {
      showTestResult('⚠ Réponse inattendue de l\'API', 'error');
    }

  } catch (error) {
    console.error('Erreur lors du test:', error);
    showTestResult(`✗ Erreur: ${error.message}`, 'error');
  }
}

// Afficher le résultat du test
function showTestResult(message, type) {
  const testResultDiv = document.getElementById('test-result');
  testResultDiv.textContent = message;
  testResultDiv.className = `test-result ${type}`;
  testResultDiv.style.display = 'block';
}

// Basculer la visibilité de la clé API
function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById('api-key');
  const iconEye = document.getElementById('icon-eye');
  const iconEyeOff = document.getElementById('icon-eye-off');

  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    if (iconEye) iconEye.style.display = 'none';
    if (iconEyeOff) iconEyeOff.style.display = '';
  } else {
    apiKeyInput.type = 'password';
    if (iconEye) iconEye.style.display = '';
    if (iconEyeOff) iconEyeOff.style.display = 'none';
  }
}

// Afficher un message de statut
function showStatus(message, type) {
  const statusDiv = document.getElementById('status-message');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.animation = 'slideInRight 0.3s reverse';
    setTimeout(() => {
      statusDiv.style.display = 'none';
      statusDiv.style.animation = '';
    }, 300);
  }, 3000);
}
