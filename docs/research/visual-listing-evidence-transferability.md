# Visual listing evidence and transferability

Research completed: 2026-08-24.

## Research question

Does evidence from accommodation and residential-property marketplaces support these claims?

1. The lead image matters most.
2. Image order after the lead image affects demand.
3. Roughly the first five images matter, with little value after that point.
4. More or better images increase clicks, trust, or bookings.

## Bottom line

| Claim                                         | Verdict                                              | What the evidence supports                                                                                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The lead image matters most                   | Supported for accommodation and real-estate listings | Airbnb demand models assign much larger coefficients to a cover image than to a non-cover image. Hotel click data also show that the content of the search-result image predicts click-through rate.                                                       |
| Order after the lead image matters            | Partly supported                                     | An Airbnb structural model finds that an optimized full layout should increase demand. It does not publish a clean causal effect for each position after the cover.                                                                                        |
| The first five images form a proven threshold | Not supported                                        | No located primary study isolates positions 2 through 5 and shows a material drop after image 5. The closest studies use three versus six images, a six-image gallery, a nine-image summary, or a full-layout model. None establishes a five-image cutoff. |
| Better image quality helps                    | Supported directionally                              | Airbnb reports a 19% booking uplift after professional photography in a large first-party comparison. Structural Airbnb research also links photo quality and layout to demand. Neither result is a randomized quality-only experiment.                    |
| More images are always better                 | Contradicted                                         | A field study and experiments in residential real estate found no benefit from adding neutral or positive images to an already positive three-image set. Extra negative information reduced click intention.                                               |

The defensible product rule is therefore a strong, representative lead image plus a small, diverse set that covers decision-relevant spaces. The evidence does not justify a claim that five images are optimal or that images after the fifth are unimportant.

## Strongest evidence

### Airbnb cover image and full layout

Li, Simchi-Levi, Wu, and Zhu studied 10,280 Airbnb listings in New York City using listing photos and booking-sequence data. Their pairwise comparison model controls for censored demand and changing consideration sets. Computer-vision models classify room type and image quality.

The published conclusion is that the cover image has a significantly larger impact on demand than non-cover images. In the robustness model from the online companion, comparable cover coefficients are about 5.7 to 14.4 times the corresponding non-cover coefficients:

| Image type  | Cover coefficient | Non-cover coefficient | Cover to non-cover ratio |
| ----------- | ----------------: | --------------------: | -----------------------: |
| Bedroom     |             0.130 |                 0.023 |                     5.7x |
| Living room |             0.103 |                 0.015 |                     6.9x |
| Outside     |             0.130 |                 0.009 |                    14.4x |
| Kitchen     |             0.121 |                 0.021 |                     5.8x |

All listed coefficients have `p < 0.01`. The model's counterfactual predicts 11.0% more bookings if one listing adopts its optimized photo layout. If all competing listings adopt optimized layouts, the predicted gain is two to five booked days and $500 to $1,100 per year, depending on neighborhood and market size.

This is the best evidence for a large cover effect and for order mattering somewhere beyond the cover. It is still structural estimation on observational marketplace data, not a randomized reordering experiment. The 11.0% result is a modelled counterfactual for the whole layout. It cannot be assigned to the first image alone or to the first five images.

Source record: Hanwei Li, David Simchi-Levi, Michelle Xiao Wu, and Weiming Zhu, "Estimating and Exploiting the Impact of Photo Layout: A Structural Approach," _Management Science_ 69(9), 2023. Published online 2022-12-21. [DOI](https://doi.org/10.1287/mnsc.2022.4616) and [published online companion](https://pubsonline.informs.org/doi/suppl/10.1287/mnsc.2022.4616/suppl_file/mnsc.2022.4616.sm1.pdf).

### Airbnb professional photography

Airbnb reports a first-party comparison of more than 14,700 global listings over one year from 2024 to 2025. Listings that used Airbnb Professional Photography had 19% more net bookings and 21% more host earnings over the next 365 days than listings that did not.

The sample and outcome are commercially relevant, but Airbnb does not publish random assignment, matching variables, confidence intervals, or the full analysis. Eligible hosts who accept professional photography may differ from controls. The intervention may also change composition, coverage, editing, and order together. Treat the 19% figure as an association reported by the platform, not a guaranteed causal effect of image sharpness.

Source record: Airbnb, "Airbnb Professional Photography," first-party help article reporting the 2024 to 2025 analysis. [Direct URL](https://www.airbnb.com/help/article/3381).

### Hotel search-result image and click-through rate

Overgoor, Rand, and van Dolen analysed every hotel search from an unnamed large global online travel agency for Boston, Miami, New York, San Francisco, and Seattle in July 2019. The dataset contains 3.4 million queries, actual clicks, gallery activity, dwell behaviour, and bookings. About 35% of visitors performed an image-related action. Only 0.7% of visits resulted in a booking.

The search-result thumbnail, called the champion image, is also the first image on the hotel page. A model using only extracted image features achieved an out-of-sample Spearman rank correlation of 0.565 with hotel click-through rate. Hotel exteriors, facades, and rooms were generally positive signals, but the best content differed by city. The authors did not randomly swap champion images, so the study shows predictive association rather than a causal lift.

This supports giving the lead image special attention. It also warns against one universal subject rule. What works as a lead image depends on the listing and user context.

Source record: Gijs Overgoor, William Rand, and Willemijn van Dolen, "The Champion of Images: Understanding the Role of Images in the Decision-Making Process of Online Hotel Bookings," _Proceedings of the 53rd Hawaii International Conference on System Sciences_, 2020. [DOI](https://doi.org/10.24251/HICSS.2020.498).

### Real-estate eye tracking

Seiler, Madhavan, and Liechty tracked 20 active or recent homebuyers and 25 students. Each participant viewed ten homes with six photos, producing 450 home tours and 2,700 photo observations. The first page showed one large exterior image and five thumbnails. The five non-cover images were randomly ordered.

Participants looked at the large photo before the property description or agent remarks in 95.1% of tours. Mean dwell time on the always-first exterior image was 20.052 seconds. Mean dwell time for each later room image ranged from 7.817 to 8.228 seconds.

The result is useful attention evidence but not a clean position effect. Exterior content, larger display size, and first position are confounded. The study measures attention and valuation, not click-through or completed sales. It cannot prove that the five thumbnails matter equally or that a seventh image would add little value.

Source record: Michael J. Seiler, Poornima Madhavan, and Molly Liechty, "Toward an Understanding of Real Estate Homebuyer Internet Search Behavior: An Application of Ocular Tracking Technology," _Journal of Real Estate Research_ 34(2), 2012. [DOI](https://doi.org/10.1080/10835547.2012.12091333).

## Null and contrary evidence on image count

Larceneux, Bezançon, and Lefebvre first studied 3,658 apartment advertisements in Paris. More photos had no favourable effect on click rate or time to sale for higher-range properties. For lower-range properties, more photos reduced favourable responses.

They then ran controlled experiments with 124 master's students in Paris. Participants saw an initial set of three positive images and one of three additions:

- three images with no new information;
- three additional positive images;
- three additional negative images.

Adding neutral images did not change click intention. Adding positive images also had no significant effect on click intention. Adding negative images reduced click intention, with a reported total path coefficient of `c = -1.969`, `p < 0.001`. The student sample and simulated apartment search limit external validity, but the design directly contradicts a simple "more is better" rule. Three positive images were enough to form a favourable representation in these experiments.

Source record: Fabrice Larceneux, Marjolaine Bezançon, and Thomas Lefebvre, "'Asymmetric Revelation' Effect: The Influence of an Increased Number of Photos on Mental Imagery and Behavioural Responses Depending on Target Market," _Recherche et Applications en Marketing_ 33(3), 2018. Published online 2018-07-26. [DOI](https://doi.org/10.1177/2051570718785976).

## What Booking.com evidence does and does not show

A Booking.com research team built personalized summaries for galleries of more than 50 images. The offline dataset contains more than 6,000 real properties. The evaluation used a fixed summary of nine images, matching the platform setting at the time. An internal perceptual test used 210 property examples split across five participants. Participants preferred the personalized summary in 66% of comparisons versus 34% for the baseline.

This first-party work shows that relevance and diversity matter when reducing a large gallery. It does not report a production click-through or booking lift. The paper says the model was still awaiting A/B testing. Nine was a product constraint, not an experimentally discovered optimum.

Source record: Monika Wysoczanska, Moran Beladev, Karen Lastmann Assaraf, Fengjun Wang, Ofri Kleinfeld, Gil Amsalem, and Hadas Harush Boker, "Tell Me What Is Good About This Property: Leveraging Reviews for Segment-Personalized Image Collection Summarization," Booking.com, 2023-10-30. [Paper](https://arxiv.org/abs/2310.19743).

## Assessment of the five-image hypothesis

The specific claim remains unproven.

- The Airbnb structural study separates cover from non-cover images and optimizes the whole layout. It does not publish a response curve by position.
- The real-estate eye-tracking study displays one cover plus five thumbnails, but has no images after the sixth for comparison.
- The three-versus-six experiments test count and information content, not positions 2 through 5 versus later positions.
- Booking.com uses nine-image summaries and has not published a booking experiment that identifies nine, five, or another count as optimal.

No primary result located in this review shows that images 2 through 5 retain substantial marginal value while image 6 or later loses it. The likely source of the belief is interface exposure, where a cover and a handful of thumbnails appear before a user opens the full gallery. That is a plausible design hypothesis. It is not an empirical threshold.

## Transferability to clinic profiles

Accommodation and residential-property listings share three traits with clinic profiles: the service is hard to inspect before contact, images reduce uncertainty, and the lead image can appear in a compact search card. The evidence can support restrained clinic-facing copy such as:

> Clear, representative photos help patients understand what to expect before they contact your clinic.

It does not support copying marketplace effect sizes into clinic copy. A clinic choice involves medical trust, accessibility, staff, treatment fit, privacy, and perceived safety. Those factors differ from choosing a stay or buying a home.

For a clinic-profile completion rule, the evidence supports:

- requiring exactly one representative lead image;
- asking for several distinct, accurate images rather than duplicates;
- explaining that the images help patients assess the environment and set expectations;
- avoiding a claim that five is an evidence-based optimum;
- avoiding promises of more or better-qualified inquiries until findmydoc measures that outcome directly.

If the product wants a stronger numerical rule, it should run a findmydoc experiment. Candidate outcomes are profile-card click-through, gallery opens, contact starts, completed inquiries, and patient-reported confidence. A randomized lead-image or gallery-order test would answer the transfer question much more cleanly than another cross-market analogy.
