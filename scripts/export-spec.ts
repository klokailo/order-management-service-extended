/**
 * Dumps the OpenAPI spec to docs/openapi.json
 * 
 * Run with: npx ts-node scripts/export-spec.ts
 * 
 * We use this in CI to detect breaking API changes between PRs.
 * If the spec diff contains removed paths or changed response schemas, the pipeline fails.
 * Added this after the mobile team got broken by an undocumented API change in sprint 19.
 * Is it perfect? No. Is it better than nothing? Yes.
 */

import fs from 'fs';
import path from 'path';
import swaggerSpec from '../src/config/swagger';

const outputPath = path.join(__dirname, '..', 'docs', 'openapi.json');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log(`Spec exported to ${outputPath}`);
console.log(`Paths documented: ${Object.keys((swaggerSpec as any).paths ?? {}).length}`);
