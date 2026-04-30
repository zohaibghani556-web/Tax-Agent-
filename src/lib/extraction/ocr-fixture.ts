import type { PipelineResult, ValidationFlag } from './types';
import type { OcrEvalActual, OcrEvalExpected, OcrEvalFixture, OcrEvalFlag } from './ocr-eval';
import type { ExtractableSlipType } from './types';

export function pipelineResultToOcrEvalActual(result: PipelineResult): OcrEvalActual {
  return {
    slipType: result.slipType,
    issuerName: result.issuerName,
    taxYear: result.taxYear,
    boxes: result.boxes ?? {},
    status: result.status,
    flags: validationFlagsToOcrEvalFlags(result.validation?.flags ?? []),
  };
}

export function buildOcrEvalFixtureFromPipelineResult(params: {
  id: string;
  slipType: ExtractableSlipType;
  expected: OcrEvalExpected;
  result: PipelineResult;
  description?: string;
}): OcrEvalFixture {
  return {
    id: params.id,
    slipType: params.slipType,
    ...(params.description ? { description: params.description } : {}),
    expected: params.expected,
    actual: pipelineResultToOcrEvalActual(params.result),
  };
}

function validationFlagsToOcrEvalFlags(flags: ValidationFlag[]): OcrEvalFlag[] {
  return flags.map((flag) => ({
    field: flag.field,
    reason: flag.reason,
    message: flag.message,
  }));
}
