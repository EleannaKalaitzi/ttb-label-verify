import type { FieldVerdict } from '../verdict/types';
import { cautiousTextMatch } from './text-match';

/** Producer/bottler name & address vs the application — cautious text match. */
export function compareBottler(
  declared: string | null | undefined,
  extracted: string | null | undefined,
): FieldVerdict {
  return cautiousTextMatch(declared, extracted, {
    check: 'producer_bottler',
    label: 'Producer / bottler',
    fieldName: 'Producer/bottler',
  });
}
