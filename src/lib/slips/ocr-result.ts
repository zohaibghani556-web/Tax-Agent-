export interface OcrFlagLike {
  reason: string;
}

export const BLANK_EXTRACTION_MESSAGE =
  'We could not read any usable boxes from this slip. Try a clearer file or enter it manually.';

export function hasBlankExtractionFlag(
  flags: readonly OcrFlagLike[] | null | undefined,
): boolean {
  return flags?.some((flag) => flag.reason === 'blank_extraction') ?? false;
}
