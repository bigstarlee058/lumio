#!/usr/bin/env node
/**
 * Fix useBlockStatements violations by adding braces to single-line if/else statements.
 * Only processes specific files that cause biome --unsafe to hang.
 */
import { readFileSync, writeFileSync } from 'fs';

const files = [
  'frontend/app/(main)/custom-tables/[id]/page.tsx',
  'frontend/app/(main)/custom-tables/page.tsx',
  'frontend/app/shared/[token]/page.tsx',
];

for (const filePath of files) {
  let content = readFileSync(filePath, 'utf8');
  let fixCount = 0;

  // Pattern 1: `if (cond) statement;` on a single line (not already braced)
  content = content.replace(
    /^(\s*)(if\s*\([^)]*(?:\([^)]*\))*[^)]*\))\s+(?!\{)(.+;)\s*$/gm,
    (match, indent, condition, body) => {
      // Don't touch if body already starts with {
      if (body.trimStart().startsWith('{')) return match;
      fixCount++;
      return `${indent}${condition} { ${body} }`;
    },
  );

  // Pattern 2: `else statement;` on a single line
  content = content.replace(
    /^(\s*)(else)\s+(?!\{|if)(.+;)\s*$/gm,
    (match, indent, keyword, body) => {
      if (body.trimStart().startsWith('{')) return match;
      fixCount++;
      return `${indent}${keyword} { ${body} }`;
    },
  );

  if (fixCount > 0) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${filePath} — ${fixCount} fixes`);
  }
}

console.log('Done');
