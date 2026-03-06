// Script pour l'interface de composition Thunderbird

let storedKeys = { gemini: '', mistral: '' };
let currentTab = null;
let viewMode = false;    // true quand ouvert depuis la lecture d'un email
let viewMessageBody = ''; // corps du mail lu (mode view)

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');

  const tabIdParam = urlParams.get('tabId');

  // Récupérer l'onglet cible (passé par background.js)
  if (tabIdParam) {
    try {
      currentTab = await messenger.tabs.get(parseInt(tabIdParam, 10));
    } catch (e) {
      console.error('Erreur récupération onglet par ID:', e);
    }
  }

  // Fallback si pas de tabId passé (ex: mode dev ou raccourci n'ayant pas de contexte)
  if (!currentTab && mode !== 'analysis') {
    const tabs = await messenger.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      currentTab = tabs[0];
    }
  }

  // Mode lecture : charger le corps du mail affiché
  if (mode === 'view') {
    viewMode = true;
    try {
      const displayedMsg = await messenger.messageDisplay.getDisplayedMessage(currentTab.id);
      if (displayedMsg) {
        const fullMsg = await messenger.messages.getFull(displayedMsg.id);
        viewMessageBody = extractTextFromParts(fullMsg.parts);
      }
    } catch (e) {
      console.error('Erreur chargement email affiché:', e);
    }
  }

  // Initialiser l'API Gemini
  await initializeAPI();

  // Configurer les événements
  setupEventListeners();

  // Adapter l'interface selon le mode
  if (mode === 'analysis') {
    switchTab('analysis');
    document.querySelector('[data-tab="actions"]').style.display = 'none';
    document.querySelector('[data-tab="translation"]').style.display = 'none';
    document.getElementById('result-area').querySelector('.result-actions').style.display = 'none';
  } else if (mode === 'view') {
    // Masquer Remplacer/Insérer : on est en lecture seule
    document.getElementById('result-area').querySelector('.result-actions').style.display = 'none';
    // Masquer l'onglet Analyse (select multiple depuis compose n'a pas de sens ici)
    document.querySelector('[data-tab="analysis"]').style.display = 'none';
  } else if (mode === 'freePrompt') {
    switchTab('free-prompt');
  }
});


// Initialiser l'API depuis le storage
async function initializeAPI() {
  try {
    const result = await browser.storage.local.get(['apiProvider', 'geminiApiKey', 'geminiModel', 'mistralApiKey', 'mistralModel']);

    storedKeys.gemini = result.geminiApiKey || '';
    storedKeys.mistral = result.mistralApiKey || '';

    const providerSelect = document.getElementById('compose-provider-select');

    providerSelect.value = result.apiProvider || 'gemini';

    providerSelect.addEventListener('change', () => {
      updateModelOptions(providerSelect.value);
    });

    updateModelOptions(providerSelect.value, result);
  } catch (error) {
    showMessage(error.message, 'error');
    setTimeout(() => browser.runtime.openOptionsPage(), 2000);
  }
}

function updateModelOptions(provider, result = null) {
  const modelSelect = document.getElementById('compose-model-select');
  modelSelect.innerHTML = '';
  if (provider === 'gemini') {
    modelSelect.innerHTML = `
      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
      <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
      <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
    `;
    if (result && result.geminiModel) modelSelect.value = result.geminiModel;
    else if (!result) modelSelect.value = 'gemini-2.5-flash';
  } else {
    modelSelect.innerHTML = `
      <option value="mistral-large-latest">Mistral Large</option>
      <option value="pixtral-12b-2409">Pixtral 12B</option>
      <option value="mistral-small-latest">Mistral Small</option>
    `;
    if (result && result.mistralModel) modelSelect.value = result.mistralModel;
    else if (!result) modelSelect.value = 'mistral-large-latest';
  }
}

async function getActiveLLM() {
  const provider = document.getElementById('compose-provider-select').value;
  const model = document.getElementById('compose-model-select').value;

  if (provider === 'gemini') {
    if (!storedKeys.gemini) throw new Error("Clé API Gemini non configurée.");
    return new GeminiAPI(storedKeys.gemini, model);
  } else {
    if (!storedKeys.mistral) throw new Error("Clé API Mistral non configurée.");
    return new MistralAPI(storedKeys.mistral, model);
  }
}

// Configuration des événements
function setupEventListeners() {
  // Onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Boutons d'action
  document.getElementById('btn-correct').addEventListener('click', handleCorrection);
  document.getElementById('btn-reformulate').addEventListener('click', handleReformulation);
  document.getElementById('btn-translate').addEventListener('click', handleTranslation);
  document.getElementById('btn-analyze').addEventListener('click', handleAnalysis);
  document.getElementById('btn-send-prompt').addEventListener('click', handleFreePrompt);

  // Actions sur les résultats
  document.getElementById('btn-copy-result').addEventListener('click', copyResult);
  document.getElementById('btn-replace-text').addEventListener('click', replaceText);
  document.getElementById('btn-insert-text').addEventListener('click', insertText);
}

// Changer d'onglet
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Récupérer tout le contenu de l'email en cours de rédaction (ou le mail lu en mode view)
async function getEmailContent() {
  // En mode lecture, retourner le corps du mail affiché
  if (viewMode) {
    return viewMessageBody;
  }
  try {
    if (!currentTab) return '';
    const composeDetails = await messenger.compose.getComposeDetails(currentTab.id);
    return composeDetails.plainTextBody || composeDetails.body || '';
  } catch (error) {
    console.error('Erreur récupération contenu email:', error);
    return '';
  }
}

// Remplacer le contenu de l'email
async function setEmailContent(content) {
  if (!currentTab) {
    showMessage('Aucun onglet de composition actif', 'error');
    return;
  }
  try {
    await messenger.compose.setComposeDetails(currentTab.id, { plainTextBody: content });
    showMessage('Texte mis à jour', 'success');
  } catch (error) {
    console.error('Erreur mise à jour email:', error);
    showMessage('Erreur lors de la mise à jour du texte', 'error');
  }
}

// --- Handlers des actions ---

async function handleCorrection() {
  try {
    const llmAPI = await getActiveLLM();
    showLoader(true);
    const text = await getEmailContent();
    if (!text.trim()) {
      showMessage('Aucun texte à corriger', 'error');
      return;
    }
    showResult(await llmAPI.correctText(text));
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    showLoader(false);
  }
}

async function handleReformulation() {
  try {
    const llmAPI = await getActiveLLM();
    showLoader(true);
    const text = await getEmailContent();
    if (!text.trim()) {
      showMessage('Aucun texte à reformuler', 'error');
      return;
    }
    const tone = document.getElementById('tone-select').value;
    showResult(await llmAPI.reformulateText(text, tone));
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    showLoader(false);
  }
}

async function handleTranslation() {
  try {
    const llmAPI = await getActiveLLM();
    showLoader(true);
    const text = await getEmailContent();
    if (!text.trim()) {
      showMessage('Aucun texte à traduire', 'error');
      return;
    }
    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;
    if (sourceLang === targetLang) {
      showMessage('Les langues source et cible doivent être différentes', 'error');
      return;
    }
    showResult(await llmAPI.translateText(text, sourceLang, targetLang));
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    showLoader(false);
  }
}

async function handleAnalysis() {
  try {
    const llmAPI = await getActiveLLM();
    showLoader(true, 'Récupération des emails...');

    let messageList;
    if (currentTab && currentTab.id) {
      messageList = await messenger.mailTabs.getSelectedMessages(currentTab.id);
    } else {
      messageList = await messenger.mailTabs.getSelectedMessages();
    }

    if (!messageList || !messageList.messages || messageList.messages.length === 0) {
      showMessage('Veuillez sélectionner au moins un email à analyser', 'error');
      return;
    }

    const messages = [];
    for (const msg of messageList.messages) {
      const fullMessage = await messenger.messages.getFull(msg.id);
      messages.push({
        subject: msg.subject,
        from: msg.author,
        date: new Date(msg.date).toLocaleDateString('fr-FR'),
        body: extractTextFromParts(fullMessage.parts)
      });
    }

    // Callback de progression : met à jour le texte du loader
    const onProgress = (current, total) => {
      const isSynthesis = current === total && total > 1;
      if (isSynthesis) {
        showLoader(true, 'Synthèse finale en cours...');
      } else {
        showLoader(true, `Analyse du paquet ${current}/${total}…`);
      }
    };

    const analysis = await llmAPI.analyzeEmails(messages, onProgress);
    const resultBox = document.getElementById('analysis-result');
    resultBox.innerHTML = formatMarkdown(analysis);
    resultBox.style.display = 'block';

  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    showLoader(false);
  }
}

async function handleFreePrompt() {
  const promptInput = document.getElementById('prompt-input').value.trim();
  if (!promptInput) {
    showMessage('Veuillez entrer une question ou instruction', 'error');
    return;
  }
  try {
    const llmAPI = await getActiveLLM();
    showLoader(true, 'Préparation de la requête...');
    let context = { text: '', messages: [] };

    if (document.getElementById('use-compose-text').checked) {
      context.text = await getEmailContent();
    }

    if (document.getElementById('use-selected-mails').checked) {
      let messageList;
      if (currentTab && currentTab.id) {
        messageList = await messenger.mailTabs.getSelectedMessages(currentTab.id);
      } else {
        messageList = await messenger.mailTabs.getSelectedMessages();
      }

      if (messageList && messageList.messages && messageList.messages.length > 0) {
        for (const msg of messageList.messages) {
          const fullMessage = await messenger.messages.getFull(msg.id);
          context.messages.push({
            subject: msg.subject,
            from: msg.author,
            date: new Date(msg.date).toLocaleDateString('fr-FR'),
            body: extractTextFromParts(fullMessage.parts)
          });
        }
      } else if (!context.text) {
        // Option cochée mais rien de sélectionné
        showMessage('Aucun email sélectionné', 'error');
        showLoader(false);
        return;
      }
    }

    const onProgress = (current, total) => {
      const isSynthesis = current === total && total > 1;
      if (isSynthesis) {
        showLoader(true, 'Synthèse finale en cours...');
      } else if (total > 1) {
        showLoader(true, `Recherche dans le paquet d'emails ${current}/${total}…`);
      } else {
        showLoader(true, 'Génération de la réponse...');
      }
    };

    const response = await llmAPI.freePrompt(promptInput, context, onProgress);
    const resultBox = document.getElementById('prompt-result');
    resultBox.innerHTML = formatMarkdown(response);
    resultBox.style.display = 'block';
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    showLoader(false);
  }
}

// --- Utilitaires ---

// Extraire le texte des parties du message (récursif)
function extractTextFromParts(parts) {
  if (!parts) return '';

  // Priorité au text/plain
  for (const part of parts) {
    if (part.contentType === 'text/plain' && part.body) return part.body;
    if (part.parts) {
      const text = extractTextFromParts(part.parts);
      if (text) return text;
    }
  }

  // Fallback sur HTML
  for (const part of parts) {
    if (part.contentType === 'text/html' && part.body) {
      return part.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  return '';
}

// Afficher le résultat dans la zone commune
function showResult(text) {
  document.getElementById('result-content').textContent = text;
  document.getElementById('result-area').style.display = 'block';
}

// Copier le résultat dans le presse-papier
function copyResult() {
  const text = document.getElementById('result-content').textContent;
  navigator.clipboard.writeText(text)
    .then(() => showMessage('Copié dans le presse-papier', 'success'))
    .catch(() => showMessage('Erreur lors de la copie', 'error'));
}

// Remplacer le contenu de l'email par le résultat
async function replaceText() {
  const text = document.getElementById('result-content').textContent;
  await setEmailContent(text);
  document.getElementById('result-area').style.display = 'none';
}

// Insérer le résultat à la fin de l'email
async function insertText() {
  const resultText = document.getElementById('result-content').textContent;
  const current = await getEmailContent();
  await setEmailContent(current + '\n\n' + resultText);
  document.getElementById('result-area').style.display = 'none';
}

// Afficher/masquer le loader
function showLoader(show, text = 'Traitement en cours...') {
  const loader = document.getElementById('loader');
  const loaderText = loader.querySelector('p');
  loader.style.display = show ? 'flex' : 'none';
  if (show && loaderText) loaderText.textContent = text;
}

// Afficher un message temporaire
function showMessage(text, type = 'info') {
  const area = document.getElementById('message-area');
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = text;
  area.appendChild(div);
  setTimeout(() => {
    div.style.animation = 'slideIn 0.3s reverse';
    setTimeout(() => div.remove(), 300);
  }, 4000);
}

// Convertir le Markdown en HTML (titres, gras, italique, listes, tableaux)
function formatMarkdown(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Détecter un tableau : ligne contenant | et une ligne de séparation après
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s\-|:]+\|/.test(lines[i + 1])) {
      // Lire toutes les lignes du tableau
      const tableLines = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      // Parser les cellules d'une ligne
      const parseCells = (row) =>
        row.split('|').map(c => c.trim()).filter((c, idx, arr) => idx !== 0 || c !== '' || arr.length > 2 ? true : false)
          .filter((_, idx, arr) => !(idx === 0 && _ === '') && !(idx === arr.length - 1 && _ === ''));

      let table = '<table><thead><tr>';
      const headers = parseCells(tableLines[0]);
      headers.forEach(h => { table += `<th>${inlineMarkdown(h)}</th>`; });
      table += '</tr></thead><tbody>';

      // Ignorer la ligne de séparateurs (---)
      for (let j = 2; j < tableLines.length; j++) {
        if (/^\s*\|?[\s\-|:]+\|/.test(tableLines[j])) continue;
        table += '<tr>';
        parseCells(tableLines[j]).forEach(c => { table += `<td>${inlineMarkdown(c)}</td>`; });
        table += '</tr>';
      }
      table += '</tbody></table>';
      result.push(table);
      continue;
    }

    // Titres
    if (/^### (.+)/.test(line)) { result.push(`<h3>${inlineMarkdown(line.replace(/^### /, ''))}</h3>`); i++; continue; }
    if (/^## (.+)/.test(line)) { result.push(`<h2>${inlineMarkdown(line.replace(/^## /, ''))}</h2>`); i++; continue; }
    if (/^# (.+)/.test(line)) { result.push(`<h1>${inlineMarkdown(line.replace(/^# /, ''))}</h1>`); i++; continue; }

    // Listes
    if (/^[\-\*] (.+)/.test(line)) { result.push(`<li>${inlineMarkdown(line.replace(/^[\-\*] /, ''))}</li>`); i++; continue; }

    // Ligne vide → séparation
    if (line.trim() === '') { result.push('<br>'); i++; continue; }

    // Texte normal
    result.push(`<p>${inlineMarkdown(line)}</p>`);
    i++;
  }

  return result.join('');
}

// Appliquer le markdown inline (gras, italique, code)
function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

