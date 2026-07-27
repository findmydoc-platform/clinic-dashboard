# Design QA

## Evidence

- Source visual truth: the selected Option 2 visual from the implementation thread
- Browser-rendered implementation: the final light-mode desktop capture attached to the implementation handoff
- Equal-size side-by-side comparison: the final source-versus-implementation comparison reviewed during design QA
- Responsive evidence:
  - Light mobile: final `390 × 844` light-mode capture
  - Dark mobile: final `390 × 844` dark-mode capture
- Desktop comparison viewport: `1487 × 1058` CSS pixels
- Source pixels: `1487 × 1058`
- Implementation pixels: `1487 × 1058`
- Desktop device scale factor: `1`
- Density normalization: none required; source and implementation were compared at equal pixel dimensions.
- Mobile viewport and screenshot pixels: `390 × 844`
- Mobile device scale factor: `1`
- State: Lukas Weber inquiry selected after a successful `Submitted` to `In review` transition.

## Full-view comparison

The source and implementation were opened together in one equal-size comparison input. The final desktop pass aligns the `376px` queue split and the principal header, metadata, date, and inquiry-card landmarks within roughly `10px`. The implementation preserves the two-column queue/detail composition, calm single-action header, four-field inquiry summary, original inquiry card, and inline status event. The existing dashboard shell reserves vertical space outside this component, so the compared component ends above the viewport edge.

Intentional state and copy corrections:

- The source combines a `Submitted` status with an event saying the status changed to `In review`. The implementation shows `In review`, removes the new-state dot, and changes the list summary to `Up to date`.
- `Search conversations…` is `Search inquiries…` because the selected surface is inquiry-only.
- `New inquiries` is `Inquiries` because the queue can retain later workflow states.
- The inquiry button, dialog, composer, attachments, menus, and recent-chat treatment are absent.

## Focused-region comparison

No additional crop was required because the equal-size desktop comparison kept the header, metadata, contact links, inquiry card, and status event legible. Separate light and dark mobile captures were used to inspect header wrapping, control placement, tap-target spacing, contrast, and horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: the product font stack, bold hierarchy, compact labels, body line height, and truncation match the established dashboard system. No broken desktop wrapping remains.
- Spacing and layout rhythm: the sidebar/detail split, header grouping, metadata grid, separators, inquiry card, radii, and elevation preserve the source structure. The desktop header and metadata density were increased after review. Mobile collapses to one panel without horizontal overflow.
- Colors and visual tokens: background, canvas, borders, teal selected state, semantic status treatment, and foreground contrast use the existing light/dark design tokens. Both themes were visually checked.
- Image quality and asset fidelity: the target contains no photographic or illustrative assets. Initial avatars and outline icons use the existing Avatar and Lucide component system; no custom SVG, CSS art, or placeholder image was introduced.
- Copy and content: labels describe an inquiry-only workflow and the visible status is consistent with the recorded transition.
- Icons and controls: search, identity, timing, contact, back, status, and event icons share one outline family and remain aligned. The status control is the only desktop header action.
- Accessibility and responsiveness: the inquiry collection is a semantic list, result counts use a focused status region, selection uses `aria-pressed`, the status trigger preserves focus while busy, and mobile input text remains `16px`. Keyboard menu behavior, mobile back-focus restoration, minimum control heights, and `390px` light/dark layouts were verified.

## Findings

No actionable P0, P1, or P2 visual findings remain. The review findings for search/detail divergence, notification focus, status-trigger focus loss, list semantics, contradictory section copy, mobile input size, missing selection edge, and compressed desktop density were resolved and retested.

## Open questions

None.

## Comparison history

- Pass 1: reviewer feedback found compressed desktop density and an incomplete selected-row treatment.
- Pass 2: the queue split, header, metadata spacing, section density, and accent edge were aligned more closely to the source at the exact source viewport.
- Responsive pass: `390 × 844` light and dark captures confirmed a stable single-panel detail layout with `scrollWidth === 390`.
- Post-validation evidence: final desktop light, mobile light, and mobile dark captures attached to the implementation handoff.

## Primary interactions tested

- Select an inquiry on mobile and return to the list.
- Return keyboard focus to the selected inquiry after the mobile back action.
- Open the status menu by keyboard, preserve trigger focus while busy, and persist a valid transition to `In review`.
- Render the matching status system event.
- Handle a failed status update without applying the optimistic state.
- Search to a second inquiry and render an explicit zero-result state without stale details.
- Open a message notification at its location and focus the Messages heading without passing a stale conversation identifier.
- Exercise the authenticated inquiry status route through the current worktree E2E server.

## Console errors

The final desktop light, mobile light, and mobile dark captures reported no browser console warnings or errors.

## Implementation checklist

- [x] Match Option 2 without an inquiry button.
- [x] Keep status as the only header action.
- [x] Preserve server-validated status transitions and system events.
- [x] Verify desktop light, mobile light, and mobile dark states.
- [x] Verify Storybook interactions and browser console output.

final result: passed
