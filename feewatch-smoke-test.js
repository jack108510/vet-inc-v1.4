#!/usr/bin/env node
/**
 * FeeWatch conversion smoke test.
 * Checks the compiled index.html for:
 *   - Required FeeWatch/read-only content and identity
 *   - Absence of forbidden legacy action labels
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(filePath, 'utf8');
const lower = html.toLowerCase();

let pass = 0;
let fail = 0;

function check(label, condition) {
  if (condition) {
    console.log('  PASS  ' + label);
    pass++;
  } else {
    console.log('  FAIL  ' + label);
    fail++;
  }
}

console.log('\nFeeWatch Smoke Test\n' + '='.repeat(40));
console.log('\n-- Required identity & read-only content --');

check('Title contains FeeWatch', html.includes('FeeWatch'));
check('Logo text is FeeWatch', html.includes('Fee<span>Watch</span>'));
check('Read-only badge present', lower.includes('read-only'));
check('"no price changes" disclaimer present', lower.includes('no price changes'));
check('Tab: Pricing Change Review', html.includes('Pricing Change Review'));
check('Tab: Locations', html.includes('>Locations<') || html.includes('Locations\n'));
check('Tab: Data Readiness', html.includes('Data Readiness'));
check('Tab: Settings', html.includes('>Settings<') || html.includes('Settings\n'));
check('Review Queue table present', html.includes('Review Queue'));
check('KPI: Changes Reviewed', html.includes('Changes Reviewed'));
check('KPI: Needs Analyst Review', html.includes('Needs Analyst Review'));
check('KPI: Insufficient Evidence', html.includes('Insufficient Evidence'));
check('KPI: Locations in Scope', html.includes('Locations in Scope'));
check('Empty state / data pending message', lower.includes('awaiting data') || lower.includes('data pending'));
check('Data Readiness tab has required export inputs', html.includes('Required AmeriVet export inputs'));
check('Data Readiness tab has fee_history field listed', html.includes('old_list_fee'));
check('Guardrails card present', lower.includes('guardrails') || lower.includes('read-only') && lower.includes('cannot create'));
check('"cannot create" price change guardrail', lower.includes('cannot create'));
check('Analyst actions listed (no price prescription)', lower.includes('review with operations') || lower.includes('monitor next period'));
check('FeeWatch described as review-only in About', lower.includes('does not create, recommend, approve'));

console.log('\n-- Forbidden legacy action labels (must be ABSENT) --');

const forbidden = [
  ['Annual Revenue Opportunity', 'Annual Revenue Opportunity'],
  ['Suggested Price', 'suggested price'],
  ['Implement Campaign', 'implement campaign'],
  ['.99 Pricing (campaign card)', 'c2activatebtn'],
  ['Uplift (header/kpi)', 'uplift-card'],
  ['Start Campaign button', 'start campaign'],
  ['PDF Report button (legacy)', 'generatereport('],
  ['Pricing Intelligence tab label', "pricing intelligence"],
  ['Insights & Actions tab label', "insights &amp; actions"],
  ['Key Indicators (legacy tab name)', "key indicators\n"],
  ['Marketing tab', ">marketing<"],
  ['Inventory Intelligence tab', "inventory intelligence"],
  ['AI Assistant tab', ">ai assistant<"],
  ['Supabase key in JS', 'supabase.co'],
  ['Campaign card markup', 'campaign-card c-blue'],
  ['Implement modal', 'implementmodal'],
  ['Vet INC AI (chat label)', 'vet inc ai'],
  ['Rosslyn Veterinary', 'rosslyn veterinary'],
];

forbidden.forEach(([label, needle]) => {
  check('No ' + label, !lower.includes(needle.toLowerCase()));
});

console.log('\n' + '='.repeat(40));
const total = pass + fail;
console.log(`Result: ${pass}/${total} passed, ${fail} failed\n`);

process.exit(fail > 0 ? 1 : 0);
