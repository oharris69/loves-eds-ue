# Loves.com Homepage Migration Plan

## Objective
Migrate the Love's homepage (`https://www.loves.com/`) into the **loves-eds-ue** AEM Edge Delivery Services project as a single-page migration, producing authorable content that renders faithfully against the original.

## Source & Target
- **Source page:** `https://www.loves.com/` (homepage)
- **Target site:** `loves-eds-ue` (title "Loves")
- **AEM site path:** `/content/loves-eds-ue`
- **Assets path:** `/content/dam/loves-eds-ue`
- **Project type:** Crosswalk / Universal Editor project (`component-definition.json`, `component-models.json`, and `component-filters.json` are present), so migrated content will ultimately be converted to JCR and uploaded to the AEM author.

## Current State (verified)
- Project profile initialized (`.migration/project.json`, `migration-work/profile.json`).
- No content migrated yet — `content/` is empty.
- No page templates, block mappings, or import infrastructure (parsers/transformers) exist yet.
- Import tooling under `tools/importer/` not yet generated.

## Approach
Run the standard single-page migration flow: confirm project properties → scrape the source → analyze page structure and identify block variants → create the page template and map blocks → generate import infrastructure → build and run the import script → migrate design/styling → preview and validate against the original → (optionally) convert to JCR and upload for authoring.

## Checklist
- [ ] **Confirm project properties** — determine project type and the correct block-library endpoint for available EDS blocks.
- [ ] **Scrape the homepage** — fetch `https://www.loves.com/`, download images, extract metadata, and produce cleaned HTML.
- [ ] **Analyze page structure** — identify sections, content sequences, default-content vs. block decisions, and candidate block variants (produce analysis artifacts).
- [ ] **Survey the block palette** — inventory available project blocks + Block Collection to map homepage content to existing blocks; create new block variants only where needed.
- [ ] **Create the page template** — add a homepage template entry (name, URL, description) to `page-templates.json`.
- [ ] **Map blocks** — add DOM selectors for each identified block variant to the template.
- [ ] **Generate import infrastructure** — create block parsers and page transformers under `tools/importer/`.
- [ ] **Build & bundle the import script** — assemble the import script combining the template, parsers, and transformers.
- [ ] **Run the import** — execute the bundled import to generate the homepage content HTML (no hand-authored HTML).
- [ ] **Migrate design & styling** — extract design tokens and block styles from the source and apply EDS-ready CSS.
- [ ] **Preview & validate** — render the imported page in the local preview, compare against the original, and iterate on content/layout fixes.
- [ ] **Visual critique** — run a full-page comparison against `https://www.loves.com/` and resolve visual discrepancies.
- [ ] **Convert to JCR & upload (optional/final)** — for this Universal Editor project, convert imported HTML to JCR XML and upload/publish so the page is authorable, pending your go-ahead.

## Notes & Decisions Needed
- The homepage is typically the most complex page on a site (hero, navigation, promos, footer). Header/nav and footer migration are handled by dedicated flows and can be scoped in or out — I'll flag whether to include them once analysis reveals the structure.
- Final upload/publish to the AEM author requires the Adobe-credentials opt-in to be enabled in Settings; if it's off, I'll pause before that step rather than ask for any token.

> **Execution note:** This plan is ready to run, but carrying it out modifies files and runs import tooling — that requires **Execute mode**. Approve the plan (or switch to Execute mode) and I'll begin with confirming project properties and scraping the homepage.
