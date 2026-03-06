// Module pour interagir avec l'API Google Gemini
// Nécessite llm-base.js

class GeminiAPI extends LLMBase {
  constructor(apiKey, model = "gemini-2.5-flash") {
    super(apiKey, model);
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
  }

  /**
   * Créer une instance depuis les paramètres stockés
   */
  static async fromStorage() {
    const result = await browser.storage.local.get(['geminiApiKey', 'geminiModel']);
    const apiKey = result.geminiApiKey;
    const model = result.geminiModel || "gemini-2.5-flash";

    if (!apiKey) {
      throw new Error("Clé API Gemini non configurée. Veuillez configurer votre clé dans les paramètres.");
    }

    return new GeminiAPI(apiKey, model);
  }

  /**
   * Envoyer une requête à l'API Gemini
   */
  async generateContent(prompt, systemInstruction = null) {
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Erreur API: ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Aucune réponse générée par l'API");
    }
  }
}
