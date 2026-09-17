# FeeWatch demo — AmeriVet data export

## Purpose
Build a realistic **read-only FeeWatch review experience** from AmeriVet’s raw export. It shows how historical pricing or fee changes performed after they went live. FeeWatch cannot create, recommend, approve, or write any price change.

## Demo boundary
This is a **clickable, data-backed demonstration**, not a production application. Once AmeriVet’s export arrives, we will use a curated static dataset derived from it to populate the screens and interactions. Do not build live imports, API integrations, authentication, saved workflows, PMS writeback, or production-grade multi-tenant infrastructure for this phase.

The objective is a credible product walkthrough: selected historical fee changes, their evidence, appropriate limits, and portfolio/location views based on the supplied export.

## Preserve from the current clinic dashboard
- Clean white workspace, navy/blue visual language, compact KPI cards, left navigation and tables.
- Familiar location/context header.
- Drill-down interaction: high-level review queue → selected change → supporting detail.

## Replace
Remove or rename any legacy language and actions:
- `Annual Revenue Opportunity`, `Suggested Price`, `Implement Campaign`, `Campaign`, `Uplift`, and `Urgent (>15% gap)`.
- Marketing, inventory, and unrelated assistant pages from the demo path.
- Any claim that a change caused a result without showing the evidence and confidence.

## Demo flow

### 1. Portfolio review — default landing screen
**Title:** `FeeWatch | Pricing Change Review`

Show selected clinics and a review period. The primary list is a queue of historical fee changes, with:
- clinic/location;
- service/category;
- change date;
- fee before → after;
- current review status: `Performing as expected`, `Needs review`, `Insufficient evidence`;
- confidence: High / Moderate / Low;
- one evidence-led sentence, e.g. `Volume fell 11% versus the matched baseline while net revenue held flat.`

Top cards should state neutral, verifiable counts:
- Changes reviewed
- Changes needing analyst review
- Changes with insufficient evidence
- Locations in scope

### 2. Change detail — the main product moment
For one selected fee change, display:
- **Change record:** location, service, old fee, new fee, effective date.
- **Before / after:** actual paid price, quantity/service use, net revenue, discount rate, and transaction count.
- **Context:** matched historical baseline and same-season comparison where data permits.
- **Finding:** a short, bounded conclusion.
- **Confidence and limits:** missing data, small sample, confounding changes, or unavailable comparison group.
- **Analyst action:** `Review with operations` / `Monitor next period` / `No material concern` — no automatic price recommendation.

### 3. Location view
A location-level roll-up of changes reviewed, changes requiring attention, and a clear link into the underlying evidence.

## Minimum raw-export fields
No owner names, pet names, addresses, or clinical notes are needed for the demo.

| Dataset | Required fields |
|---|---|
| Locations | Stable location ID, location name, group/region if available |
| Services / fee catalogue | Service ID/code, service description, category, location ID |
| Fee history | Location ID, service ID/code, old list fee, new list fee, effective date; all known historical changes preferred |
| Invoice / transaction lines | Date, location ID, service ID/code, quantity, gross/charged amount, discount amount, net amount, de-identified invoice/transaction ID, void/refund indicator if available |
| Mapping / reference | Any service-code changes, merged services, category mapping, and export definitions |

## Preferred scope for the first mockup
- 3–5 representative locations.
- At least 12 months of transaction history where available.
- A small, identifiable set of fee changes with at least 90 days before and after each change.

## Guardrails
- FeeWatch is read-only: it cannot create, recommend, approve, or write a price change to any PMS.
- The mockup must label sample/limited evidence honestly.
- No patient or client identity is required or should be loaded.
- Do not frame findings as price prescriptions or guaranteed causal outcomes.
