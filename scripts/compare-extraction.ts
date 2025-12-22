#!/usr/bin/env node
/**
 * Comparison script to validate extraction quality
 * Compares extracted content with expected output
 *
 * Usage: npx tsx scripts/compare-extraction.ts
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

import { extractArticle } from '../src/extraction/extractor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixture = (name: string): string =>
  readFileSync(join(__dirname, '..', 'tests', 'fixtures', name), { encoding: 'utf-8' });

interface ComparisonResult {
  unwantedElements: string[];
  missingContent: string[];
  textSimilarity: number;
  elementCounts: {
    extracted: number;
    expected: number;
  };
}

// Patterns that should NOT be in extracted content
const UNWANTED_PATTERNS = [
  'c-siteheader',
  'site-nav',
  'c-siteheadermasthead',
  'cat-footer',
  '<footer',
  'c-bestlistlinkblock',
  'c-articlelinkblock',
  'video-js',
  'vjs-',
  'data-ad-callout',
  'c-addisplay',
  'c-avstickyvideo',
  'data-video-location="modal"',
  'c-articleheader_metacontainer',
  'c-topicbreadcrumbs',
  'c-globalauthorimage',
  'c-globalauthorcard',
  'sr-title',
  'data-cy="globalauthorimage"',
];

function extractArticleFromExpected(html: string): string {
  // Suppress CSS parsing errors by catching them
  let dom: JSDOM;
  try {
    dom = new JSDOM(html, {
      resources: 'usable',
      runScripts: 'outside-only',
    });
  } catch (error) {
    // If full parsing fails, try to extract article content using regex
    const articleMatch = html.match(/<article[^>]*class="[^"]*sr-article[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      return articleMatch[1];
    }
    return '';
  }
  const doc = dom.window.document;
  const article = doc.querySelector('article.sr-article');
  if (!article) {
    return '';
  }
  return article.innerHTML;
}

function findUnwantedElements(html: string): string[] {
  const lowerHtml = html.toLowerCase();
  const found: string[] = [];

  for (const pattern of UNWANTED_PATTERNS) {
    if (lowerHtml.includes(pattern.toLowerCase())) {
      found.push(pattern);
    }
  }

  return found;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple word-based similarity
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function compareExtraction(inputFile: string, expectedFile: string): ComparisonResult {
  console.log(`\n📄 Comparing extraction for: ${inputFile}\n`);

  // Suppress console errors for CSS parsing
  const originalConsoleError = console.error;
  console.error = () => {}; // Suppress CSS parsing errors

  // Extract from input
  const inputHtml = fixture(inputFile);
  const inputDom = new JSDOM(inputHtml, {
    url: 'https://www.cnet.com/tech/mobile/why-samsungs-latest-chip-breakthrough-matters-for-upcoming-galaxy-phones/',
    resources: 'usable',
    runScripts: 'outside-only',
  });

  // Make NodeFilter available globally (needed by extractor)
  if (typeof globalThis.NodeFilter === 'undefined') {
    (globalThis as any).NodeFilter = {
      SHOW_ELEMENT: 1,
      SHOW_TEXT: 4,
      SHOW_ALL: 0xffffffff,
      FILTER_ACCEPT: 1,
      FILTER_REJECT: 2,
      FILTER_SKIP: 3,
    };
  }

  // Restore console.error
  console.error = originalConsoleError;

  const result = extractArticle(inputDom.window.document);
  if (result.unavailable) {
    console.error('❌ Extraction failed:', result.reason);
    process.exit(1);
  }

  const extractedHtml = result.html;
  const extractedText = result.text;

  // Extract article content from expected
  console.error = () => {}; // Suppress CSS parsing errors
  const expectedHtml = fixture(expectedFile);
  const expectedArticleContent = extractArticleFromExpected(expectedHtml);
  const expectedDom = new JSDOM(expectedArticleContent);
  const expectedText = expectedDom.window.document.body.textContent?.trim() || '';
  console.error = originalConsoleError;

  // Find unwanted elements
  const unwantedElements = findUnwantedElements(extractedHtml);

  // Calculate similarity
  const textSimilarity = calculateTextSimilarity(extractedText, expectedText);

  // Count elements
  console.error = () => {}; // Suppress CSS parsing errors
  const extractedDoc = new JSDOM(extractedHtml).window.document;
  const expectedDoc = new JSDOM(expectedArticleContent).window.document;
  console.error = originalConsoleError;

  const extractedCount = extractedDoc.querySelectorAll('*').length;
  const expectedCount = expectedDoc.querySelectorAll('*').length;

  // Find missing content (key phrases from expected)
  const missingContent: string[] = [];
  const keyPhrases = ['samsung', 'exynos', 'chip', 'processor', 'galaxy'];
  for (const phrase of keyPhrases) {
    if (
      expectedText.toLowerCase().includes(phrase) &&
      !extractedText.toLowerCase().includes(phrase)
    ) {
      missingContent.push(phrase);
    }
  }

  return {
    unwantedElements,
    missingContent,
    textSimilarity,
    elementCounts: {
      extracted: extractedCount,
      expected: expectedCount,
    },
  };
}

function printReport(result: ComparisonResult): void {
  console.log('='.repeat(60));
  console.log('📊 EXTRACTION COMPARISON REPORT');
  console.log('='.repeat(60));

  // Unwanted elements
  console.log('\n🚫 Unwanted Elements Found:');
  if (result.unwantedElements.length === 0) {
    console.log('  ✅ None found - all unwanted elements were removed!');
  } else {
    console.log(`  ❌ Found ${result.unwantedElements.length} unwanted pattern(s):`);
    result.unwantedElements.forEach((pattern) => {
      console.log(`     - ${pattern}`);
    });
  }

  // Missing content
  console.log('\n📝 Missing Content:');
  if (result.missingContent.length === 0) {
    console.log('  ✅ All key phrases found in extracted content');
  } else {
    console.log(`  ⚠️  Missing ${result.missingContent.length} key phrase(s):`);
    result.missingContent.forEach((phrase) => {
      console.log(`     - "${phrase}"`);
    });
  }

  // Text similarity
  console.log('\n📈 Text Similarity:');
  const similarityPercent = (result.textSimilarity * 100).toFixed(1);
  if (result.textSimilarity > 0.8) {
    console.log(`  ✅ ${similarityPercent}% - High similarity`);
  } else if (result.textSimilarity > 0.6) {
    console.log(`  ⚠️  ${similarityPercent}% - Moderate similarity`);
  } else {
    console.log(`  ❌ ${similarityPercent}% - Low similarity`);
  }

  // Element counts
  console.log('\n🔢 Element Counts:');
  console.log(`  Extracted: ${result.elementCounts.extracted} elements`);
  console.log(`  Expected:  ${result.elementCounts.expected} elements`);
  const diff = result.elementCounts.extracted - result.elementCounts.expected;
  if (Math.abs(diff) < 50) {
    console.log(`  ✅ Difference: ${diff > 0 ? '+' : ''}${diff} (acceptable)`);
  } else {
    console.log(`  ⚠️  Difference: ${diff > 0 ? '+' : ''}${diff} (may need review)`);
  }

  // Overall assessment
  console.log('\n' + '='.repeat(60));
  console.log('📋 Overall Assessment:');
  const issues = result.unwantedElements.length + result.missingContent.length;
  if (issues === 0 && result.textSimilarity > 0.7) {
    console.log('  ✅ EXCELLENT - Extraction quality is very good!');
  } else if (issues < 3 && result.textSimilarity > 0.6) {
    console.log('  ⚠️  GOOD - Minor issues detected');
  } else {
    console.log('  ❌ NEEDS IMPROVEMENT - Several issues detected');
  }
  console.log('='.repeat(60) + '\n');
}

// Main execution
function main(): void {
  const inputFile = 'cnet-galaxy-chip-full.html';
  const expectedFile = 'cnet-galaxy-chip-full-expected.html';

  try {
    const result = compareExtraction(inputFile, expectedFile);
    printReport(result);

    // Exit with error code if there are significant issues
    const hasIssues = result.unwantedElements.length > 0 || result.textSimilarity < 0.6;
    process.exit(hasIssues ? 1 : 0);
  } catch (error) {
    console.error('❌ Error during comparison:', error);
    process.exit(1);
  }
}

main();

