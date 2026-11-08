import { pass, fail } from './helpers.mjs';
import { scopeInflationClaims, adoptionClaims, verifyFacts } from '../verify-cv-facts.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

console.log('\nFrench scope verbs and adoption claims');

const source = [
  '## Work Experience',
  '- **Maintenance applicative (Adequancy).** Reprise et maintenance d\'une plateforme existante de mise en relation avec des managers, développée par d\'autres équipes : évolutions et corrections sur le front Next.js 14 et le back Symfony 6.4.',
  '- **Développement full-stack.** Conception et évolution d\'applications métier avec Vue 3 et NestJS.',
  '- **Migration Java vers NestJS.** Contributeur principal de la refonte d\'une plateforme de facturation pour un groupe de l\'énergie.',
].join('\n');

function check(name, condition) {
  if (condition) pass(name); else fail(name);
}

// Inflation that must be caught: maintenance (tier 1) rewritten as design (tier 2) or lead (tier 3).
const designed = scopeInflationClaims('- Conception de la plateforme Adequancy de mise en relation avec des managers.', source);
check('"Conception" of a maintained platform is flagged', designed.some(c => c.kind === 'scope'));

const piloted = scopeInflationClaims('- Pilotage de la plateforme Adequancy de mise en relation avec des managers.', source);
check('"Pilotage" of a maintained platform is flagged', piloted.some(c => c.kind === 'scope'));

// Truthful rewrites that must pass.
const kept = scopeInflationClaims('- Reprise et maintenance de la plateforme Adequancy (Next.js 14, Symfony 6.4).', source);
check('maintenance wording passes', kept.length === 0);

const designApps = scopeInflationClaims('- Conception d\'applications métier avec Vue 3 et NestJS.', source);
check('"Conception" backed by "Conception et évolution" passes (tier carried over the bare noun)', designApps.length === 0);

// Adoption claims in French.
const adopted = adoptionClaims('- Outil adopté par toutes les équipes de la plateforme Adequancy.', source);
check('"adopté par" without source evidence is flagged', adopted.some(c => c.kind === 'adoption'));

// The gate no longer skips French: no "not in English" coverage warning for a French CV against a French cv.md.
const tmp = mkdtempSync(join(tmpdir(), 'career-ops-french-scope-'));
try {
  const config = join(tmp, 'cv-facts.json');
  writeFileSync(config, JSON.stringify({ allow_metrics: [], allow_facts: [], forbidden_phrases: [], warn_phrases: [] }));
  const cvPath = join(tmp, 'cv.md');
  writeFileSync(cvPath, source);
  const result = verifyFacts('- Reprise et maintenance de la plateforme Adequancy avec le front Next.js 14 et le back Symfony 6.4 pour des managers.', { sourcePaths: [cvPath], configPath: config });
  const text = JSON.stringify(result);
  check('French CV against French cv.md runs the scope check (no English-only gap)', !/English-only/.test(text));
} catch (err) {
  fail(`verifyFacts on French text threw: ${err.message}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
