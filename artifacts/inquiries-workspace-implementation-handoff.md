# Inquiries workspace implementation handoff

## Status

This document captures the approved outcome of the Wayfinder prototype ticket
[How does Inquiries become the shared Dashboard workspace?](https://github.com/findmydoc-platform/management/issues/363).
It is a future implementation input, not an implementation plan and not production code.

## Source-of-truth order

1. The Wayfinder ticket is the product and behavior contract.
2. The prototype commit on `feature/prototype-inquiries-workspace-363` is the approved visual, responsive, interaction, and copy reference.
3. The current `origin/main` of `findmydoc-platform/clinic-dashboard` is the technical and architectural baseline.

If prototype code conflicts with current architecture, preserve the approved visible behavior and copy while implementing it through the current feature structure, controllers, contracts, shared components, and tests. Do not mechanically merge the throwaway component into production.

## Approved visual direction

- Use the wide application-canvas layout formerly shown as Variant B.
- The workspace reaches the shell content edges and keeps the queue and detail pane as its structural boundaries.
- The queue remains bounded rather than stretching proportionally on wide displays.
- Inquiry details, timeline content, and composer content remain capped at `68rem` for readable line lengths.
- The inset rounded workspace card formerly shown as Variant A is rejected.
- Do not implement a layout switcher, arrow-key layout cycling, or a `variant` URL parameter.
- Page-oriented Dashboard, Reviews, and Clinic Profile views keep their existing constrained page layout. The full canvas is an intentional operational-workspace pattern, not a global shell change.

## Copy contract

All user-facing English strings in `InquiriesWorkspacePrototype.tsx` are frozen implementation references unless the Wayfinder ticket explicitly changes them. Do not rewrite them during implementation. Critical reviewed copy includes:

| Surface                     | Approved copy                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Navigation and workspace    | `Inquiries`, `Shared clinic workspace`                                                                             |
| Queue search                | `Search inquiries…`                                                                                                |
| Primary filters             | `Open`, `Unread`, `Closed`, `Spam`, `All`                                                                          |
| Status filter               | `All statuses`, `Submitted`, `In review`, `Contacted`                                                              |
| Detail disclosure           | `Inquiry details`                                                                                                  |
| Timeline divider            | `Latest activity`                                                                                                  |
| Guest label                 | `Guest inquiry · No chat`                                                                                          |
| Conversation state          | `Conversation open`, `Conversation closed`                                                                         |
| Note marker                 | `Internal note · Clinic only`                                                                                      |
| Composer modes              | `Reply to patient`, `Internal note`                                                                                |
| Delivery context            | `Sent through findmydoc`, `Clinic only · No patient notification`                                                  |
| Guest composer explanation  | `No patient chat yet. This inquiry is not linked to a verified patient account.`                                   |
| Closed composer explanation | `The conversation is closed. Internal notes remain available.`                                                     |
| Reply placeholder           | `Write a reply…`                                                                                                   |
| Note placeholder            | `Add clinic-only context…`                                                                                         |
| Empty detail                | `Select an inquiry`                                                                                                |
| Contact disclosure          | `Contact details`, `Protected contact details`                                                                     |
| Contact caveat              | `Read-only. Off-platform contact is not added to the conversation automatically.`                                  |
| Missing guest contact       | `No verified contact details are available for this guest inquiry.`                                                |
| Actions                     | `Close conversation`, `Reopen conversation`, `Mark as read`, `Mark as unread`, `Mark as spam`, `Remove spam label` |
| Spam lock                   | `Conversation locked while spam`                                                                                   |
| Spam events                 | `Marked as Spam and conversation closed.`, `Spam label removed. Conversation remains closed.`                      |

The UI must preserve the `findmydoc` lowercase brand spelling.

## Approved behavior and state coverage

The future implementation must cover the complete state contract in the Wayfinder ticket, not only the default screenshot. The prototype specifically demonstrates:

- one `Inquiries` navigation destination combining queue and communication workspace;
- no automatic desktop selection without an inquiry deep link;
- queue search, lifecycle filters, status filter, unread counts, and last-activity ordering;
- patient-bound open inquiry with reply and internal-note modes;
- Guest Inquiry with internal notes but no patient reply;
- Closed Inquiry with internal notes available and patient reply hidden;
- Spam as a closed state with protected contact details and no patient reply;
- status and lifecycle events in the shared clinic timeline;
- long treatment names and wrapping at intermediate widths;
- mobile list/detail navigation without horizontal clipping;
- session-local drafts separated by inquiry and composer mode;
- a 3,000-character validation state that preserves pasted text and blocks sending until corrected;
- attachment affordances and sent attachment cards;
- menus that close after outside interaction and action selection;
- light and dark themes.

The ticket remains authoritative for persistence, conflicts, upload lifecycle, authorization, polling, unread semantics, and deferred dependencies that a throwaway UI cannot prove.

## Reference evidence

- Wide approved layout: `inquiries-layout-flat-ultrawide-constrained.jpg`
- Mobile approved layout: `inquiries-layout-flat-mobile-constrained-final.jpg`
- Dark approved layout: `inquiries-layout-flat-dark-constrained.jpg`
- A/B decision evidence: `design-qa-layout-variants.jpg`
- Guest and intermediate-width header: `inquiries-workspace-feedback-aylin.jpg`
- Long treatment wrapping: `inquiries-workspace-feedback-long-treatment.jpg`
- Mobile list: `inquiries-workspace-feedback-mobile-list.jpg`
- Mobile details: `inquiries-workspace-feedback-mobile-details.jpg`
- Mobile spam: `inquiries-workspace-feedback-mobile-spam.jpg`
- Over-limit composer: `inquiries-workspace-feedback-over-limit.jpg`
- Cross-view consistency audit: `messaging-consistency-audit.md`
- Full prototype QA record: `../design-qa.md`

Historical framed-layout images are retained only as decision evidence. They are not implementation targets.

## Future implementation-thread prompt

Implement the approved shared `Inquiries` workspace in `findmydoc-platform/clinic-dashboard` from a clean `origin/main` checkout. First inspect the current Dashboard code, the complete Wayfinder ticket, and the approved prototype commit on `feature/prototype-inquiries-workspace-363`.

Treat the Wayfinder ticket as the product contract and the prototype commit as the binding visual, responsive, interaction, and copy reference. Do not reopen design exploration, rename reviewed copy, or introduce an alternative layout. Variant B is the only approved layout; Variant A, the comparison switcher, keyboard variant cycling, and `variant` URL state are excluded.

Do not mechanically merge the throwaway prototype. Reconcile the approved result with the current repository architecture, existing shared components, domain contracts, controllers, adapters, and tests. Ask only when the ticket, prototype, and current code contain a genuine product contradiction or an unresolved decision.

Implement every approved state, including Guest, Open, Closed, Spam, internal notes, patient replies, unread behavior, status and lifecycle events, drafts, attachments, conflicts, errors, retry and responsive behavior. Respect all explicit external dependencies and out-of-scope boundaries from the Wayfinder map.

Before handoff, run the repository-required validation and compare fresh light-mode desktop, intermediate-width, and mobile screenshots against the approved references. Check dark mode, keyboard operation, focus behavior, menus, overflow, and relevant empty, loading, error, upload, closed, and spam states.

## Out of scope for this handoff

- product implementation, migration, deployment, or production activation;
- Website account creation or Guest Inquiry binding;
- transactional email decisions;
- retention, deletion, and moderation decisions still owned by their Wayfinder research ticket;
- domain/API/BFF decisions still owned by their Wayfinder research ticket;
- creating implementation items before the Wayfinder map reaches its destination.
