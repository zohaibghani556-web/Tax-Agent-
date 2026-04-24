// AUTO-GENERATED — DO NOT HAND-EDIT
// Source XSD: scripts/cra-xsds/t2202.xsd (CRA v1.26.3)
// Regenerate: npm run gen:slip-types
//
// This file provides the XSD-faithful representation of the CRA T2202 slip.
// The app-layer types (box14, box16 etc.) live in src/lib/tax-engine/types.ts.
// Use XSD_BOX_MAP_T2202 from box-mappings.ts to translate between layers.

import { z } from 'zod/v4';


/** T2202 SchoolSessionType */
export interface CraXsd_SchoolSessionType {
  /** Session start year-month (YYMM) (sessionStart) — xsd:StartYearMonth */
  StartYearMonth: string;
  /** Session end year-month (YYMM) (sessionEnd) — xsd:EndYearMonth */
  EndYearMonth: string;
  /** Session eligible tuition fees (sessionBoxA) — xsd:EligibleTuitionFeeAmount */
  EligibleTuitionFeeAmount?: number;
  /** Session part-time months (sessionBoxB) — xsd:PartTimeStudentMonthCount */
  PartTimeStudentMonthCount: number;
  /** Session full-time months (sessionBoxC) — xsd:FullTimeStudentMonthCount */
  FullTimeStudentMonthCount: number;
}

export const CraXsd_SchoolSessionTypeSchema = z.object({
  StartYearMonth: z.string(),
  EndYearMonth: z.string(),
  EligibleTuitionFeeAmount: z.number().optional(),
  PartTimeStudentMonthCount: z.number().int().min(0).max(12),
  FullTimeStudentMonthCount: z.number().int().min(0).max(12),
});
export type CraXsd_SchoolSessionTypeInferred = z.infer<typeof CraXsd_SchoolSessionTypeSchema>;

/** T2202 — Tuition and Enrolment Certificate */
export interface CraXsd_T2202SlipType {
  /** Report type code — xsd:SlipReportTypeCode */
  SlipReportTypeCode: 'A' | 'M' | 'O' | 'C';
  /** Filer BZ account number — xsd:FilerAccountNumber */
  FilerAccountNumber: string;
  /** School program name — xsd:PostSecondaryEducationalSchoolProgramName */
  PostSecondaryEducationalSchoolProgramName: string;
  /** School type (1=university, 2=college, 3=other, 4=certified, 5=flying school) — xsd:PostSecondaryEducationalSchoolTypeCode */
  PostSecondaryEducationalSchoolTypeCode: 1 | 2 | 3 | 4 | 5;
  /** Flying school course type (required if school type = 5) — xsd:FlyingSchoolClubCourseTypeCode */
  FlyingSchoolClubCourseTypeCode?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Student name — xsd:StudentName */
  StudentName: Record<string, unknown>;
  /** Student Social Insurance Number — xsd:SocialInsuranceNumber */
  SocialInsuranceNumber: string;
  /** Student number (institution-assigned) — xsd:StudentNumber */
  StudentNumber?: string;
  /** Student address — xsd:StudentAddress */
  StudentAddress: Record<string, unknown>;
  /** Academic session (1–4 sessions per slip) — xsd:SchoolSession */
  SchoolSession: CraXsd_SchoolSessionType[];
  /** Box A — Total eligible tuition fees (boxA) — xsd:TotalEligibleTuitionFeeAmount */
  TotalEligibleTuitionFeeAmount?: number;
  /** Box B — Total part-time months enrolled (boxB) — xsd:TotalPartTimeStudentMonthCount */
  TotalPartTimeStudentMonthCount: number;
  /** Box C — Total full-time months enrolled (boxC) — xsd:TotalFullTimeStudentMonthCount */
  TotalFullTimeStudentMonthCount: number;
}

export const CraXsd_T2202SlipTypeSchema = z.object({
  SlipReportTypeCode: z.enum(['A', 'M', 'O', 'C']),
  FilerAccountNumber: z.string(),
  PostSecondaryEducationalSchoolProgramName: z.string().max(100),
  PostSecondaryEducationalSchoolTypeCode: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  FlyingSchoolClubCourseTypeCode: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional(),
  StudentName: z.record(z.string(), z.unknown()),
  SocialInsuranceNumber: z.string().length(9),
  StudentNumber: z.string().max(20).optional(),
  StudentAddress: z.record(z.string(), z.unknown()),
  SchoolSession: z.array(CraXsd_SchoolSessionTypeSchema),
  TotalEligibleTuitionFeeAmount: z.number().optional(),
  TotalPartTimeStudentMonthCount: z.number().int().min(0).max(12),
  TotalFullTimeStudentMonthCount: z.number().int().min(0).max(12),
});
export type CraXsd_T2202SlipTypeInferred = z.infer<typeof CraXsd_T2202SlipTypeSchema>;