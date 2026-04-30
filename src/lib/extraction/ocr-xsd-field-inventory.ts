import { SLIP_FIELDS } from '@/lib/slips/slip-fields';
import { XSD_BOX_MAP } from '@/types/slips/cra/box-mappings';
import { OCR_SLIP_SOURCES } from './ocr-source-manifest';
import type { OcrSlipSource } from './ocr-source-manifest';
import { SUPPLEMENTAL_OCR_XSD_BOX_MAP } from './ocr-xsd-supplemental-box-maps';

export type OcrXsdMapSource = 'generated' | 'supplemental' | 'generated+supplemental' | 'none';

export interface OcrXsdFieldInventoryEntry {
  slipType: string;
  engineType: string;
  xsdFiles: string[];
  hasGeneratedXsdBoxMap: boolean;
  hasSupplementalXsdBoxMap: boolean;
  hasAnyXsdBoxMap: boolean;
  xsdMapSource: OcrXsdMapSource;
  appSupportedBoxKeys: string[];
  xsdMappedBoxKeys: string[];
  appBoxKeysWithXsdMapping: string[];
  appBoxKeysMissingXsdMapping: string[];
  xsdMappedBoxKeysUnsupportedByApp: string[];
  xsdFieldCount: number;
}

export interface OcrXsdFieldInventoryReport {
  entries: OcrXsdFieldInventoryEntry[];
  generatedCoverageCount: number;
  mappedCoverageCount: number;
  totalSlipCount: number;
}

const METADATA_KEYS = new Set(['issuerName', 'institutionName']);

export function buildOcrXsdFieldInventoryReport(
  sources: OcrSlipSource[] = OCR_SLIP_SOURCES,
): OcrXsdFieldInventoryReport {
  const entries = sources.map(buildEntry);

  return {
    entries,
    generatedCoverageCount: entries.filter((entry) => entry.hasGeneratedXsdBoxMap).length,
    mappedCoverageCount: entries.filter((entry) => entry.hasAnyXsdBoxMap).length,
    totalSlipCount: entries.length,
  };
}

function buildEntry(source: OcrSlipSource): OcrXsdFieldInventoryEntry {
  const generatedXsdBoxMap = XSD_BOX_MAP[source.engineType] ?? {};
  const supplementalXsdBoxMap = SUPPLEMENTAL_OCR_XSD_BOX_MAP[source.engineType] ?? {};
  const xsdBoxMap = { ...generatedXsdBoxMap, ...supplementalXsdBoxMap };
  const appSupportedBoxKeys = uniqueSorted(
    (SLIP_FIELDS[source.engineType] ?? [])
      .filter((field) => !METADATA_KEYS.has(field.key))
      .map((field) => field.key),
  );
  const xsdMappedBoxKeys = uniqueSorted(Object.values(xsdBoxMap));
  const xsdMappedSet = new Set(xsdMappedBoxKeys);
  const appSupportedSet = new Set(appSupportedBoxKeys);

  return {
    slipType: source.slipType,
    engineType: source.engineType,
    xsdFiles: source.xsdFiles,
    hasGeneratedXsdBoxMap: Object.keys(generatedXsdBoxMap).length > 0,
    hasSupplementalXsdBoxMap: Object.keys(supplementalXsdBoxMap).length > 0,
    hasAnyXsdBoxMap: Object.keys(xsdBoxMap).length > 0,
    xsdMapSource: getXsdMapSource(generatedXsdBoxMap, supplementalXsdBoxMap),
    appSupportedBoxKeys,
    xsdMappedBoxKeys,
    appBoxKeysWithXsdMapping: appSupportedBoxKeys.filter((key) => xsdMappedSet.has(key)),
    appBoxKeysMissingXsdMapping: appSupportedBoxKeys.filter((key) => !xsdMappedSet.has(key)),
    xsdMappedBoxKeysUnsupportedByApp: xsdMappedBoxKeys.filter((key) => !appSupportedSet.has(key)),
    xsdFieldCount: Object.keys(xsdBoxMap).length,
  };
}

function getXsdMapSource(
  generatedXsdBoxMap: Record<string, string>,
  supplementalXsdBoxMap: Record<string, string>,
): OcrXsdMapSource {
  const hasGenerated = Object.keys(generatedXsdBoxMap).length > 0;
  const hasSupplemental = Object.keys(supplementalXsdBoxMap).length > 0;

  if (hasGenerated && hasSupplemental) return 'generated+supplemental';
  if (hasGenerated) return 'generated';
  if (hasSupplemental) return 'supplemental';
  return 'none';
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
