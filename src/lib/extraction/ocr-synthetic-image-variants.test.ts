import { describe, expect, it } from 'vitest';
import {
  OCR_SYNTHETIC_IMAGE_FIXTURE_CASES,
  getBaseSyntheticFixtureCase,
} from './ocr-synthetic-image-variants';

describe('ocr-synthetic-image-variants', () => {
  it('defines image degradation variants for the first priority clean fixtures', () => {
    expect(OCR_SYNTHETIC_IMAGE_FIXTURE_CASES).toHaveLength(12);

    const variantsByBase = new Map<string, Set<string>>();
    for (const fixtureCase of OCR_SYNTHETIC_IMAGE_FIXTURE_CASES) {
      const variants = variantsByBase.get(fixtureCase.baseCaseId) ?? new Set<string>();
      variants.add(fixtureCase.imageVariant);
      variantsByBase.set(fixtureCase.baseCaseId, variants);
    }

    expect(variantsByBase.get('cra-synthetic-t4-clean')).toEqual(
      new Set(['phone-screenshot-png', 'rotated-png', 'low-contrast-jpeg', 'compressed-jpeg']),
    );
    expect(variantsByBase.get('cra-synthetic-t4a-clean')).toEqual(
      new Set(['phone-screenshot-png', 'rotated-png', 'low-contrast-jpeg', 'compressed-jpeg']),
    );
    expect(variantsByBase.get('cra-synthetic-t2202-clean')).toEqual(
      new Set(['phone-screenshot-png', 'rotated-png', 'low-contrast-jpeg', 'compressed-jpeg']),
    );
  });

  it('links every image variant to an existing base synthetic fixture', () => {
    for (const imageCase of OCR_SYNTHETIC_IMAGE_FIXTURE_CASES) {
      const baseCase = getBaseSyntheticFixtureCase(imageCase.baseCaseId);
      expect(baseCase.variant).toBe('clean-pdf');
      expect(imageCase.id).toContain(baseCase.id);
    }
  });

  it('throws for unknown base fixture ids', () => {
    expect(() => getBaseSyntheticFixtureCase('missing-fixture')).toThrow(
      'No base synthetic fixture case found',
    );
  });
});
