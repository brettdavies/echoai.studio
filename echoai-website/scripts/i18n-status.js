/**
 * @fileoverview Generate a status report for all translations
 * 
 * This script generates a comprehensive status report for all translation files.
 * It calculates completion percentages, counts empty values, and lists missing translations.
 * The report is output in Markdown format for easy inclusion in documentation.
 * 
 * @module scripts/i18n-status
 * @requires fs
 * @requires path
 * @requires url
 * @requires glob
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const sourceLanguage = 'en';
const localesDir = path.join(__dirname, '..', 'src', 'locales');
const sourceFile = path.join(localesDir, sourceLanguage, 'translation.json');
const outputFile = path.join(localesDir, 'i18n-status.md');
const localeDirectories = fs.readdirSync(localesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// Load source translations
const sourceTranslations = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

/**
 * Comprehensive analysis of keys in an object
 * 
 * @param {Object} obj - The object to analyze
 * @param {string} [prefix=''] - The current key prefix for nested objects
 * @returns {Object} Detailed analysis including various key counts and lists
 */
function analyzeKeys(obj, prefix = '') {
  let result = {
    leafKeys: 0,
    leafKeysList: [],
    objectKeys: 0,
    arrayKeys: 0,
    arrayElements: 0,
    emptyValues: 0,
    emptyKeysList: []
  };
  
  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (Array.isArray(obj[key])) {
        result.arrayKeys++;
        result.arrayElements += obj[key].length;
        
        // Count array elements as leaf keys
        obj[key].forEach((item, index) => {
          result.leafKeys++;
          result.leafKeysList.push(`${fullKey}[${index}]`);
          if (item === '') {
            result.emptyValues++;
            result.emptyKeysList.push(`${fullKey}[${index}]`);
          }
        });
      } else {
        result.objectKeys++;
        const subResult = analyzeKeys(obj[key], fullKey);
        
        // Combine results
        result.leafKeys += subResult.leafKeys;
        result.leafKeysList.push(...subResult.leafKeysList);
        result.objectKeys += subResult.objectKeys;
        result.arrayKeys += subResult.arrayKeys;
        result.arrayElements += subResult.arrayElements;
        result.emptyValues += subResult.emptyValues;
        result.emptyKeysList.push(...subResult.emptyKeysList);
      }
    } else {
      result.leafKeys++;
      result.leafKeysList.push(fullKey);
      if (obj[key] === '') {
        result.emptyValues++;
        result.emptyKeysList.push(fullKey);
      }
    }
  });
  
  return result;
}

/**
 * Count the top level keys in an object
 * 
 * @param {Object} obj - The object to count top level keys in
 * @returns {number} The count of top level keys
 */
function countTopLevelKeys(obj) {
  return Object.keys(obj).length;
}

/**
 * Compare two analysis results to find differences
 * 
 * @param {Object} sourceAnalysis - Analysis results from source language
 * @param {Object} targetAnalysis - Analysis results from target language
 * @returns {Object} Details of differences between the two analyses
 */
function compareAnalyses(sourceAnalysis, targetAnalysis) {
  const source = sourceAnalysis.leafKeysList;
  const target = targetAnalysis.leafKeysList;
  
  const missingInTarget = source.filter(key => !target.includes(key));
  const extraInTarget = target.filter(key => !source.includes(key));
  
  return { 
    missingInTarget, 
    extraInTarget,
    missingCount: missingInTarget.length,
    extraCount: extraInTarget.length
  };
}

// Analyze the source language
const sourceAnalysis = analyzeKeys(sourceTranslations);
const sourceTopLevelKeys = countTopLevelKeys(sourceTranslations);

// Initialize results object to store all analyses
const results = {
  source: {
    language: sourceLanguage,
    topLevelKeys: sourceTopLevelKeys,
    analysis: sourceAnalysis
  },
  languages: {}
};

// Analyze all languages
localeDirectories.forEach(locale => {
  const targetFile = path.join(localesDir, locale, 'translation.json');
  
  // Skip if file doesn't exist
  if (!fs.existsSync(targetFile)) {
    results.languages[locale] = {
      language: locale,
      exists: false,
      topLevelKeys: 0,
      analysis: {
        leafKeys: 0,
        leafKeysList: [],
        objectKeys: 0,
        arrayKeys: 0,
        arrayElements: 0,
        emptyValues: 0,
        emptyKeysList: []
      },
      comparison: {
        missingInTarget: Array.from(sourceAnalysis.leafKeysList),
        extraInTarget: [],
        missingCount: sourceAnalysis.leafKeysList.length,
        extraCount: 0
      }
    };
    return;
  }
  
  const translations = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  const analysis = analyzeKeys(translations);
  const topLevelKeys = countTopLevelKeys(translations);
  const comparison = compareAnalyses(sourceAnalysis, analysis);
  
  results.languages[locale] = {
    language: locale,
    exists: true,
    topLevelKeys,
    analysis,
    comparison
  };
});

// Generate the status report
let report = '# Translation Status Report\n\n';

// Basic status table
report += '## Summary\n\n';
report += '| Language | Top-Level Keys | Leaf Keys | Array Elements | Total Keys | Translated | Empty | Missing | Completion |\n';
report += '|----------|----------------|-----------|----------------|------------|------------|-------|---------|------------|\n';

Object.values(results.languages).forEach(langData => {
  const { language, exists, topLevelKeys, analysis, comparison } = langData;
  
  if (!exists) {
    report += `| ${language} | 0 | 0 | 0 | 0 | 0 | 0 | ${sourceAnalysis.leafKeys} | 0.00% |\n`;
    return;
  }
  
  const totalKeys = analysis.leafKeys;
  const translatedKeys = totalKeys - analysis.emptyValues - comparison.missingCount;
  const completionPercentage = ((translatedKeys / sourceAnalysis.leafKeys) * 100).toFixed(2);
  
  report += `| ${language} | ${topLevelKeys} | ${analysis.leafKeys - analysis.arrayElements} | ${analysis.arrayElements} | ${totalKeys} | ${translatedKeys} | ${analysis.emptyValues} | ${comparison.missingCount} | ${completionPercentage}% |\n`;
});

// Detailed analysis
report += '\n## Detailed Analysis\n\n';

Object.values(results.languages).forEach(langData => {
  const { language, exists, analysis, comparison } = langData;
  
  if (language === sourceLanguage) return;
  
  report += `### ${language}\n\n`;
  
  if (!exists) {
    report += 'Translation file does not exist.\n\n';
    return;
  }
  
  report += `**Statistics:**\n\n`;
  report += `- Leaf Keys: ${analysis.leafKeys} (${sourceAnalysis.leafKeys} in source)\n`;
  report += `- Object Keys: ${analysis.objectKeys}\n`;
  report += `- Array Keys: ${analysis.arrayKeys}\n`;
  report += `- Array Elements: ${analysis.arrayElements}\n`;
  report += `- Empty Values: ${analysis.emptyValues}\n`;
  report += `- Missing Keys: ${comparison.missingCount}\n`;
  report += `- Extra Keys: ${comparison.extraCount}\n\n`;
  
  if (comparison.missingCount > 0) {
    report += `**Missing Keys:**\n\n`;
    comparison.missingInTarget.forEach(key => report += `- \`${key}\`\n`);
    report += '\n';
  } else {
    report += `**No Missing Keys**\n\n`;
  }
  
  if (analysis.emptyValues > 0) {
    report += `**Empty Values:**\n\n`;
    analysis.emptyKeysList.forEach(key => report += `- \`${key}\`\n`);
    report += '\n';
  }
  
  if (comparison.extraCount > 0) {
    report += `**Extra Keys:**\n\n`;
    comparison.extraInTarget.forEach(key => report += `- \`${key}\`\n`);
    report += '\n';
  }
});

// Write the report to file
fs.writeFileSync(outputFile, report);

// Also output to console
console.log(report); 