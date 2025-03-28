# Internationalization (i18n) Scripts

This directory contains scripts to help manage translations for the echoAI website. These scripts make it easier to maintain, track, and update translations across multiple languages.

## Available Scripts

### 1. Extract Translations (`extract-i18n.js`)

This script scans your TypeScript/TSX files for translation keys used with the `t()` function and adds them to your source language file.

**When to use:**

- After adding new text to components
- When refactoring components with translated content
- Before starting a new translation

```bash
npm run i18n:extract
```

### 2. Synchronize Translations (`sync-translations.js`)

This script ensures all language files have the same structure as the source language (English). It preserves existing translations while adding missing keys and removing extra keys.

**When to use:**

- After running `i18n:extract` to update all other language files
- After modifying the structure of the source language file
- When adding a new language

```bash
npm run i18n:sync
```

### 3. Validate Translations (`validate-i18n.js`)

This script checks all translations for completeness and reports any missing translations. It will exit with an error code if any translations are incomplete.

**When to use:**

- Before committing changes to ensure all translations are complete
- In CI/CD pipelines to enforce translation completeness
- After receiving new translations to verify they're complete

```bash
npm run i18n:validate
```

### 4. Translation Status Report (`i18n-status.js`)

This script generates a comprehensive status report for all translation files, including completion percentages and lists of missing translations. The report is written to `src/locales/i18n-status.md` and also output to the console.

**When to use:**

- To get an overview of translation progress
- When communicating with translators about what needs to be translated
- To include in documentation or project management tools

```bash
npm run i18n:status
```

## Typical Workflow

Here's a typical workflow for adding new content:

1. Add new content to your React components using the `t()` function from `react-i18next`
2. Run `npm run i18n:extract` to extract the new keys
3. Update the English source file with the words for the new component

Here's a typical workflow for updating translations (run only when ready to sync languages):

1. Run `npm run i18n:sync` to update all language files with new English keys
2. Translate the new strings in each language file
3. Run `npm run i18n:validate` to verify all translations are complete

## Adding a New Language

To add support for a new language:

1. Create a new directory under `src/locales` with the language code (e.g., `src/locales/fr`)
2. Create a `translation.json` file in this directory (can be empty)
3. Run `npm run i18n:sync` to populate it with the correct structure
4. Translate the strings
5. Update your LanguageSelector component to include the new language

## Continuous Integration

Add these commands to your CI pipeline to ensure translations are valid:

```yaml
# Example for GitHub Actions
- name: Validate Translations
  run: |
    npm run i18n:validate
```

This will fail the build if any translations are incomplete, ensuring translation quality.
