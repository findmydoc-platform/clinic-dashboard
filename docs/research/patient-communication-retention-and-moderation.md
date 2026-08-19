# Retention, deletion, and moderation of private patient-clinic conversations

Research date: 2026-08-19  
Jurisdiction: European Union and Germany  
Product scope: inquiry-bound private conversations between a patient and one clinic, including messages, attachments, internal notes, moderation records, and audit events

This note is planning research, not legal advice. Counsel and the data protection officer must confirm the controller roles, legal bases, retention schedule, telecommunications classification, and moderation process before production use.

## Executive answer

There is no defensible single retention period for an entire conversation. The product must classify each record by purpose and legal owner. An inquiry that never becomes treatment, a clinic treatment record, consent evidence, a moderation case, an attachment, an account record, and a security audit event can have different expiry rules.

Four conclusions are firm enough to guide the next decisions:

1. Messages and attachments can reveal health information. Each processing purpose needs both an Article 6 legal basis and an Article 9 exception. Contract necessity under Article 6 does not replace the separate Article 9 test. The responsible parties must also decide whether findmydoc is a controller, joint controller, or processor for each purpose. [GDPR, Articles 4, 6, 9, 26, and 28](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
2. Account closure and personal-data erasure are separate operations. Closing authentication does not justify retaining everything, and an erasure request does not override a concrete statutory duty or necessary legal-claim hold. Retained data must be restricted to the remaining purpose. [GDPR, Articles 5, 12, 17, 18, and 19](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
3. A `deletedAt` marker is not final erasure while the personal data remains recoverable in the primary store. Soft delete can be a short operational state or a legal hold, but it needs a hard-delete deadline and coverage for object storage, generated files, caches, logs, and backups. This is an operational inference from the GDPR definition of processing and right to erasure, supported by the BfDI's description of erasure as complete removal. [GDPR, Articles 4 and 17](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679), [BfDI on the right to erasure](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Allgemein/Betroffenenrechte/Betroffenenrechte_L%C3%B6schung_Vergessenwerden.html)
4. The moderation model cannot be chosen before legal classification. If the messaging feature is a number-independent interpersonal telecommunications service, the TDDDG sharply limits platform access to communication content. If findmydoc is a hosting provider under the Digital Services Act, notice-and-action and reason-giving duties may apply. A private thread is not an online platform merely because it is hosted, since it does not disseminate information to the public. [TKG, section 3 numbers 24 and 40](https://www.gesetze-im-internet.de/tkg_2021/__3.html), [TDDDG, section 3](https://www.gesetze-im-internet.de/ttdsg/BJNR198210021.html), [DSA, Articles 3, 8, 14, 16, and 17](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R2065)

## Source-backed legal requirements

### Data category, legal basis, and responsibility

- Treatment interests, symptoms, documents, and medical free text can reveal a person's health status. The product should therefore treat conversation content and attachments as potentially special-category health data, not wait for a message-by-message classification. [GDPR, Article 4 number 15, Article 9, and recital 35](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Every purpose needs an Article 6 basis and an Article 9 exception. Article 9 contains different routes for explicit consent, legal claims, and health care under professional secrecy. The correct route depends on the actual purpose and actor. A clinic's treatment purpose does not automatically cover findmydoc's own analytics, support, abuse prevention, or product-improvement purposes. [GDPR, Articles 6 and 9](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Controller and processor roles follow who determines purposes and means, not the name used in a contract. Joint controllers must allocate responsibilities transparently. A processor contract must cover confidentiality, security, subprocessors, assistance with rights, and deletion or return after the service ends. [GDPR, Articles 4, 26, and 28](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Patients must receive the purposes, legal bases, recipients, and retention period or criteria when their data is collected. This information must distinguish findmydoc processing from clinic processing if the roles or purposes differ. [GDPR, Article 13](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)

### Retention and deletion

- Storage limitation requires deletion or effective anonymisation when the processing purpose ends. Accountability requires findmydoc and the clinic to be able to show how the rule is applied. An open-ended "keep while useful" policy is not enough. [GDPR, Article 5 paragraphs 1 and 2](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Article 17 requires erasure in situations such as loss of necessity, unlawful processing, or withdrawal of the only consent basis. Exceptions include compliance with a legal duty and storage necessary for legal claims. Those exceptions support purpose-bound restricted retention, not an unlimited copy of every thread. [GDPR, Article 17 paragraphs 1 and 3](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- A controller normally has one month to answer a data-subject request, with a possible two-month extension for complexity or volume if it explains the extension within the first month. Erasure recipients may also need notification. [GDPR, Articles 12 and 19](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Restriction is distinct from deletion. It can preserve data that must not be used for ordinary product operations while a legal basis, accuracy dispute, legal claim, or objection is resolved. The product therefore needs an explicit restricted state if it intends to retain content after account closure or a deletion request. [GDPR, Article 18](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)

### Treatment records and business records

- If a conversation or attachment becomes part of a treatment record, the treating party must retain that treatment record for ten years after treatment ends unless another rule sets a different period. Changes must preserve the original content and the time of the change. Not every pre-treatment inquiry is automatically a treatment record. The clinic must classify what it imports or relies on for treatment. [BGB, section 630f](https://www.gesetze-im-internet.de/bgb/__630f.html)
- A patient can request access to the complete treatment record and an electronic copy, subject to the statutory limits. This right exists alongside GDPR rights. [BGB, section 630g](https://www.gesetze-im-internet.de/bgb/__630g.html), [GDPR, Article 15](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Commercial and tax retention rules apply by document class, not because a record happens to be in a chat. Commercial correspondence concerning a commercial transaction is generally retained for six years; booking vouchers are generally retained for eight years; books and comparable core records are retained for ten years. A product decision should isolate such records instead of retaining the whole health conversation under the longest period. [HGB, section 257](https://www.gesetze-im-internet.de/hgb/__257.html), [AO, section 147](https://www.gesetze-im-internet.de/ao_1977/__147.html)

### Account deletion

An account-delete action must trigger a record-by-record decision:

- End sign-in sessions and remove the external authentication identity.
- Delete profile attributes that have no remaining purpose.
- Anonymise or pseudonymise retained records where the person's direct identity is no longer needed.
- Restrict retained treatment, tax, moderation, or legal-claim records to the relevant staff and purpose.
- Keep enough mapping only where a legal duty, rights request, or legal claim requires it.
- Tell the patient what was deleted, what remains, why it remains, who controls it, and when it will expire.

These steps are derived from purpose limitation, data minimisation, storage limitation, transparency, erasure, restriction, and privacy by design. The GDPR does not say that an application account and every related business record must share one deletion event. [GDPR, Articles 5, 12, 13, 17, 18, and 25](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)

### Attachments, backups, and technical deletion

- Attachments inherit the conversation's data classification and purpose, but may need a shorter period if the clinic has copied the necessary document into its treatment system. Duplicate storage needs its own necessity test. [GDPR, Articles 5 and 9](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Security must reflect the sensitivity and risk. The GDPR names measures such as pseudonymisation, encryption, confidentiality, availability, recovery, and regular testing. Access to message content, attachment bytes, backups, and audit logs must follow the same risk model. [GDPR, Articles 25 and 32](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- A deletion workflow must cover the database record, object bytes, thumbnails or previews, malware-scan or conversion copies, caches, exports, support copies, and backups. The BfDI notes that deletion and destruction are processing operations subject to Article 32. Its backup guidance also calls out access control and logging gaps that can occur in backup systems. [BfDI on data-carrier destruction](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Datenschutzgerechte-Datentr%C3%A4gervernichtung.html), [BfDI on encryption and backups](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Kurzposition_Verschl%C3%BCsselung_und_Backups.html)
- The law does not require an operational backup to support selective immediate mutation in every design. It does require a defensible process. Expired data should not return to active service after restore. Backup expiry, restore filtering, and deletion verification therefore need documented rules.

### Soft delete and audit history

- Soft delete is useful for undo, review, or a legal hold, but it remains storage and remains subject to the GDPR. It needs a defined reason, restricted access, expiry, and final-delete path. [GDPR, Articles 4, 5, 17, and 18](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- Audit events that contain patient, staff, clinic, inquiry, or message identifiers are personal data. Audit retention must be purpose-bound. A security or accountability need does not justify keeping raw message text in the audit event. [GDPR, Articles 5, 25, 30, and 32](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- If a message is part of the treatment record, section 630f BGB requires traceable corrections that preserve the original. For ordinary platform messages outside that record, there is no source-backed general rule in this research requiring immutable full content forever. [BGB, section 630f](https://www.gesetze-im-internet.de/bgb/__630f.html)

### Confidentiality and moderation

- Doctors and other listed professionals are subject to criminal-law confidentiality. They may involve service providers only as necessary for their work, and must ensure that participating persons are bound to confidentiality. This affects processor contracts, staff access, support access, incident response, and moderator access. [StGB, section 203](https://www.gesetze-im-internet.de/stgb/__203.html)
- German telecommunications law may impose a stricter rule. An interpersonal telecommunications service enables direct interactive exchange between a finite set of persons chosen by participants. An inseparable subordinate communication feature can fall outside that category. The Federal Network Agency now provides specific NI-ICS classification guidance and assesses services case by case. [TKG, section 3 numbers 24 and 40](https://www.gesetze-im-internet.de/tkg_2021/__3.html), [Federal Network Agency NI-ICS guidance](https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/Onlinekommunikationsdienste/NIICS/artikel.html)
- If the feature qualifies as a telecommunications service, section 3 TDDDG protects both content and communication metadata. Providers and participating persons may not obtain knowledge beyond what service delivery and technical protection require, unless a law specifically permits another purpose. This could rule out routine platform reading or broad proactive moderation. [TDDDG, section 3](https://www.gesetze-im-internet.de/ttdsg/BJNR198210021.html)
- The DSA does not impose a general monitoring duty. If findmydoc qualifies as a hosting provider, it must support sufficiently specific illegal-content notices and give affected users reasons for content restrictions. Terms must explain moderation policies and tools, including algorithmic or human review, and enforcement must be diligent, objective, and proportionate. Whether the inquiry chat is a hosting service requires legal confirmation. [DSA, Articles 3, 8, 14, 16, and 17](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R2065)

The practical result is narrow, report-driven moderation with purpose-bound access. Automated scanning, routine support access, crisis escalation, fraud controls, and illegal-content handling each need a named legal basis and an access path. They should not be bundled under a generic "platform moderation" permission.

### Data protection impact assessment

Large-scale processing of special-category data requires a data protection impact assessment. Even below that explicit threshold, Article 35 requires one when the planned processing is likely to create high risk. Scale, health-data sensitivity, private communications, staff access, attachment storage, and any automated moderation must be assessed before launch. [GDPR, Article 35](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)

## Official operational guidance, not statutory law

BSI IT-Grundschutz CON.6 says an organisation should define deletion rules before production, cover both minimum retention and maximum storage periods, include backups where necessary, and make external deletion traceable. It is a useful implementation baseline, but it does not choose findmydoc's legal retention periods. [BSI IT-Grundschutz CON.6, edition 2023](https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium_Einzel_PDFs_2023/03_CON_Konzepte_und_Vorgehensweisen/CON_6_Loeschen_und_Vernichten_Edition_2023.pdf?__blob=publicationFile&v=3)

## Existing findmydoc rules and current implementation

The repository evidence below was inspected on 2026-08-19. It describes the current code and approved internal plans. It is not a legal conclusion.

### Website repository

- `patientClinicInquiries` is a single contact-request record, not a conversation. It stores clinic, contact details, treatment or doctor context, free-text message, consent evidence, status, assignment, and timestamps. Consent evidence is frozen after creation. Platform staff can delete; current code lets platform staff and assigned-clinic staff read and update within scope. Patients have no collection read path. The collection has no `trash: true` configuration and no retention or expiry field. [Inquiry collection](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/src/collections/PatientClinicInquiries.ts#L58-L90), [access and fields](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/src/collections/PatientClinicInquiries.ts#L123-L313), [scope filter](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/src/access/scopeFilters.ts#L19-L43)
- The patient collection currently has platform-only delete access. Its delete hooks anonymise the public review-author projection and delete the linked Supabase authentication user before deleting the Payload patient. There is no conversation-specific account-deletion orchestration because conversation collections do not exist. [Patient collection](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/src/collections/Patients/index.ts#L10-L48), [review-author hook](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/src/collections/Patients/hooks/anonymizePatientReviewAuthors.ts#L1-L39), [Supabase deletion hook](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/src/collections/Patients/hooks/patientSupabaseDelete.ts#L1-L26)
- Website engineering defaults prefer Payload-native soft delete for core collections. The soft-delete document lists clinics, doctors, treatments, medical specialties, reviews, media, posts, pages, and tags. It does not list patients or inquiries. This is a preservation and safety convention, not a hard-delete or legal-retention policy. [Website engineering defaults](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/src/AGENTS.md#L24-L39), [soft-delete document](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/soft-delete-implementation.md#L1-L21)
- Upload bytes use S3-compatible object storage while Payload stores file metadata. Current media policy separates files by owner and usually enables soft delete. The active online setup is documented with a 1 MB object limit. A future 5 MB private conversation attachment therefore needs both a separate private collection and an online-storage decision. Existing public or clinic-profile media must not be reused. [Storage backend and ownership](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/integrations/storage.md#L1-L34), [online object limit](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/integrations/storage.md#L86-L94), [media soft-delete and audit metadata](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/integrations/storage.md#L147-L169)
- Repository privacy rules forbid patient identity, raw inquiry messages, medical details, raw request bodies, and private route data in logs or external artifacts. PostHog business events must not contain medical free text, contact data, names, raw messages, or auth tokens. [Monitoring privacy boundary](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/monitoring-and-error-logic.md#L72-L82), [PostHog privacy rules](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/integrations/posthog.md#L77-L82)
- The capability matrix already says conversations, messages, private attachments, read state, and internal notes need new private-live contracts. It forbids reusing current public media, direct clinic reads of the patient profile, and repurposing internal notes as a medical record. [Message and patient-profile gaps](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/roadmap/clinic-dashboard/capability-matrix.md#L194-L221), [private-live classification](https://github.com/findmydoc-platform/website/blob/8f079146938fdfe242b021db93eb80e6ee9a556f/docs/roadmap/clinic-dashboard/capability-matrix.md#L292-L316)

There is one repository inconsistency to resolve. The capability matrix says inquiry collection access is platform-only, while current collection code grants scoped read and update access to assigned-clinic staff. Current code is the runtime fact; the document is stale on this point. That mismatch should be corrected in the implementation ticket, not hidden in the retention decision.

### Clinic Dashboard repository

- The current Dashboard messages experience is synthetic and transient. It keeps message and inquiry changes in React state, discards them on reload or location change, reads no attachment bytes, and has no durable message or file storage. [Approved demo plan](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/docs/plans/clinic-dashboard-demo-experience-and-transient-flows.md#L1-L33)
- The demo accepts one PNG, JPEG, WebP, or PDF attachment up to 5 MB and then only adds a local message while stating that nothing was sent. This is a UI constraint, not a production storage or retention rule. [Demo attachment plan](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/docs/plans/clinic-dashboard-demo-experience-and-transient-flows.md#L65-L71), [message model](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/messages/model/messages.ts#L1-L4)

## Decisions required before implementation

These are product and legal decisions. The sources narrow the choices but do not answer them for findmydoc.

| Decision                                  | What must be fixed                                                                                                                                                        | Why it cannot stay implicit                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Roles by purpose                          | For message delivery, clinic treatment use, support, security, moderation, and legal requests, name the controller, joint controllers, and processors.                    | Legal basis, notices, access, deletion, and incident ownership depend on this map.               |
| Communications classification             | Decide with counsel whether the feature is a TKG NI-ICS, an inseparable subordinate feature, a DSA hosting service, or more than one of these.                            | This changes whether platform staff may read content and which moderation duties apply.          |
| Record classes                            | Separate inquiry, conversation, external message, internal note, attachment, consent evidence, treatment-record export, moderation case, audit event, and legal hold.     | One thread-level expiry cannot implement different duties.                                       |
| Retention schedule                        | Set a start event, period, legal basis, controller, access rule, delete action, and exception for every class.                                                            | Neither the GDPR nor current repositories supply a default period.                               |
| Inquiry-to-treatment handover             | Decide what the clinic copies into its treatment record, who owns that copy, and whether the platform copy then expires sooner.                                           | Section 630f BGB applies to the treatment record, not automatically to every platform duplicate. |
| Account deletion                          | Define authentication shutdown, profile deletion, direct-identifier removal, conversation tombstones, retained records, user notice, and completion status.               | Current patient deletion has no conversation dependencies.                                       |
| Patient and staff identity after deletion | Decide whether retained messages show a stable pseudonymous actor, a generic deleted-account label, or an identity kept under restriction.                                | Referential integrity alone is not a legal basis to keep profile data.                           |
| Attachment lifecycle                      | Define private bucket or namespace, upload validation, malware handling, preview copies, object versioning, CDN behavior, backup expiry, legal holds, and verified purge. | Metadata deletion alone does not remove the bytes or derivatives.                                |
| Soft-delete stages                        | Decide whether soft delete is used for undo, moderation, legal hold, or all three. Give each state a deadline and restricted role set.                                    | A permanent trash record is still retained personal data.                                        |
| Message editing and redaction             | Decide whether users may edit, withdraw, or delete sent content and what recipients see. Keep treatment-record correction rules separate from ordinary messaging.         | Section 630f traceability applies only when content is part of the treatment record.             |
| Moderation intake                         | Define report reasons, emergency and illegal-content routing, platform access, patient and clinic notice, appeals, and evidence retention.                                | Generic moderator access may conflict with confidentiality and telecommunications secrecy.       |
| Audit schema and expiry                   | Store actor, action, object, time, reason code, and outcome only where needed. Decide when identity or object references are pseudonymised or deleted.                    | Raw content in audit history increases risk without proving accountability better.               |
| Data-subject workflow                     | Provide access and export, erasure, restriction, correction, recipient notification, identity verification, deadlines, and decision evidence.                             | Account settings alone do not satisfy Articles 12 to 19.                                         |
| DPIA and notices                          | Complete the DPIA threshold assessment, privacy notice, processor terms, confidentiality commitments, and processing records before launch.                               | Health data and private communications create high impact even before scale is known.            |

## Recommended decision shape

The next contract should use a retention matrix rather than one global number. Each row should contain:

```text
record class
controller and processor roles
purpose
Article 6 basis
Article 9 exception where needed
retention start event
default retention period
statutory or legal-claim exception
ordinary access roles
restricted-hold access roles
soft-delete duration if any
hard-delete targets
backup expiry and restore behavior
patient-facing notice
deletion verification evidence
```

The safest product default is short platform retention unless a named purpose requires longer storage. Treatment documentation should move into the clinic-controlled treatment record instead of turning the whole findmydoc conversation into a ten-year archive. This is a recommendation for the next legal and product decision, not a source-backed retention period.

## Source register

All external sources were accessed on 2026-08-19.

- [Regulation EU 2016/679, GDPR](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679), official EUR-Lex text.
- [BGB section 630f, treatment documentation](https://www.gesetze-im-internet.de/bgb/__630f.html), official federal law portal.
- [BGB section 630g, access to treatment records](https://www.gesetze-im-internet.de/bgb/__630g.html), official federal law portal.
- [StGB section 203, professional confidentiality](https://www.gesetze-im-internet.de/stgb/__203.html), official federal law portal.
- [HGB section 257, commercial-record retention](https://www.gesetze-im-internet.de/hgb/__257.html), official federal law portal.
- [AO section 147, tax-record retention](https://www.gesetze-im-internet.de/ao_1977/__147.html), official federal law portal.
- [TKG section 3, telecommunications definitions](https://www.gesetze-im-internet.de/tkg_2021/__3.html), official federal law portal.
- [TDDDG, including section 3 telecommunications secrecy](https://www.gesetze-im-internet.de/ttdsg/BJNR198210021.html), official federal law portal.
- [Regulation EU 2022/2065, Digital Services Act](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R2065), official EUR-Lex text.
- [Federal Network Agency guidance on NI-ICS classification](https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/Onlinekommunikationsdienste/NIICS/artikel.html), official regulator guidance.
- [BfDI on the right to erasure](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Allgemein/Betroffenenrechte/Betroffenenrechte_L%C3%B6schung_Vergessenwerden.html), official regulator guidance.
- [BfDI on data-carrier destruction](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Datenschutzgerechte-Datentr%C3%A4gervernichtung.html), official regulator guidance.
- [BfDI on encryption and backups](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Kurzposition_Verschl%C3%BCsselung_und_Backups.html), official regulator guidance.
- [BSI IT-Grundschutz CON.6, edition 2023](https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium_Einzel_PDFs_2023/03_CON_Konzepte_und_Vorgehensweisen/CON_6_Loeschen_und_Vernichten_Edition_2023.pdf?__blob=publicationFile&v=3), official non-binding technical guidance.

Repository sources were inspected on 2026-08-19 at Website commit `8f079146938fdfe242b021db93eb80e6ee9a556f` and Clinic Dashboard commit `5ff3602ed01b48264324c6c1333b7c8f31858d54`. The permalinks in the repository section point to those exact revisions.
