/**
 * @fileoverview Extract translatable strings from React components
 * 
 * This script scans the project for translatable strings in React components.
 * It extracts strings from t() function calls and merges them with existing translations
 * in the source language JSON file.
 * 
 * @module scripts/extract-i18n
 * @requires fs
 * @requires path
 * @requires url
 * @requires glob
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const sourceLanguage = 'en';
const outputFile = path.join(__dirname, '..', 'src', 'locales', sourceLanguage, 'translation.json');
const srcDirPath = path.join(__dirname, '..', 'src');
const tsxFiles = glob.sync(path.join(srcDirPath, '**/*.tsx'), { ignore: 'node_modules/**' });
const tsFiles = glob.sync(path.join(srcDirPath, '**/*.ts'), { ignore: 'node_modules/**' });

/**
 * Load existing translations from the output file if available
 * 
 * @returns {Object} The existing translations or an empty object if none exist
 */
let existingTranslations = {};
try {
  existingTranslations = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  console.log(`Loaded existing translations from ${outputFile}`);
} catch (error) {
  console.log('No existing translations found, creating new file');
}

/**
 * Extract keys from TSX/TS files by searching for t() function calls
 * 
 * @type {Set<string>} Set of unique translation keys found in files
 */
const allKeys = new Set();
const tFunctionPattern = /t\(['"]([^'"]+)['"]\)/g;
const allFiles = [...tsxFiles, ...tsFiles];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tFunctionPattern.exec(content)) !== null) {
    allKeys.add(match[1]);
  }
});

console.log(`Found ${allKeys.size} translatable strings`);

/**
 * Create a nested object structure from a dot-notation key
 * 
 * @param {Object} obj - The object to modify
 * @param {string} key - The dot-notation key (e.g., 'common.title')
 * @param {string} value - The value to set at the key path
 * @returns {Object} The modified object
 * @example
 * // Returns { common: { title: 'Hello' } }
 * createNestedObject({}, 'common.title', 'Hello')
 */
function createNestedObject(obj, key, value) {
  const keys = key.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  // Only set value if it doesn't exist or is empty
  const lastKey = keys[keys.length - 1];
  if (!current[lastKey] || current[lastKey] === '') {
    current[lastKey] = value || key.split('.').pop();
  }
  
  return obj;
}

// Build translation object
let translations = JSON.parse(JSON.stringify(existingTranslations));
allKeys.forEach(key => {
  // Get existing translation or use empty string
  const existingValue = key.split('.').reduce((obj, k) => obj && obj[k], existingTranslations) || '';
  translations = createNestedObject(translations, key, existingValue);
});

// Write to file
fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
console.log(`Updated translations written to ${outputFile}`);

/**
 * Count and report missing translations
 * A translation is considered missing if it doesn't exist or equals its key's last segment
 */
const missingCount = [...allKeys].filter(key => {
  const value = key.split('.').reduce((obj, k) => obj && obj[k], translations);
  return !value || value === key.split('.').pop();
}).length;

console.log(`Missing translations: ${missingCount}/${allKeys.size}`); 