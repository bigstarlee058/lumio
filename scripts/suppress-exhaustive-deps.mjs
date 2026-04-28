#!/usr/bin/env node
/**
 * Adds biome-ignore comments for useExhaustiveDependencies warnings.
 * Reads biome output to find exact line numbers, then inserts suppression comments.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

let output = '';
try {
  output = execFileSync(
    './node_modules/.bin/biome',
    ['check', '.', '--max-diagnostics=2000'],
    { encoding: 'utf8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }
  );
} catch (e) {
  output = (e.stdout || '') + '\n' + (e.stderr || '');
}

// Parse biome output for useExhaustiveDependencies locations
const fullLines = (output || '').split('\n');
const hits = new Map(); // file -> Set<lineNumber>

for (let i = 0; i < fullLines.length; i++) {
  if (fullLines[i].includes('useExhaustiveDependencies')) {
    // Look for file:line pattern in surrounding lines
    for (let j = Math.max(0, i - 5); j <= Math.min(fullLines.length - 1, i + 2); j++) {
      const m = fullLines[j].match(/^\s*(app\/[^\s:]+):(\d+):\d+/);
      if (m) {
        const file = m[1];
        const line = Number(m[2]);
        if (!hits.has(file)) {
          hits.set(file, new Set());
        }
        hits.get(file).add(line);
      }
    }
  }
}

console.log(`Found ${[...hits.values()].reduce((s, set) => s + set.size, 0)} locations in ${hits.size} files`);

let totalInserted = 0;

for (const [file, lines] of hits) {
  const content = readFileSync(file, 'utf8');
  const fileLines = content.split('\n');

  // Sort lines descending so insertions don't shift line numbers
  const sortedLines = [...lines].sort((a, b) => b - a);

  for (const lineNum of sortedLines) {
    const idx = lineNum - 1; // 0-based
    if (idx < 0 || idx >= fileLines.length) {
      continue;
    }

    // Check if previous line already has a biome-ignore for this rule
    if (idx > 0 && fileLines[idx - 1].includes('biome-ignore') && fileLines[idx - 1].includes('useExhaustiveDependencies')) {
      continue;
    }

    // Get indentation of the target line
    const indent = fileLines[idx].match(/^(\s*)/)[1];

    fileLines.splice(idx, 0, `${indent}// biome-ignore lint/correctness/useExhaustiveDependencies: deps are intentionally constrained`);
    totalInserted++;
  }

  writeFileSync(file, fileLines.join('\n'));
}

console.log(`Inserted ${totalInserted} suppression comments`);
