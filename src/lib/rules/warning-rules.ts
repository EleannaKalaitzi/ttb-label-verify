import type { Citation } from '../verdict/types';

/**
 * Warning rules as DATA, not hardcoded conditions. Each carries its citation,
 * the authority link, the date it was verified against the eCFR, and a
 * plain-language statement the UI renders next to the verdict.
 *
 * No live regulatory fetching at request time: the agency firewall blocks
 * outbound ML/endpoint traffic, the latency budget forbids it, and these rules
 * change on a timescale of decades (§ 16.21 stable since 1988). Rules are
 * versioned data pinned to a verification date; a staleness check against the
 * eCFR API is designed as an out-of-band job, never a request-path dependency.
 */

/** The date these rules were last checked against the current CFR text.
 *  § 16.21 wording and § 16.22 formatting rules verified verbatim (Cornell LII
 *  / eCFR) on this date. */
export const VERIFIED_AGAINST = '2026-07-16';

const SECTION_16_21 = 'https://www.ecfr.gov/current/title-27/section-16.21';
const SECTION_16_22 = 'https://www.ecfr.gov/current/title-27/section-16.22';

export const WARNING_TEXT_VERBATIM: Citation = {
  section: '27 CFR § 16.21',
  authority: SECTION_16_21,
  plainLanguage:
    'The health warning must use the exact statutory wording, continuous and ' +
    'unbroken, separate and apart from all other information.',
};

export const WARNING_PREFIX_CAPS_AND_BOLD: Citation = {
  section: '27 CFR § 16.22',
  authority: SECTION_16_22,
  plainLanguage:
    'The words “GOVERNMENT WARNING” must appear in capital letters and bold type.',
};

export const WARNING_REMAINDER_NOT_BOLD: Citation = {
  section: '27 CFR § 16.22',
  authority: SECTION_16_22,
  plainLanguage:
    'Only “GOVERNMENT WARNING” may be bold. The remainder of the statement may ' +
    'not appear in bold type. (Commonly misread as “all caps and bold” — a ' +
    'fully-bolded warning is non-compliant.)',
};
