# Mailbot CEMagik - Extension Thunderbird

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Thunderbird-orange)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-green)

Extension Thunderbird pour la rédaction assistée par intelligence artificielle avec Google Gemini.

## 📋 Description

Mailbot CEMagik est une extension Thunderbird qui vous aide à rédiger vos emails plus efficacement grâce aux LLM de Google Gemini.

## ✨ Fonctionnalités

- **Correction** - Corrige l'orthographe, la grammaire et la syntaxe
- **Reformulation** - Reformule le texte avec différents tons (professionnel, formel, amical, concis)
- **Traduction** - Traduit dans plus de 10 langues
- **Analyse de mails** - Analyse plusieurs emails et génère un résumé avec les actions à mener
- **Prompt libre** - Interagissez directement avec Gemini pour des demandes personnalisées

## 🚀 Installation

### Prérequis

1. **Thunderbird** version 91 ou supérieure
2. **Clé API Google Gemini** (gratuite) - [Obtenir une clé](https://makersuite.google.com/app/apikey)

### Étapes d'installation

#### 📦 Option A : Installation permanente (recommandée)

1. **Packager l'extension**
   ```powershell
   cd thunderbird-mailbot
   .\build.ps1
   ```
   Cela créera un fichier `mailbot-cemagik-2.0.0.xpi`

2. **Installer dans Thunderbird**
   - Ouvrez Thunderbird
   - Allez dans **Outils** > **Modules complémentaires et thèmes**
   - Cliquez sur l'icône ⚙️ (roue dentée)
   - Sélectionnez **Installer un module depuis un fichier...**
   - Choisissez le fichier `mailbot-cemagik-2.0.0.xpi`
   - Confirmez l'installation

#### 🔧 Option B : Installation temporaire (développement)

1. **Charger directement**
   - Ouvrez Thunderbird
   - Tapez dans la barre d'adresse : `about:debugging`
   - Cliquez sur **Ce Thunderbird**
   - Cliquez sur **Charger un module temporaire...**
   - Naviguez vers `thunderbird-mailbot/` et sélectionnez `manifest.json`

   ⚠️ L'extension sera déchargée à la fermeture de Thunderbird

#### ⚙️ Configuration initiale

1. **Configurer la clé API**
   - Après installation, la page de paramètres s'ouvre automatiquement
   - Entrez votre clé API Gemini
   - Cliquez sur **Tester la connexion** pour vérifier
   - Cliquez sur **Enregistrer**

## 🔧 Utilisation

### Dans la fenêtre de composition

1. Ouvrez un nouveau message ou répondez à un email
2. Cliquez sur l'icône Mailbot CEMagik dans la barre d'outils
3. Choisissez l'action souhaitée :
   - **Rédaction** : Corriger ou reformuler
   - **Traduction** : Traduire le texte
   - **Analyse** : Analyser des emails sélectionnés
   - **Prompt Libre** : Demander ce que vous voulez à l'IA

### Raccourcis clavier

- `Ctrl+Shift+C` : Corriger le texte
- `Ctrl+Shift+P` : Ouvrir le prompt libre

### Analyse de mails

1. Sélectionnez plusieurs emails dans votre boîte de réception
2. Ouvrez Mailbot CEMagik
3. Allez dans l'onglet **Analyse**
4. Cliquez sur **Analyser les mails sélectionnés**
5. Obtenez un résumé structuré avec les actions à mener

## 🛠️ Configuration

### Modèles Gemini disponibles

- **Gemini 1.5 Flash** (recommandé) : Rapide et efficace pour la plupart des tâches
- **Gemini 1.5 Pro** : Plus puissant pour des analyses complexes
- **Gemini Pro** : Version standard

### Langues supportées

- Français
- Anglais
- Espagnol
- Allemand
- Italien
- Portugais
- Russe
- Chinois
- Japonais
- Arabe

## 📁 Structure du projet

```
thunderbird-mailbot/
├── manifest.json           # Configuration de l'extension
├── background.js          # Script de fond
├── api/
│   └── gemini.js         # Module API Gemini
├── compose/
│   ├── compose.html      # Interface principale
│   ├── compose.css       # Styles
│   └── compose.js        # Logique de l'interface
├── options/
│   ├── options.html      # Page de paramètres
│   ├── options.css       # Styles
│   └── options.js        # Logique des paramètres
├── icons/
│   ├── icon-48.png       # Icône 48x48
│   ├── icon-96.png       # Icône 96x96
│   ├── insigneu.png      # Logo Marine
│   └── ftrh.png          # Logo FTRH
└── README.md             # Ce fichier
```

## 🔒 Confidentialité

- Votre clé API est **stockée localement** dans Thunderbird
- Aucune donnée n'est envoyée à des serveurs tiers (sauf Google Gemini pour le traitement)
- Les emails ne sont jamais sauvegardés ou partagés

## 🐛 Dépannage

### L'extension ne s'affiche pas
- Vérifiez que vous utilisez Thunderbird 91+
- Réinstallez l'extension

### Erreur "Clé API invalide"
- Vérifiez que vous avez copié la clé complète
- Assurez-vous que l'API Gemini est activée sur votre compte Google
- Testez la connexion dans les paramètres

### Les résultats sont lents
- Essayez de passer au modèle "Gemini 1.5 Flash"
- Vérifiez votre connexion Internet

## 📝 Développement

### Développer localement

```bash
# Cloner le repository
git clone <repository-url>
cd thunderbird-mailbot

# Charger dans Thunderbird
# about:debugging > Charger un module temporaire > manifest.json
```

### Technologies utilisées

- **Thunderbird WebExtensions API**
- **Google Gemini API**
- **Vanilla JavaScript** (pas de framework)
- **CSS3** avec animations

## 👥 Contributeurs

Développé en collaboration avec :
- A
- B
- C
- D
- E

## 📄 Licence

© 2025 SirThirrygolooo

## 🔗 Liens utiles

- [Documentation Thunderbird WebExtensions](https://webextension-api.thunderbird.net/)
- [Google Gemini API](https://ai.google.dev/)
- [Obtenir une clé API Gemini](https://makersuite.google.com/app/apikey)

---

**Version État Major 1re Division - Thunderbird Edition**
