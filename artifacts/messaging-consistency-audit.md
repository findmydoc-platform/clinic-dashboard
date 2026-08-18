# Messaging consistency audit

## Scope

- Compared the current local `Dashboard`, `Reviews`, and `Clinic profile` workspace views with Messaging prototype variant B.
- All captures use the same application shell, light theme, and a 1600 × 1000 viewport.
- The three reference views come from the actual local workspace story, not from placeholders inside the Messaging prototype.

## Findings

1. **Dashboard — healthy page pattern.** A constrained page container, page heading, summary cards, and vertical content flow fit an analytical overview.
2. **Reviews — healthy page pattern.** A constrained page container, summaries, filters, and vertically stacked records fit a browse-and-manage workflow.
3. **Clinic profile — healthy page pattern.** A constrained page container, editorial sections, gallery, and forms fit a settings and content-management workflow.
4. **Messaging B — healthy operational workspace pattern.** A persistent queue, active conversation, and composer need to remain visible together. Using the available canvas reduces context switching while capped message and composer widths preserve readability.

## Decision

Messaging variant B should remain the preferred direction. Cross-product consistency should be maintained through the shared shell, navigation, typography, colors, borders, controls, spacing scale, and interaction states—not by forcing every workflow into the same outer page container.

Recommended layout rule:

> Page-oriented views use the standard constrained content container. Continuous operational workspaces may use the full available canvas while constraining readable content inside it.

The difference therefore reads as a purposeful work mode within the same product, not as a separate product. Returning Messaging to an inset card would improve superficial geometric consistency but reduce useful queue, conversation, and composer space.

## Guardrails

- Keep the queue width bounded rather than proportional at very wide resolutions.
- Keep message, activity, and composer content capped; do not stretch text across the full detail pane.
- Reuse this full-canvas pattern only for future continuous operational workspaces, so Messaging does not become an unexplained one-off exception.
- The visual review does not prove keyboard order, zoom/reflow, or screen-reader announcements; those require separate interaction checks.

## Evidence

- `audit-01-dashboard.jpg`
- `audit-02-reviews.jpg`
- `audit-03-clinic-profile.jpg`
- `audit-04-messaging-flat.jpg`
