/**
 * Visual demo of the decision engine (no model, no key needed). Runs a few
 * labels through verify() and prints what a reviewer would see: overall
 * verdict, then each check with its reason and citation.
 *
 *   npm run demo
 */
import { verify, type ApplicationData } from '../src/lib/verify/verify';
import type { Extraction } from '../src/lib/extraction/schema';
import { REQUIRED_WARNING_TEXT } from '../src/lib/extraction/prompt';

const ICON: Record<string, string> = { PASS: '✓', FLAG: '⚑', FAIL: '✗' };

function base(over: Partial<Extraction> = {}): Extraction {
  return {
    brand_name: "STONE'S THROW",
    class_type: 'Kentucky Straight Bourbon Whiskey',
    alcohol_content: { abv_percent: 45, proof: 90 },
    government_warning: {
      present: true,
      text: REQUIRED_WARNING_TEXT,
      first_two_words_all_caps: true,
      first_two_words_bold: true,
      remainder_bold: false,
      is_continuous: true,
    },
    ...over,
  };
}

const app: ApplicationData = {
  brand_name: "Stone's Throw",
  class_type: 'Kentucky Straight Bourbon Whiskey',
  alcohol_content: '45%',
};

const scenarios: { title: string; extraction: Extraction; declared: ApplicationData }[] = [
  { title: 'Clean, compliant label', extraction: base(), declared: app },
  {
    title: 'Bourbon bottled at 38% (matches its application perfectly)',
    extraction: base({ alcohol_content: { abv_percent: 38, proof: 76 } }),
    declared: { ...app, alcohol_content: '38%' },
  },
  {
    title: 'Title-case "Government Warning" + fully-bolded warning',
    extraction: base({
      government_warning: {
        ...base().government_warning,
        first_two_words_all_caps: false,
        remainder_bold: true,
      },
    }),
    declared: app,
  },
];

for (const s of scenarios) {
  const r = verify(s.extraction, s.declared);
  console.log('\n' + '═'.repeat(78));
  console.log(`LABEL: ${s.title}`);
  console.log(`OVERALL: ${ICON[r.overall]} ${r.overall}`);
  console.log('─'.repeat(78));
  for (const v of r.verdicts) {
    console.log(`${ICON[v.verdict]} ${v.verdict.padEnd(4)}  ${v.label}`);
    console.log(`        ${v.reason}`);
    if (v.citation) console.log(`        → ${v.citation.section}`);
  }
}
console.log('');
