/**
 * @fileoverview Synchronize translation files to ensure consistent structure
 * 
 * This script ensures all translation files have the same structure as the source language file.
 * It preserves existing translations while adding missing keys and removing extra keys.
 * The script is useful for maintaining consistency across all language files after
 * adding or removing keys from the source language.
 * 
 * @module scripts/sync-translations
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
const localesDir = path.join(__dirname, '..', 'src', 'locales');
const sourceFile = path.join(localesDir, sourceLanguage, 'translation.json');
const localeDirectories = fs.readdirSync(localesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// Load source translations
const sourceTranslations = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

/**
 * Synchronize the structure of a target translation object with the source
 * 
 * This function recursively traverses the source object and creates a new object
 * with the same structure, preserving values from the target where they exist.
 * Keys that exist in the target but not in the source are omitted from the result.
 * 
 * @param {Object} source - The source translation object (usually English)
 * @param {Object} target - The target translation object to synchronize
 * @returns {Object} A new object with the source structure and target values
 */
function syncStructure(source, target) {
  // Handle arrays specifically to maintain array structure
  if (Array.isArray(source)) {
    const result = [];
    for (let i = 0; i < source.length; i++) {
      // If target has a value at this index, use it; otherwise use empty string
      if (Array.isArray(target) && i < target.length && target[i] !== undefined) {
        result[i] = target[i];
      } else if (typeof target === 'object' && target !== null && target[i] !== undefined) {
        // Handle case where target is an object with numeric keys
        result[i] = target[i];
      } else {
        result[i] = '';
      }
    }
    return result;
  }
  
  // Handle objects (non-arrays)
  if (typeof source === 'object' && source !== null) {
    const result = {};
    
    // Add all keys from source, keeping target values where they exist
    Object.keys(source).forEach(key => {
      if (typeof source[key] === 'object' && source[key] !== null) {
        result[key] = syncStructure(
          source[key],
          (target && typeof target[key] === 'object') ? target[key] : {}
        );
      } else {
        result[key] = (target && target[key] !== undefined) ? target[key] : '';
      }
    });
    
    return result;
  }
  
  // For primitive values
  return (target !== undefined) ? target : '';
}

// Process each locale directory
localeDirectories.forEach(locale => {
  if (locale === sourceLanguage) return;
  
  const targetFile = path.join(localesDir, locale, 'translation.json');
  
  // Check if the translation file exists
  if (!fs.existsSync(targetFile)) {
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.dirname(targetFile))) {
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    }
    // Create empty file
    fs.writeFileSync(targetFile, JSON.stringify({}));
    console.log(`Created new file for ${locale}`);
  }
  
  console.log(`Syncing ${locale}...`);
  const translations = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  
  // Create synced structure
  const syncedTranslations = syncStructure(sourceTranslations, translations);
  
  // Write back to file
  fs.writeFileSync(targetFile, JSON.stringify(syncedTranslations, null, 2));
  console.log(`✅ Updated ${locale}`);
});

console.log('✅ All translation files synchronized successfully!'); 