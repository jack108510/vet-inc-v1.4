#!/usr/bin/env node
/**
 * FeeWatch conversion smoke test.
 * Checks the compiled index.html for:
 *   - Required FeeWatch/read-only content and identity
 *   - Guided case-led review flow (hero + 3-step structure)
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

console.log('\n-- Guided case-led review flow --');

check('Review hero section present (id)', html.includes('id="review-hero-section"'));
check('Central review question present', html.includes('What happened after this fee change?'));
check('Hero read-only note present', lower.includes('cannot create, recommend, approve, or write any price change'));
check('Review steps section present (id)', html.includes('id="review-steps-section"'));

check('Step 1: Change Record heading', html.includes('Change Record'));
check('Step 1: awaiting-data state present', lower.includes('awaiting data export'));
check('Step 1: Location field shown', lower.includes('cr-label') && lower.includes('location'));
check('Step 1: Fee Change field shown', lower.includes('fee change (list price)'));
check('Step 1: Effective Date field shown', lower.includes('effective date'));

check('Step 2: Outcome Evidence heading', html.includes('Outcome Evidence'));
check('Step 2: 90-day window described', lower.includes('90-day'));
check('Step 2: Before/After columns present', lower.includes('before (90d)') && lower.includes('after (90d)'));
check('Step 2: Actual paid price metric row', lower.includes('actual paid price'));
check('Step 2: Volume metric row', lower.includes('volume (services performed)'));
check('Step 2: Net revenue metric row', lower.includes('net revenue'));
check('Step 2: Discount rate metric row', lower.includes('discount rate'));
check('Step 2: Transaction count metric row', lower.includes('transaction count'));
check('Step 2: Matched Baseline column', lower.includes('matched baseline'));
check('Step 2: awaiting-data state present', lower.includes('awaiting transaction data'));

check('Step 3: Finding & Confidence heading', html.includes('Finding') && html.includes('Confidence'));
check('Step 3: Finding box present', html.includes('finding-box'));
check('Step 3: Analyst actions block present', html.includes('analyst-actions'));
check('Step 3: "Review with operations" action', lower.includes('review with operations'));
check('Step 3: "Monitor next period" action', lower.includes('monitor next period'));
check('Step 3: "No material concern" action', lower.includes('no material concern'));
check('Step 3: Confidence indicators present', html.includes('confidence-indicators'));
check('Step 3: High confidence label', lower.includes('high') && lower.includes('matched baseline available'));
check('Step 3: Moderate confidence label', lower.includes('moderate'));
check('Step 3: Low confidence label', lower.includes('low') && lower.includes('limited sample'));
check('Step 3: Data limitations list present', html.includes('limits-list'));
check('Step 3: awaiting-evidence state present', lower.includes('awaiting evidence'));
check('Step 3: finding note — no price change', lower.includes('none recommend or write a price change'));

check('Queue section divider present (secondary position)', html.includes('id="queue-section-header"'));
check('Change Portfolio label present', html.includes('Change Portfolio'));
check('Queue positioned after guided steps in DOM', html.indexOf('id="review-steps-section"') < html.indexOf('id="queue-section-header"'));
check('Guided steps positioned before Review Queue in DOM', html.indexOf('review-steps-section') < html.indexOf('Review Queue'));

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
