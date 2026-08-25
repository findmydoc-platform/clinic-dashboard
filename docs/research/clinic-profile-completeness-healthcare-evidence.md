# Healthcare evidence for clinic profile completeness

Research date: 2026-08-24  
Scope: the six clinic-controlled categories proposed for Clinic Dashboard issue #104

## Bottom line

The evidence supports short, factual explanations of why each category helps a patient. It does not support a blanket claim that a complete clinic profile receives more qualified inquiries.

The strongest digital-health finding concerns images. In one US physician-platform dataset, profiles with a photo gallery had a higher adjusted rate of clicks to reveal contact information. The study was observational, and it did not report what the galleries contained. It cannot justify a causal promise or a rule about three images, a main image, the first five images, or image order.

Location, hours, languages, and treatment information matter to patients in healthcare studies. Most of that research measures stated preferences, access, communication, or clinical outcomes. It does not test whether adding the corresponding field to a clinic profile raises inquiries or appointments.

Recommended standard for the task modals:

- Explain the concrete patient decision that the information enables.
- Do not promise more inquiries, appointments, trust, or better outcomes.
- Do not present the current thresholds or equal weighting as research-derived.
- If an evidence-backed commercial claim is wanted later, measure the actual findmydoc funnel after launch.

## Evidence by category

| Category                      | Evidence status                                                                                | Defensible product explanation                                                                                           | What the evidence does not establish                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clinic name and description   | Limited direct digital-health evidence                                                         | "A clear description helps patients understand what your clinic does and whether it may fit their needs."                | No study isolated a clinic name, a nonempty description, or full profile completeness as the cause of more inquiries.                                                              |
| Full address                  | Direct healthcare evidence for choice and access, but not profile conversion                   | "A complete address helps patients judge the journey and find the clinic."                                               | No tested conversion lift from filling every address field. Distance preferences vary by patient and care context.                                                                 |
| Supported languages           | Strong healthcare evidence for communication fit and some outcomes, but not listing conversion | "Listing supported languages helps patients identify whether communication in their preferred language may be possible." | A language listing does not prove that every encounter will be language-concordant or improve outcomes.                                                                            |
| Opening hours                 | Direct preference evidence with a relevant null result                                         | "Current hours help patients see when the clinic is available and whether a visit fits their schedule."                  | No general proof that complete seven-day hours increase bookings. Weekend hours were less important in one English study, and hours did not influence choices in one Kenyan pilot. |
| Clinic images                 | Direct observational digital-health evidence                                                   | "Images give patients a first impression of the clinic and may help them decide whether to make contact."                | No healthcare evidence for a three-image minimum, exactly one main image, a first-five rule, image order, or diminishing returns after five images.                                |
| At least one active treatment | Limited direct digital-health and direct healthcare preference evidence                        | "Published treatments show patients what care the clinic offers and whether it may match their needs."                   | No study tested the binary threshold of one active treatment or showed that this threshold raises inquiries.                                                                       |

## Primary evidence

### Web profiles used in an actual primary-care choice

Fanjiang, von Glahn, Chang, Rogers, and Safran, "Providing Patients Web-based Data to Inform Physician Choice: If You Build It, Will They Come?" _Journal of General Internal Medicine_, 2007. [DOI and article](https://doi.org/10.1007/s11606-007-0278-1)

- Population and design: 2,225 adults who were seeking a new primary-care physician at two California medical groups were invited to use a site covering 14 physicians. The site displayed credentials, age, gender, ethnicity, languages, office location and hours, and patient-experience scores. Participants selected a preferred physician after viewing the site.
- Observed result: 382 people, 17% of invitees, visited the site and 306 completed the questionnaire. Patient-experience scores were cited as important by 51%, office convenience by 39%, and credentials by 38% of site users. Among users who prioritized interpersonal quality or patient recommendations, the odds of choosing a highly scored physician were 9.52 and 9.71 times the odds expected by chance.
- Relevance: this is direct evidence that people making a real physician choice use profile information, including languages, location, and hours. It supports explaining those fields as decision aids.
- Limits: uptake was low and selective. The study did not isolate the effect of languages, address, hours, name, or description. It compared 14 physicians in two medical groups and does not estimate inquiry or appointment lift from profile completeness.

### Profile breadth, expertise detail, and patient visits

Liu, Yin, and Fan, "The Relationship Between Physician Self-Disclosure and Patient Acquisition in Digital Health Markets: Cross-Sectional Study." _Journal of Medical Internet Research_, 2026. [DOI and article](https://doi.org/10.2196/84963)

- Population and design: cross-sectional analysis of 1,798 physician profiles collected from China's Haodf platform from September to December 2024. Four trained coders measured disclosure breadth and depth. Depth included the number of disease types named as areas of expertise. The outcome was cumulative consultations, calls, and bookings displayed on each profile.
- Observed result: broader disclosure was associated with more patient visits, with standardized beta 0.255, 95% CI 0.054 to 0.456, P=.01. Deeper disclosure was also associated with more visits, with beta 0.098, 95% CI 0.030 to 0.167, P=.005.
- Relevance: this supports a restrained explanation that detailed expertise or treatment information helps patients assess fit. It is the closest direct evidence for clinic description and treatment detail.
- Limits: the exposure was a composite rather than a clinic description or active-treatment flag. The outcome was cumulative, while profiles were observed at one point in time. Cross-sectional data cannot exclude reverse causality, platform effects, or residual confounding. It is not evidence for a one-treatment threshold.

### Address accuracy and realized access

Burman and Haeder, "Potemkin Protections: Assessing Provider Directory Accuracy and Timely Access for Four Specialties in California." _Journal of Health Politics, Policy and Law_, 2022. [DOI and article](https://doi.org/10.1215/03616878-9626866)

- Population and design: analysis of large random surveys collected by the California Department of Managed Health Care in 2018 and 2019. The surveys covered primary care, cardiology, endocrinology, and gastroenterology listings in managed-care directories.
- Observed result: callers could verify 59% to 76% of directory listings. Across specialties, they could schedule urgent appointments through 28% to 54% of all listings, compared with 44% to 72% of accurately listed providers. For general appointments, the corresponding ranges were 35% to 64% of all listings and 51% to 87% of accurately listed providers.
- Relevance: correct provider location and contact information are part of usable access, not decorative profile detail.
- Limits: this study tested directory accuracy and appointment availability. It did not test a complete-address indicator, patient choice between profiles, or conversion from a public clinic page.

### Location and opening-hours preferences

Lagarde, Erens, and Mays, "Determinants of the Choice of GP Practice Registration in England: Evidence from a Discrete Choice Experiment." _Health Policy_, 2015. [DOI and article](https://doi.org/10.1016/j.healthpol.2014.10.008)

- Population and design: discrete-choice experiment with 1,706 respondents in England comparing neighborhood and non-neighborhood GP practices.
- Observed result: respondents cared most about obtaining an appointment quickly. Extended Monday-to-Friday opening was preferred more than weekend opening. Older people, carers, and other less-mobile respondents were less willing to register outside their neighborhood.
- Relevance: location and weekday availability can materially affect practice choice, and the effect differs across patient groups.
- Limits: choices were hypothetical and concerned English GP registration. The study did not test whether publishing hours or an address changes behavior. It also argues against treating every type of extended opening as equally valuable.

### Language concordance and glycemic control

Parker, Fernandez, Moffet, Grant, Torreblanca, and Karter, "Association of Patient-Physician Language Concordance and Glycemic Control for Limited-English Proficiency Latinos With Type 2 Diabetes." _JAMA Internal Medicine_, 2017. [DOI and article](https://doi.org/10.1001/jamainternmed.2016.8648)

- Population and design: pre-post comparative study of 1,605 Latino adults with limited English proficiency and type 2 diabetes in an integrated US health system. All participants switched primary-care physicians. The analysis compared changes after switches between language-concordant and language-discordant physicians.
- Observed result: patients who moved from an English-only physician to a Spanish-speaking physician had a 10 percentage-point greater increase in the prevalence of glycemic control than patients who moved from one English-only physician to another. Systolic blood-pressure control did not improve. LDL control unexpectedly improved among patients who switched in the opposite direction.
- Relevance: matching patients to a language they can use may matter clinically. Listing supported languages can help patients identify a possible match.
- Limits: the study did not test online language listings, patient acquisition, or all clinical settings. It cannot support a blanket outcome promise.

### Language concordance with a null outcome

Altman, Sun, Lin, Baecker, Samuels-Kalow, Park, Shen, Wu, and Sharp, "Impact of Physician-Patient Language Concordance on Patient Outcomes and Adherence to Clinical Chest Pain Recommendations." _Academic Emergency Medicine_, 2020. [DOI and article](https://doi.org/10.1111/acem.13940)

- Population and design: retrospective observational study of 52,014 adult chest-pain encounters across 15 US community emergency departments. Of these, 6,452 encounters were language-discordant.
- Observed result: adverse outcomes occurred in 1.7% of both groups. Adjusted language discordance was not associated with 30-day myocardial infarction or mortality, OR 0.96, 95% CI 0.60 to 1.50, or recommended care among low-risk patients, OR 1.02, 95% CI 0.87 to 1.20.
- Relevance: this is an important null result. Language concordance is not a reliable promise of better outcomes in every setting.
- Limits: emergency chest-pain care, interpretation services, and decision support differ sharply from elective clinic selection and ongoing care.

### Photo galleries and contact clicks

Kranzbuhler, Kleijnen, Verlegh, and Teerling, "When Similarity Beats Expertise: Differential Effects of Patient and Expert Ratings on Physician Choice: Field and Experimental Study." _Journal of Medical Internet Research_, 2019. [DOI and article](https://doi.org/10.2196/12454)

- Population and design: the field component used three months of clickstream data for 5,299 US doctors on a healthcare rating platform. It covered 21,897 profile clicks and 1,842 clicks to reveal a doctor's phone number. Negative-binomial models adjusted for ratings, review volume, specialty, practice count, profile image, online booking, premium profile, and other available signals.
- Observed result: the presence of a photo gallery was associated with more contact-information clicks, coefficient 0.64, SE 0.15, P<.01. Because the model used a log link, this corresponds to an estimated incidence-rate ratio of about 1.90, calculated as exp(0.64). A profile image by itself did not show a clear contact-click association in the same model, coefficient -0.07, SE 0.10.
- Relevance: this is the closest direct healthcare evidence that a gallery can support a contact action.
- Limits: gallery presence was not randomized. The paper treated the gallery as a control variable and did not describe its content, image count, quality, order, or main image. The contact click was a proxy, not a completed inquiry or appointment. The association must not be presented as causal or as a 90% promised increase.

### Treatment and service availability

Albada and Triemstra, "Patients' Priorities for Ambulatory Hospital Care Centres: A Survey and Discrete Choice Experiment Among Elderly and Chronically Ill Patients of a Dutch Hospital." _Health Expectations_, 2009. [DOI and article](https://doi.org/10.1111/j.1369-7625.2009.00533.x)

- Population and design: questionnaire survey of 1,477 older and chronically ill people, with a 72% response rate, plus a discrete-choice experiment with 75 patients in the Netherlands.
- Observed result: respondents gave the highest priority to examination and medical-consultation facilities at local ambulatory centers. About half also valued paramedical care, information desks, and pharmacies. Familiar clinicians, short waits, and consecutive appointments outweighed proximity when respondents chose between a center and the regional hospital.
- Relevance: patients need to know that the relevant consultation, examination, or service exists before a facility can be a meaningful option.
- Limits: this study addressed the services actually available, not whether a website listed them. It does not test a one-treatment profile threshold.

## Null and cautionary evidence

Kazungu, Barasa, Nonvignon, and Quaife, "Examining National Health Insurance Fund Members' Preferences and Trade-offs for the Attributes of Contracted Outpatient Facilities in Kenya: A Discrete Choice Experiment." _PLOS Global Public Health_, 2025. [DOI and article](https://doi.org/10.1371/journal.pgph.0003557)

- Opening hours ranked last in focus groups and did not influence choices in a 38-person pilot, so the researchers dropped the attribute before the main experiment.
- The main experiment included 402 insured adults across six Kenyan counties. It found strong preferences for drug availability, respectful staff, clinicians, cleanliness, shorter waits, and shorter distance.
- This does not prove that hours are unimportant elsewhere. It does show that hours are context-dependent and should not carry a universal performance promise.

Martino, Kanouse, Elliott, Teleki, and Hays, "A Field Experiment on the Impact of Physician-Level Performance Data on Consumers' Choice of Physician." _Medical Care_, 2012. [DOI and article](https://doi.org/10.1097/MLR.0b013e31826b1049)

- A randomized encouragement design included 1,347 new US health-plan members who had to choose a primary-care physician.
- Encouragement increased use of an online performance report from 22% to 28%. The researchers found no evidence that exposure caused participants to choose physicians with better overall clinical-quality scores. They noted that extensive missing profile data may have limited the report's influence.
- More profile information does not automatically change choices, and missing data can weaken a decision tool. This finding is about performance reports, not the six #104 fields.

## Unsupported thresholds and claims

This search found no primary healthcare study that supports any of the following:

- a causal statement that complete clinic profiles receive more qualified inquiries;
- six equally weighted categories;
- a nonempty clinic name or description as an empirically validated completion threshold;
- a complete seven-day opening-hours structure as the point at which patient choice improves;
- at least one active treatment as a validated threshold;
- a minimum of three clinic images;
- exactly one main image;
- the first image being most important, the first five carrying most of the effect, or a sharp decline after five images;
- a specific percentage increase in trust, inquiries, appointments, or treatment acceptance from completing these fields.

Evidence from accommodation marketplaces may help form a testable image-order hypothesis, but it remains an analogy. Healthcare decisions involve clinical fit, referral rules, insurance, risk, language, travel, waiting time, and trust. A threshold from Airbnb or Booking.com should not be labeled as clinic evidence without findmydoc data.

## Suggested claim level for issue #104

Use neutral modal copy now. For example:

- Description: "A clear description helps patients understand what your clinic does and whether it may fit their needs."
- Address: "A complete address helps patients judge the journey and find the clinic."
- Languages: "Listing supported languages helps patients identify whether communication in their preferred language may be possible."
- Hours: "Current hours help patients see when the clinic is available and whether a visit fits their schedule."
- Images: "Images give patients a first impression of the clinic and may help them decide whether to make contact."
- Treatments: "Published treatments show patients what care the clinic offers and whether it may match their needs."

Treat the completeness rules as product rules, not research findings. If findmydoc later records profile publication state, category completion, profile impressions, task-modal opens, editor visits, inquiries, and appointments, the team can estimate category-specific effects and replace cautious wording with its own evidence.

## Search notes

The search prioritized original peer-reviewed studies and publisher or PubMed records. Systematic reviews were used only to locate primary studies and check for mixed or null findings. This research lane did not treat hospitality-marketplace evidence as healthcare evidence.
