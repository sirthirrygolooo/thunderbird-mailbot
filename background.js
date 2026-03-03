// Background script – Mailbot CEMagik

// Ouvrir la page de paramètres au premier lancement
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
});

// Fonction utilitaire pour ouvrir l'interface dans une fenêtre indépendante
async function openMailbotWindow(mode, tab = null) {
  let url = `compose/compose.html?mode=${mode}`;
  if (tab && tab.id) {
    url += `&tabId=${tab.id}`;
  }

  // Création d'une fenêtre OS indépendante de type popup (n'est pas fermée par le focus)
  await browser.windows.create({
    url: url,
    type: "popup",
    width: 620,
    height: 600
  });
}

// Clic sur l'icône dans la fenêtre principale (boîte de réception)
browser.browserAction.onClicked.addListener((tab) => {
  openMailbotWindow('analysis', tab);
});

// Clic sur l'icône dans la fenêtre de rédaction d'email
browser.composeAction.onClicked.addListener((tab) => {
  openMailbotWindow('compose', tab);
});

// Clic sur l'icône lors de la lecture d'un email
browser.messageDisplayAction.onClicked.addListener((tab) => {
  openMailbotWindow('view', tab);
});

// Gestion des raccourcis clavier
browser.commands.onCommand.addListener(async (command) => {
  if (command === "open-popup") {
    openMailbotWindow('compose');
  } else if (command === "free-prompt") {
    openMailbotWindow('freePrompt');
  }
});

console.log("Mailbot CEMagik – Background script chargé");
