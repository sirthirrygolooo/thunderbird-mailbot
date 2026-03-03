// Module pour interagir avec l'API Google Gemini

// Limite approximative de caractères par requête (marge de sécurité sous ~30k tokens)
const CHUNK_CHAR_LIMIT = 60000;
// Nombre max de mails par paquet si on ne dépasse pas la limite en caractères
const CHUNK_SIZE_MAX = 5;

// Instruction système commune à toutes les opérations sur les emails
const SYSTEM_BASE = `Tu es un assistant de rédaction professionnelle spécialisé dans la communication par email en entreprise. \
Tu maîtrises parfaitement le français professionnel contemporain : phrases claires, vocabulaire précis, ton adapté au contexte. \
Tu respectes scrupuleusement le sens et la structure du texte d'origine. \
Tu n'ajoutes jamais de commentaires, d'explications, de préambule ni de conclusion sur ton travail. \
Tu retournes TOUJOURS uniquement le résultat demandé, rien d'autre.`;

class GeminiAPI {
  constructor(apiKey, model = "gemini-2.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
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

  /**
   * Corriger du texte (orthographe, grammaire, ponctuation)
   */
  async correctText(text) {
    const prompt = `Corrige le texte suivant en corrigeant toutes les fautes d'orthographe, de grammaire, de conjugaison et de ponctuation.

Règles impératives :
- Conserve INTÉGRALEMENT le sens, la structure et le style d'origine.
- Conserve la mise en forme (sauts de ligne, paragraphes, listes).
- Ne reformule pas, ne remplace pas de mots sauf si c'est indispensable à la correction.
- Si le texte est correct, retourne-le tel quel.

Texte à corriger :
${text}`;

    return this.generateContent(prompt, SYSTEM_BASE);
  }

  /**
   * Reformuler du texte selon un ton donné
   */
  async reformulateText(text, tone = "professionnel") {
    const toneDescriptions = {
      professionnel: "professionnel et neutre, adapté à une communication d'entreprise standard : phrases bien construites, vocabulaire courant mais soigné, pas de familiarités",
      formel: "formel et soutenu, adapté à une correspondance officielle : formules de politesse complètes, syntaxe élaborée, vocabulaire soutenu",
      amical: "chaleureux et accessible, tout en restant dans un cadre professionnel : phrases directes, ton bienveillant, formulations légères sans vulgarité",
      concis: "concis et efficace : phrases courtes, structure claire, suppression du superflu, information essentielle en premier"
    };

    const toneDesc = toneDescriptions[tone] || `${tone}`;

    const prompt = `Reformule le texte suivant avec un ton ${tone}.

Description du ton attendu : ${toneDesc}.

Règles impératives :
- Conserve INTÉGRALEMENT le sens et toutes les informations d'origine.
- Adapte uniquement le style et le registre au ton demandé.
- Conserve la même structure générale (paragraphes, listes si présentes).
- Corrige au passage les éventuelles fautes d'orthographe ou de grammaire.

Texte à reformuler :
${text}`;

    return this.generateContent(prompt, SYSTEM_BASE);
  }

  /**
   * Traduire du texte
   */
  async translateText(text, sourceLang, targetLang) {
    const prompt = `Traduis le texte suivant du ${sourceLang} vers le ${targetLang}.

Règles impératives :
- Produis une traduction naturelle et idiomatique dans la langue cible, pas une traduction mot-à-mot.
- Adapte les expressions idiomatiques et les tournures propres à chaque langue.
- Conserve le registre et le ton d'origine (formel, professionnel, etc.).
- Conserve la mise en forme (sauts de ligne, paragraphes, listes).
- Si le texte contient des termes techniques ou des noms propres, garde-les tels quels sauf convention contraire établie.

Texte à traduire :
${text}`;

    return this.generateContent(prompt, SYSTEM_BASE);
  }

  /**
   * Construire le bloc texte d'un email pour l'inclure dans un prompt
   */
  _formatEmailBlock(msg, index) {
    return `--- Email ${index + 1} ---\nExpéditeur : ${msg.from}\nDate : ${msg.date}\nObjet : ${msg.subject}\nContenu :\n${msg.body}\n\n`;
  }

  /**
   * Découper un tableau de messages en paquets respectant CHUNK_CHAR_LIMIT et CHUNK_SIZE_MAX.
   * Chaque mail trop volumineux à lui seul est tronqué (garder les 8000 premiers caractères du corps).
   */
  _chunkMessages(messages) {
    const chunks = [];
    let current = [];
    let currentLen = 0;

    for (let i = 0; i < messages.length; i++) {
      // Tronquer les corps trop longs individuellement
      const msg = { ...messages[i] };
      if (msg.body && msg.body.length > 8000) {
        msg.body = msg.body.slice(0, 8000) + "\n[… contenu tronqué pour respecter les limites de l'API …]";
      }

      const block = this._formatEmailBlock(msg, i);
      const blockLen = block.length;

      const wouldExceedChar = currentLen + blockLen > CHUNK_CHAR_LIMIT;
      const wouldExceedCount = current.length >= CHUNK_SIZE_MAX;

      if ((wouldExceedChar || wouldExceedCount) && current.length > 0) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }

      current.push(msg);
      currentLen += blockLen;
    }

    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  /**
   * Analyser un seul paquet d'emails (usage interne)
   */
  async _analyzeChunk(messages, chunkIndex, totalChunks) {
    let emailsText = totalChunks > 1
      ? `Les emails suivants constituent le groupe ${chunkIndex + 1}/${totalChunks} d'une analyse plus large :\n\n`
      : `Voici les emails à analyser :\n\n`;

    messages.forEach((msg, i) => { emailsText += this._formatEmailBlock(msg, i); });

    const systemInstruction = `${SYSTEM_BASE}
Tu es également expert en analyse de correspondance professionnelle d'entreprise. \
Tu identifies rapidement les informations essentielles, les demandes explicites et implicites, les échéances et les priorités. \
Tu structures tes analyses de manière claire et actionnable pour un professionnel en entreprise.`;

    const prompt = `${emailsText}
Analyse ces ${messages.length} email(s) et fournis une synthèse structurée selon le plan suivant :

## Résumé global
Un paragraphe synthétique qui résume l'essentiel de ce groupe d'emails.

## Points clés par email
Pour chaque email, en 2-4 points :
- Ce dont il s'agit
- La demande ou l'information principale
- Le ton / l'urgence perçus

## Actions à mener
Liste des actions concrètes identifiées, avec si possible un responsable et une échéance détectés dans le texte. Si aucune action n'est requise, indique-le explicitement.

## Niveau de priorité
Évaluation globale : Faible / Normale / Élevée / Urgente, avec une justification courte.

Retourne uniquement cette analyse en Markdown propre. N'indique pas que ta réponse est en Markdown.`;

    return this.generateContent(prompt, systemInstruction);
  }

  /**
   * Analyser plusieurs emails avec découpage automatique en paquets.
   * @param {Array} messages  - liste des emails { from, date, subject, body }
   * @param {Function} onProgress - callback(current, total) appelé après chaque paquet
   * @returns {string} analyse en Markdown
   */
  async analyzeEmails(messages, onProgress = null) {
    const chunks = this._chunkMessages(messages);

    // Cas simple : un seul paquet → analyse directe
    if (chunks.length === 1) {
      if (onProgress) onProgress(1, 1);
      return this._analyzeChunk(chunks[0], 0, 1);
    }

    // Plusieurs paquets : analyser chacun puis synthétiser
    const partialResults = [];
    for (let i = 0; i < chunks.length; i++) {
      const partial = await this._analyzeChunk(chunks[i], i, chunks.length);
      const start = chunks.slice(0, i).reduce((s, c) => s + c.length, 0) + 1;
      const end = chunks.slice(0, i + 1).reduce((s, c) => s + c.length, 0);
      partialResults.push(`## Groupe ${i + 1} — Emails ${start} à ${end}\n\n${partial}`);
      if (onProgress) onProgress(i + 1, chunks.length + 1);
    }

    // Synthèse finale consolidée
    const synthesisSystemInstruction = `${SYSTEM_BASE}
Tu es expert en synthèse de correspondance professionnelle. \
À partir d'analyses partielles, tu produis une vue d'ensemble cohérente, hiérarchisée et directement exploitable par un manager ou un collaborateur en entreprise.`;

    const synthesisPrompt = `Tu disposes des analyses de ${messages.length} emails répartis en ${chunks.length} groupes.

${partialResults.join('\n\n---\n\n')}

Produis maintenant une synthèse globale consolidée selon le plan suivant :

## Vue d'ensemble
Un paragraphe de synthèse couvrant l'ensemble des ${messages.length} emails : contexte général, thèmes récurrents, état global de la correspondance.

## Actions prioritaires
Liste unifiée et priorisée de toutes les actions à mener (sans doublons), avec le contexte nécessaire pour chaque action.

## Points d'attention
Signaux faibles, délais imminents, tensions ou sujets sensibles détectés dans les échanges.

## Priorité globale
Évaluation finale : Faible / Normale / Élevée / Urgente, avec justification.

Retourne uniquement cette synthèse en Markdown propre. N'indique pas que ta réponse est en Markdown.`;

    const synthesis = await this.generateContent(synthesisPrompt, synthesisSystemInstruction);
    if (onProgress) onProgress(chunks.length + 1, chunks.length + 1);

    return `# Synthèse globale — ${messages.length} emails\n\n${synthesis}\n\n---\n\n# Détail par groupe\n\n${partialResults.join('\n\n---\n\n')}`;
  }

  /**
   * Prompt libre (Map Rebuce sur sélection emails multiples si fourni)
   */
  async freePrompt(userPrompt, context = {}, onProgress = null) {
    const systemInstruction = `${SYSTEM_BASE}
Tu es un assistant analytique professionnel. L'utilisateur te pose une question ou te donne une consigne.
Si des correspondances te sont fournies en contexte, extrais la réponse de manière très factuelle et complète à partir de ces documents.`;

    const { text, messages } = context;

    // S'il n'y a pas d'emails multiples à analyser en lots
    if (!messages || messages.length === 0) {
      let prompt = `Instruction de l'utilisateur :\n${userPrompt}\n`;
      if (text) {
        prompt += `\nTexte de référence (email en cours) :\n---\n${text}\n---\n`;
      }
      if (onProgress) onProgress(1, 1);
      return this.generateContent(prompt, systemInstruction);
    }

    // Découpage des emails (utilisation de la mécanique existante limitant nb/taille)
    const chunks = this._chunkMessages(messages);

    // Cas simple : un seul paquet (pas besoin de map-reduce)
    if (chunks.length === 1) {
      let emailsText = `Les emails à analyser :\n\n`;
      chunks[0].forEach((msg, i) => { emailsText += this._formatEmailBlock(msg, i); });
      let prompt = `Instruction de l'utilisateur :\n${userPrompt}\n\n${emailsText}`;
      if (text) prompt += `\nTexte du mail en cours :\n---\n${text}\n---\n`;

      if (onProgress) onProgress(1, 1);
      return this.generateContent(prompt, systemInstruction);
    }

    // Plusieurs paquets : Map-Reduce pour extraire les réponses de chaque lot
    const partialResults = [];
    for (let i = 0; i < chunks.length; i++) {
      let emailsText = `Groupe ${i + 1}/${chunks.length} : extrais ou résume UNIQUEMENT ce qui répond à cette question : "${userPrompt}"\nSi rien ne correspond au sein de ce groupe, réponds honnêtement "Aucune information pertinente."\n\n`;
      chunks[i].forEach((msg, j) => { emailsText += this._formatEmailBlock(msg, j); });

      const partial = await this.generateContent(emailsText, systemInstruction);
      partialResults.push(`--- Résultats du groupe ${i + 1} ---\n${partial}`);
      if (onProgress) onProgress(i + 1, chunks.length + 1);
    }

    // Synthèse finale (Reduce) consolidant les extractions
    let synthesisPrompt = `L'utilisateur a posé la question / consigne suivante : "${userPrompt}"\n\n`;
    if (text) synthesisPrompt += `Texte de référence principal lié (email en cours) :\n---\n${text}\n---\n\n`;
    synthesisPrompt += `Voici les réponses partielles extraites par paquets sur un volume total de ${messages.length} emails :\n\n`;
    synthesisPrompt += partialResults.join('\n\n');
    synthesisPrompt += `\n\nRéalise maintenant une synthèse finale consolidée et sourcée qui répond parfaitement à l'instruction de l'utilisateur à partir de ces extraits combinés.`;

    const finalResponse = await this.generateContent(synthesisPrompt, systemInstruction);
    if (onProgress) onProgress(chunks.length + 1, chunks.length + 1);

    return finalResponse;
  }
}
