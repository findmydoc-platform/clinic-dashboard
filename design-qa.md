# Design QA — Inquiries Workspace Prototype

- Final result: `passed`
- Source visual truth: `artifacts/inquiries-selected-a-source.jpg`
- Feedback baseline: `artifacts/inquiries-workspace-final-desktop.jpg`
- Final implementation: `artifacts/inquiries-workspace-feedback-final-desktop.jpg`
- Desktop viewport: 1440 × 1000 CSS pixels at device scale 1
- Source pixels: 1440 × 1000
- Implementation pixels: 1440 × 1000
- Density normalization: none
- Compared state: light theme, Lukas Weber deep link, open conversation, `Contacted` inquiry status
- Initial full comparison: `artifacts/design-qa-before-after-full.jpg`
- Feedback comparison: `artifacts/design-qa-feedback-before-after.jpg`
- Mobile evidence: `artifacts/inquiries-workspace-feedback-mobile-list.jpg`, `artifacts/inquiries-workspace-feedback-mobile-details.jpg`, `artifacts/inquiries-workspace-feedback-mobile-spam.jpg`
- Dark-mode evidence: `artifacts/inquiries-workspace-feedback-final-dark.jpg`
- Layout comparison: `artifacts/design-qa-layout-variants.jpg`
- Layout viewport: 1567 × 964 CSS pixels at device scale 1
- Layout variants: `artifacts/inquiries-layout-framed.jpg`, `artifacts/inquiries-layout-flat.jpg`
- Layout mobile evidence: `artifacts/inquiries-layout-framed-mobile.jpg`, `artifacts/inquiries-layout-flat-mobile.jpg`
- Flat-layout dark evidence: `artifacts/inquiries-layout-flat-dark.jpg`
- Future implementation handoff: `artifacts/inquiries-workspace-implementation-handoff.md`

## Interaction coverage

- No inquiry is selected by default; the detail pane asks the user to select one.
- Selecting a list row opens the inquiry detail.
- A guest inquiry exposes internal notes but no patient reply composer.
- Sending a reply changes the inquiry status to `Contacted`.
- Closing a conversation removes the external reply composer while keeping internal notes available.
- A closed inquiry remains visible in the detail pane even when the active `Open` filter removes it from the list.
- Search, lifecycle filters, status filter, status updates, attachment affordances, and the more-actions menu were exercised.
- The more-actions menu closes on outside interaction and after selecting an action.
- Pasted drafts may exceed 3,000 characters without truncation; the over-limit state is red, announced, and blocks sending until corrected.
- Spam takes precedence over the guest label in the queue and detail header.
- Browser console errors: none.
- The approved wide application canvas is the only rendered layout; no layout switcher or variant query parameter is required.

## Iterations and findings

1. P2 — The mobile detail header compressed the patient identity because status controls competed for the same row. Fixed by moving the controls to a dedicated wrapping row. Verified in `artifacts/inquiries-workspace-final-mobile-guest.jpg`.
2. P2 — The selected variant still carried comparison controls, verbose queue previews, and competing primary actions. Fixed by removing the variant switcher, reducing queue previews to one line, moving close/reopen into the more-actions menu, and making the composer the persistent primary work area.
3. P3 — The navigation unread count is part of the navigation label rather than a separate badge because the current shell API accepts string labels only. Acceptable for this throwaway prototype.
4. P2 — Native select arrows were thin and crowded against the right edge. Fixed with a shared prototype wrapper using a heavier Lucide chevron and consistent inset.
5. P2 — Inquiry context was visually dense on narrow detail panes. Fixed by renaming it to `Inquiry details`, removing duplicated lifecycle data, and grouping the two request facts into bordered icon rows.
6. P2 — Mobile queue previews clipped instead of wrapping. Fixed with a two-line mobile clamp while retaining one-line desktop density.
7. P2 — Intermediate desktop widths compressed the avatar, identity, treatment, and status controls. Fixed by matching the avatar to the two-line identity block and moving actions to a separate row below 1280 pixels. A long treatment fixture verifies graceful wrapping.
8. Decision pending — Automatic status-change entries were not added to the activity timeline. The prototype already renders event entries, but persistence remains subject to the product and data-model decision.
9. Layout decision — Variant B is approved as the sole workspace layout. The inset, rounded Variant A and the comparison switcher were removed. Historical A/B screenshots remain only as decision evidence.
10. P2 — The first flat-layout pass was checked at desktop, mobile, and dark theme. No clipping, horizontal overflow, lost section boundaries, or contrast regression was found.

## Fidelity review

- Typography: existing project font, hierarchy, and weights retained.
- Spacing and density: queue rows reduced without changing the surrounding dashboard rhythm.
- Color and surfaces: existing semantic tokens retained in light and dark modes.
- Assets: canonical brand mark, existing avatar treatment, and Lucide icons retained; no new visual assets introduced.
- Copy: guest, conversation, internal-note, and delivery labels reflect the approved product decisions.

## Wide flat-canvas iteration

- Source visual truth: `/var/folders/q5/4tfj719d17d39dfk6lq_7m8h0000gn/T/codex-clipboard-b049b6e2-4906-4075-a6fe-6f2a7938d07e.png`
- Normalized source: `artifacts/inquiries-layout-flat-source-normalized.jpg`
- Implementation: `artifacts/inquiries-layout-flat-source-viewport.jpg`
- CSS viewport: 1914 × 936 at device scale 1
- Source pixels: 3840 × 2160 at device scale 2; browser chrome removed with a 3828 × 1872 crop, then normalized to 1914 × 936
- Implementation pixels: 1914 × 936
- Compared state: light theme, Lukas Weber deep link, flat workspace
- Full-view comparison: `artifacts/design-qa-flat-wide-before-after.jpg`
- Focused comparison: not required because the change only affects the macro workspace width, queue track, conversation measure, composer measure, and prototype switcher; each is legible in the full-view comparison.
- Additional evidence: `artifacts/inquiries-layout-flat-ultrawide-constrained.jpg`, `artifacts/inquiries-layout-flat-mobile-constrained-final.jpg`, `artifacts/inquiries-layout-flat-dark-constrained.jpg`, `artifacts/inquiries-layout-framed-regression.jpg`

### Findings and comparison history

1. P2 — The initial flat variant still inherited the shell's 1440 px maximum, so it did not use the complete application area on wide displays. Fixed by making only the flat workspace span the viewport area beside the navigation.
2. P2 — Letting the workspace grow made activity and composer content too wide. Fixed by capping the conversation, expanded inquiry details, and composer content at 68 rem while retaining a full-width canvas and toolbar surfaces.
3. Decision — The wide flat canvas is now the only prototype layout. The A/B switcher, arrow-key cycling, and `variant` URL state were removed after review.
4. Post-fix evidence shows no horizontal overflow, clipped controls, or theme regression in the approved layout.

### Required fidelity surfaces

- Fonts and typography: unchanged project DM Sans hierarchy and weights; constrained line lengths reduce wide-screen wrapping drift.
- Spacing and layout rhythm: flat canvas reaches the shell edges; the queue grows to 24 rem from XL upward; activity and composer content remain centered at a 68 rem maximum.
- Colors and visual tokens: existing semantic light and dark tokens retained.
- Image quality and assets: canonical brand mark, avatars, and Lucide icons retained; no new assets introduced.
- Copy and content: unchanged.

Final result: `passed`
