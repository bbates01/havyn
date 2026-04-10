import type { Resident } from '../types/Resident';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

/** Maps API JSON (camelCase or PascalCase) to the frontend Resident shape. */
export function normalizeResidentFromApi(raw: unknown): Resident {
  const r = raw as Record<string, unknown>;
  const s = (camel: string, pascal: string, fallback = ''): string =>
    String(r[camel] ?? r[pascal] ?? fallback);
  const n = (camel: string, pascal: string, fallback = 0): number =>
    Number(r[camel] ?? r[pascal] ?? fallback);
  const b = (camel: string, pascal: string, fallback = false): boolean => {
    const v = r[camel] ?? r[pascal];
    if (typeof v === 'boolean') return v;
    return fallback;
  };
  const optStr = (camel: string, pascal: string): string | null | undefined => {
    const v = r[camel] ?? r[pascal];
    if (v === undefined) return undefined;
    if (v === null) return null;
    return String(v);
  };
  const dateStr = (camel: string, pascal: string, fallback = ''): string => {
    const v = r[camel] ?? r[pascal];
    if (v == null || v === '') return fallback;
    const str = String(v);
    return str.length >= 10 ? str.slice(0, 10) : str;
  };
  const optDate = (camel: string, pascal: string): string | null | undefined => {
    const v = r[camel] ?? r[pascal];
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const str = String(v);
    return str.length >= 10 ? str.slice(0, 10) : str;
  };

  return {
    residentId: n('residentId', 'ResidentId'),
    caseControlNo: s('caseControlNo', 'CaseControlNo'),
    internalCode: s('internalCode', 'InternalCode'),
    safehouseId: n('safehouseId', 'SafehouseId'),
    caseStatus: s('caseStatus', 'CaseStatus'),
    sex: s('sex', 'Sex'),
    dateOfBirth: dateStr('dateOfBirth', 'DateOfBirth', '0001-01-01'),
    birthStatus: s('birthStatus', 'BirthStatus'),
    placeOfBirth: s('placeOfBirth', 'PlaceOfBirth'),
    religion: s('religion', 'Religion'),
    caseCategory: s('caseCategory', 'CaseCategory'),
    subCatOrphaned: b('subCatOrphaned', 'SubCatOrphaned'),
    subCatTrafficked: b('subCatTrafficked', 'SubCatTrafficked'),
    subCatChildLabor: b('subCatChildLabor', 'SubCatChildLabor'),
    subCatPhysicalAbuse: b('subCatPhysicalAbuse', 'SubCatPhysicalAbuse'),
    subCatSexualAbuse: b('subCatSexualAbuse', 'SubCatSexualAbuse'),
    subCatOsaec: b('subCatOsaec', 'SubCatOsaec'),
    subCatCicl: b('subCatCicl', 'SubCatCicl'),
    subCatAtRisk: b('subCatAtRisk', 'SubCatAtRisk'),
    subCatStreetChild: b('subCatStreetChild', 'SubCatStreetChild'),
    subCatChildWithHiv: b('subCatChildWithHiv', 'SubCatChildWithHiv'),
    isPwd: b('isPwd', 'IsPwd'),
    pwdType: optStr('pwdType', 'PwdType'),
    hasSpecialNeeds: b('hasSpecialNeeds', 'HasSpecialNeeds'),
    specialNeedsDiagnosis: optStr('specialNeedsDiagnosis', 'SpecialNeedsDiagnosis'),
    familyIs4ps: b('familyIs4ps', 'FamilyIs4ps'),
    familySoloParent: b('familySoloParent', 'FamilySoloParent'),
    familyIndigenous: b('familyIndigenous', 'FamilyIndigenous'),
    familyParentPwd: b('familyParentPwd', 'FamilyParentPwd'),
    familyInformalSettler: b('familyInformalSettler', 'FamilyInformalSettler'),
    dateOfAdmission: dateStr('dateOfAdmission', 'DateOfAdmission', '0001-01-01'),
    ageUponAdmission: s('ageUponAdmission', 'AgeUponAdmission'),
    presentAge: s('presentAge', 'PresentAge'),
    lengthOfStay: s('lengthOfStay', 'LengthOfStay'),
    referralSource: optStr('referralSource', 'ReferralSource'),
    referringAgencyPerson: optStr('referringAgencyPerson', 'ReferringAgencyPerson'),
    dateColbRegistered: optDate('dateColbRegistered', 'DateColbRegistered'),
    dateColbObtained: optDate('dateColbObtained', 'DateColbObtained'),
    assignedSocialWorker: optStr('assignedSocialWorker', 'AssignedSocialWorker'),
    initialCaseAssessment: optStr('initialCaseAssessment', 'InitialCaseAssessment'),
    dateCaseStudyPrepared: optDate('dateCaseStudyPrepared', 'DateCaseStudyPrepared'),
    reintegrationType: optStr('reintegrationType', 'ReintegrationType'),
    reintegrationStatus: optStr('reintegrationStatus', 'ReintegrationStatus'),
    initialRiskLevel: optStr('initialRiskLevel', 'InitialRiskLevel'),
    currentRiskLevel: optStr('currentRiskLevel', 'CurrentRiskLevel'),
    dateEnrolled: optDate('dateEnrolled', 'DateEnrolled'),
    dateClosed: optDate('dateClosed', 'DateClosed'),
    createdAt: optStr('createdAt', 'CreatedAt'),
    notesRestricted: optStr('notesRestricted', 'NotesRestricted'),
  };
}

export function getResidentCaseRecord(id: number) {
  return apiFetch<unknown>(`/api/Residents/GetResident/${id}`).then(normalizeResidentFromApi);
}

export function updateResidentCaseRecord(id: number, data: Resident) {
  return apiFetch<unknown>(`/api/Residents/UpdateResident/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(normalizeResidentFromApi);
}

export function deleteResidentCaseRecord(id: number) {
  return apiFetch<void>(`/api/Residents/DeleteResident/${id}`, {
    method: 'DELETE',
  });
}

export function fetchResidents(params: {
  pageSize: number;
  pageIndex: number;
  status?: string;
  safehouseId?: number;
  riskLevel?: string;
  caseCategory?: string;
  assignedWorker?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<Resident>>(`/api/Residents/AllResidents${query}`);
}

/** @deprecated Use getResidentCaseRecord */
export function getResident(id: number) {
  return getResidentCaseRecord(id);
}

/** @deprecated Backend route not implemented for generic POST */
export function addResident(data: Partial<Resident>) {
  return apiFetch<Resident>('/api/Residents/AddResident', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** @deprecated Use updateResidentCaseRecord */
export function updateResident(id: number, data: Partial<Resident>) {
  return updateResidentCaseRecord(id, data as Resident);
}

/** @deprecated Not implemented on current API */
export function closeCase(id: number) {
  return apiFetch<void>(`/api/residents/${id}/close`, { method: 'PUT' });
}

/** @deprecated Not implemented on current API */
export function reopenCase(id: number) {
  return apiFetch<void>(`/api/residents/${id}/reopen`, { method: 'PUT' });
}
