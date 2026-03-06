// Module pour interagir avec l'API Mistral AI
// Nécessite llm-base.js

class MistralAPI extends LLMBase {
    constructor(apiKey, model = "mistral-large-latest") {
        super(apiKey, model);
        this.baseUrl = "https://api.mistral.ai/v1/chat/completions";
    }

    /**
     * Créer une instance depuis les paramètres stockés
     */
    static async fromStorage() {
        const result = await browser.storage.local.get(['mistralApiKey', 'mistralModel']);
        const apiKey = result.mistralApiKey;
        const model = result.mistralModel || "mistral-large-latest";

        if (!apiKey) {
            throw new Error("Clé API Mistral non configurée. Veuillez configurer votre clé dans les paramètres.");
        }

        return new MistralAPI(apiKey, model);
    }

    /**
     * Envoyer une requête à l'API Mistral
     */
    async generateContent(prompt, systemInstruction = null) {
        const url = this.baseUrl;

        const messages = [];
        if (systemInstruction) {
            messages.push({ role: "system", content: systemInstruction });
        }
        messages.push({ role: "user", content: prompt });

        const requestBody = {
            model: this.model,
            messages: messages
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erreur API: ${response.status}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            throw new Error("Aucune réponse générée par l'API");
        }
    }
}
