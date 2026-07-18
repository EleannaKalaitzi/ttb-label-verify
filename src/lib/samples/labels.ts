import type { Extraction } from '../extraction/schema';
import { REQUIRED_WARNING_TEXT } from '../extraction/prompt';

/**
 * Real label photos used as the "sample batch" (files in public/samples/).
 *
 * In the LIVE deployment each is read by the model for real. For the no-key MOCK
 * mode, `extraction` here is the honest read of THAT crop — including nulls where
 * a field simply isn't on the visible (usually back-label) crop, so the tool
 * flags "couldn't read", exactly as it would live. Most are compliant approved
 * labels (PASS); a couple are back-only crops missing the class/type or ABV, so
 * they honestly FLAG for review.
 */

const OK_WARNING = {
  present: true,
  text: REQUIRED_WARNING_TEXT,
  first_two_words_all_caps: true,
  first_two_words_bold: true,
  remainder_bold: false,
  is_continuous: true,
} as const;

export interface SampleLabel {
  filename: string;
  name: string;
  extraction: Extraction;
}

export const SAMPLE_LABELS: SampleLabel[] = [
  {
    filename: 'wine-merlot.png',
    name: 'ABC Winery — American Merlot',
    extraction: {
      brand_name: 'ABC Winery', class_type: 'American Merlot',
      alcohol_content: { abv_percent: 15.5, proof: null }, net_contents: '750 mL',
      producer_bottler: 'Bottled by XYZ Vintners, City, State', country_of_origin: null,
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'wine-sake.png',
    name: 'Chichibu Nishiki — Junmai Ginjo Sake',
    extraction: {
      brand_name: 'Chichibu Nishiki', class_type: 'Junmai Ginjo Sake',
      alcohol_content: { abv_percent: 15.5, proof: null }, net_contents: '720 mL',
      producer_bottler: 'Imported by Park Street Imports LLC, Miami, FL', country_of_origin: 'Japan',
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'wine-1.png',
    name: "Hawk's Shadow — Orange Muscat",
    extraction: {
      brand_name: "Hawk's Shadow", class_type: 'Orange Muscat',
      alcohol_content: { abv_percent: 13.68, proof: null }, net_contents: '375 mL',
      producer_bottler: "Hawk's Shadow Estate, Dripping Springs, Texas", country_of_origin: null,
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'spirit-tequila.png',
    name: 'Teremana — Tequila',
    extraction: {
      brand_name: 'Teremana', class_type: 'Tequila',
      alcohol_content: { abv_percent: 40, proof: 80 }, net_contents: '750 mL',
      producer_bottler: 'Imported by Siete Bucks Spirits, White Plains, NY', country_of_origin: 'Mexico',
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'spirit-ouzo.png',
    name: 'Ouzo 12',
    extraction: {
      brand_name: 'Ouzo 12', class_type: 'Ouzo',
      alcohol_content: { abv_percent: null, proof: null }, net_contents: null,
      producer_bottler: 'Imported by Campari America, New York, NY', country_of_origin: 'Greece',
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'malt-hefeweizen.png',
    name: 'Hefeweizen — Imported Beer',
    extraction: {
      brand_name: null, class_type: 'Hefeweizen (imported beer)',
      alcohol_content: { abv_percent: null, proof: null }, net_contents: '500 mL',
      producer_bottler: 'Imported by Malt & Hop Brewery, Hyattsville, Maryland', country_of_origin: 'Germany',
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'bourbon-widow-jane.jpeg',
    name: 'Widow Jane — Bourbon (back label)',
    extraction: {
      brand_name: 'Widow Jane', class_type: 'Bourbon Whiskey',
      alcohol_content: { abv_percent: null, proof: null }, net_contents: null,
      producer_bottler: 'Widow Jane Distillery, Brooklyn, NY', country_of_origin: null,
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'whiskey.png',
    name: 'Redbreast — Irish Whiskey (back label)',
    extraction: {
      brand_name: 'Redbreast', class_type: 'Irish Whiskey',
      alcohol_content: { abv_percent: null, proof: null }, net_contents: '750 mL',
      producer_bottler: 'Imported by Pernod Ricard USA, New York, NY', country_of_origin: 'Ireland',
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'organic.png',
    name: 'Chamisal Vineyards — Chardonnay (back label)',
    extraction: {
      brand_name: 'Chamisal Vineyards', class_type: 'Chardonnay',
      alcohol_content: { abv_percent: null, proof: null }, net_contents: '750 mL',
      producer_bottler: 'Bottled by Chamisal Vineyards, Napa, CA', country_of_origin: null,
      government_warning: { ...OK_WARNING },
    },
  },
  {
    filename: 'wine-2.jpg',
    name: 'William Grant & Sons — importer back crop',
    extraction: {
      brand_name: null, class_type: null,
      alcohol_content: { abv_percent: null, proof: null }, net_contents: null,
      producer_bottler: 'Imported by William Grant and Sons, Inc., New York, NY', country_of_origin: null,
      government_warning: { ...OK_WARNING },
    },
  },
];

/** filename → the model's read of that crop (for mock mode). */
export const SAMPLE_EXTRACTIONS: Record<string, Extraction> = Object.fromEntries(
  SAMPLE_LABELS.map((s) => [s.filename, s.extraction]),
);
