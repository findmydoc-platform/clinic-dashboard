# Design QA

## Evidence

- Source visual truth:
  `/private/tmp/product-design-audit-doctor-option2/00-reference-option-2.png`
- Final light implementation:
  `/private/tmp/product-design-audit-doctor-option2/10-final-light-clinic-context.png`
- Final mobile implementation:
  `/private/tmp/product-design-audit-doctor-option2/11-final-mobile-light.png`
- Final dark implementation:
  `/private/tmp/product-design-audit-doctor-option2/12-final-dark.png`
- Equal-size source and implementation comparison:
  `/private/tmp/product-design-audit-doctor-option2/13-final-reference-vs-implementation.png`
- Post-review light implementation:
  `/private/tmp/product-design-audit-doctor-option2/14-review-fixes-final-light.jpg`
- Post-review source and implementation comparison:
  `/private/tmp/product-design-audit-doctor-option2/15-reference-vs-review-fixes.png`
- Desktop source, implementation, and viewport: `1487 × 1058`
- Mobile viewport: `390 × 844`
- State: active Sarah Schmidt profile with portrait, two qualifications,
  German and English, long biography, and two reviewed specialty assignments.

## Full-view comparison

The selected Option 2 reference and final light implementation were reviewed
together in one equal-size side-by-side image. The implementation now matches
the reference's wide editor, approximately one-third/two-thirds column split,
large portrait with overlaid camera action, publication row, full-width
identity fields, tag-based medical fields, long biography, compact specialty
table, and anchored footer.

Intentional contract-driven differences:

- The real Sarah Schmidt asset and fixture data replace the generated person.
- The upload guidance lists every supported media type and the exact `4 MB`
  contract.
- Medical specialties remain optional and can only use the reviewed catalogue.
- The implementation uses the existing clinic-profile composition as its
  backdrop instead of reproducing the generated dashboard shell.

## Resolved findings

- P1: Qualifications and languages now use a reusable tag input derived from
  the current shadcn combobox/chips pattern and backed by Base UI.
- P1: The editor uses the selected one-third/two-thirds desktop structure.
- P1: `Add specialty` creates an empty row that requires explicit choices;
  unsaved rows can be discarded and persisted rows cannot be removed.
- P1: A submit attempt reveals field-local errors with `aria-invalid`,
  associated error text, and focus on the first invalid control.
- P2: Portrait, camera action, field geometry, helper placement, specialty
  headings, years suffix, and footer treatment now follow Option 2.
- P2: Initial focus moves to the first meaningful form control instead of the
  close action.
- P2: The visual fixture now includes a long biography and two specialty rows.
- P2: Specialty-row validation now marks and focuses the actual invalid row and
  associates that row with its error message.
- P2: The hidden upload input is removed from keyboard tab order while the
  visible profile-photo action remains keyboard accessible.

## Responsive and theme checks

- At `390 × 844`, the editor collapses to one column, keeps the footer visible,
  scrolls the body independently, and reports no horizontal overflow.
- At `1280 × 900` in dark mode, text, controls, tags, borders, portrait
  treatment, switch, and footer retain clear contrast.
- At `1487 × 1058` in light mode, the final browser session reports no warning
  or error console entries and no horizontal overflow.

## Interaction evidence

- Storybook covers tag creation/removal, fixed language selection, inline
  create validation, editing, partial failure, unsaved-close confirmation,
  mobile, dark mode, and the empty/discardable specialty row.
- Tag-input stories additionally cover comma, paste, blur, normalization,
  deduplication, and configured limits.
- The tag popup has a named, keyboard-focusable multiselect listbox.
- Required identity, qualification, and language controls expose associated
  validation feedback.

## Findings

No actionable P0, P1, or P2 design findings remain.

The remaining P3 differences are intentional: the real product fixture differs
from the generated doctor, the supported file guidance is more complete, and
specialties are optional under the approved product contract.

final result: passed
