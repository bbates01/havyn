import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/apiHelper';
import {
  getResident,
  addResident,
  updateResident,
  fetchSocialWorkers,
  type SocialWorkerOption,
} from '../api/residentsApi';
import type { Resident } from '../types/Resident';

interface Safehouse {
  safehouseId: number;
  name: string;
  city: string;
}

const EMPTY_FORM: Omit<Resident, 'residentId'> = {
  caseControlNo: '',
  internalCode: '',
  safehouseId: 0,
  caseStatus: 'Active',
  sex: '',
  dateOfBirth: '',
  birthStatus: '',
  placeOfBirth: '',
  religion: '',
  caseCategory: '',
  subCatOrphaned: false,
  subCatTrafficked: false,
  subCatChildLabor: false,
  subCatPhysicalAbuse: false,
  subCatSexualAbuse: false,
  subCatOsaec: false,
  subCatCicl: false,
  subCatAtRisk: false,
  subCatStreetChild: false,
  subCatChildWithHiv: false,
  isPwd: false,
  pwdType: '',
  hasSpecialNeeds: false,
  specialNeedsDiagnosis: '',
  familyIs4ps: false,
  familySoloParent: false,
  familyIndigenous: false,
  familyParentPwd: false,
  familyInformalSettler: false,
  dateOfAdmission: '',
  ageUponAdmission: '',
  presentAge: '',
  lengthOfStay: '',
  referralSource: '',
  referringAgencyPerson: '',
  dateColbRegistered: '',
  dateColbObtained: '',
  assignedSocialWorker: '',
  initialCaseAssessment: '',
  dateCaseStudyPrepared: '',
  reintegrationType: '',
  reintegrationStatus: '',
  initialRiskLevel: '',
  currentRiskLevel: '',
  dateEnrolled: '',
  dateClosed: '',
  notesRestricted: '',
};

function safehouseLabel(sh: Safehouse): string {
  const city = sh.city?.trim();
  const name = sh.name?.trim();
  if (city && name) return `${city} — ${name}`;
  return city || name || `Safehouse #${sh.safehouseId}`;
}

export default function ResidentIntakePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isEdit = !!id;
  const role: 'admin' | 'manager' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : null;

  const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';

  const [form, setForm] = useState(EMPTY_FORM);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [workers, setWorkers] = useState<SocialWorkerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [shResult, swResult] = await Promise.all([
          apiFetch<{ items: Safehouse[] }>(
            '/api/Safehouses/AllSafehouses?pageSize=50&pageIndex=1'
          ).catch(() => null),
          fetchSocialWorkers().catch(() => []),
        ]);

        const shList: Safehouse[] =
          (shResult as { items?: Safehouse[] })?.items ??
          (Array.isArray(shResult) ? shResult : []);
        setSafehouses(shList);
        setWorkers(swResult ?? []);

        if (isEdit) {
          const resident = await getResident(Number(id));
          setForm({
            caseControlNo: resident.caseControlNo ?? '',
            internalCode: resident.internalCode ?? '',
            safehouseId: resident.safehouseId,
            caseStatus: resident.caseStatus ?? 'Active',
            sex: resident.sex ?? '',
            dateOfBirth: resident.dateOfBirth ?? '',
            birthStatus: resident.birthStatus ?? '',
            placeOfBirth: resident.placeOfBirth ?? '',
            religion: resident.religion ?? '',
            caseCategory: resident.caseCategory ?? '',
            subCatOrphaned: resident.subCatOrphaned,
            subCatTrafficked: resident.subCatTrafficked,
            subCatChildLabor: resident.subCatChildLabor,
            subCatPhysicalAbuse: resident.subCatPhysicalAbuse,
            subCatSexualAbuse: resident.subCatSexualAbuse,
            subCatOsaec: resident.subCatOsaec,
            subCatCicl: resident.subCatCicl,
            subCatAtRisk: resident.subCatAtRisk,
            subCatStreetChild: resident.subCatStreetChild,
            subCatChildWithHiv: resident.subCatChildWithHiv,
            isPwd: resident.isPwd,
            pwdType: resident.pwdType ?? '',
            hasSpecialNeeds: resident.hasSpecialNeeds,
            specialNeedsDiagnosis: resident.specialNeedsDiagnosis ?? '',
            familyIs4ps: resident.familyIs4ps,
            familySoloParent: resident.familySoloParent,
            familyIndigenous: resident.familyIndigenous,
            familyParentPwd: resident.familyParentPwd,
            familyInformalSettler: resident.familyInformalSettler,
            dateOfAdmission: resident.dateOfAdmission ?? '',
            ageUponAdmission: resident.ageUponAdmission ?? '',
            presentAge: resident.presentAge ?? '',
            lengthOfStay: resident.lengthOfStay ?? '',
            referralSource: resident.referralSource ?? '',
            referringAgencyPerson: resident.referringAgencyPerson ?? '',
            dateColbRegistered: resident.dateColbRegistered ?? '',
            dateColbObtained: resident.dateColbObtained ?? '',
            assignedSocialWorker: resident.assignedSocialWorker ?? '',
            initialCaseAssessment: resident.initialCaseAssessment ?? '',
            dateCaseStudyPrepared: resident.dateCaseStudyPrepared ?? '',
            reintegrationType: resident.reintegrationType ?? '',
            reintegrationStatus: resident.reintegrationStatus ?? '',
            initialRiskLevel: resident.initialRiskLevel ?? '',
            currentRiskLevel: resident.currentRiskLevel ?? '',
            dateEnrolled: resident.dateEnrolled ?? '',
            dateClosed: resident.dateClosed ?? '',
            notesRestricted: resident.notesRestricted ?? '',
          });
        } else if (role === 'manager' && user?.safehouseId) {
          setForm((prev) => ({ ...prev, safehouseId: user.safehouseId! }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEdit, role, user?.safehouseId]);

  function setText(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setBool(field: keyof typeof form, value: boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Partial<Resident> = { ...form };
      if (!payload.pwdType) payload.pwdType = null;
      if (!payload.specialNeedsDiagnosis) payload.specialNeedsDiagnosis = null;
      if (!payload.referralSource) payload.referralSource = null;
      if (!payload.referringAgencyPerson) payload.referringAgencyPerson = null;
      if (!payload.dateColbRegistered) payload.dateColbRegistered = null;
      if (!payload.dateColbObtained) payload.dateColbObtained = null;
      if (!payload.assignedSocialWorker) payload.assignedSocialWorker = null;
      if (!payload.initialCaseAssessment) payload.initialCaseAssessment = null;
      if (!payload.dateCaseStudyPrepared) payload.dateCaseStudyPrepared = null;
      if (!payload.reintegrationType) payload.reintegrationType = null;
      if (!payload.reintegrationStatus) payload.reintegrationStatus = null;
      if (!payload.initialRiskLevel) payload.initialRiskLevel = null;
      if (!payload.currentRiskLevel) payload.currentRiskLevel = null;
      if (!payload.dateEnrolled) payload.dateEnrolled = null;
      if (!payload.dateClosed) payload.dateClosed = null;
      if (!payload.notesRestricted) payload.notesRestricted = null;

      if (isEdit) {
        await updateResident(Number(id), payload);
        setSuccess('Resident updated successfully.');
      } else {
        await addResident(payload);
        setSuccess('Resident created successfully.');
      }

      setTimeout(() => navigate(`${basePath}/caseload`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resident.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p className="text-muted">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          You do not have permission to access this form.
        </div>
      </div>
    );
  }

  const managerLocked = role === 'manager';

  return (
    <div className="container py-4" style={{ maxWidth: 960 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">
          {isEdit ? 'Edit Resident' : 'New Resident Intake'}
        </h4>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate(`${basePath}/caseload`)}
        >
          Back to Caseload
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          />
        </div>
      )}
      {success && (
        <div className="alert alert-success">{success}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Section 1: Case Identifiers ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">Case Identifiers</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Case Control No.</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.caseControlNo}
                  onChange={(e) => setText('caseControlNo', e.target.value)}
                  required
                  placeholder="e.g. C0043"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Internal Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.internalCode}
                  onChange={(e) => setText('internalCode', e.target.value)}
                  required
                  placeholder="e.g. LS-0001"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Safehouse</label>
                <select
                  className="form-select"
                  value={form.safehouseId || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      safehouseId: Number(e.target.value),
                    }))
                  }
                  required
                  disabled={managerLocked}
                >
                  <option value="">Select safehouse...</option>
                  {safehouses
                    .filter(
                      (sh) =>
                        !managerLocked || sh.safehouseId === user?.safehouseId
                    )
                    .map((sh) => (
                      <option key={sh.safehouseId} value={sh.safehouseId}>
                        {safehouseLabel(sh)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Case Status</label>
                <select
                  className="form-select"
                  value={form.caseStatus}
                  onChange={(e) => setText('caseStatus', e.target.value)}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Personal Information ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">Personal Information</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Sex</label>
                <select
                  className="form-select"
                  value={form.sex}
                  onChange={(e) => setText('sex', e.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateOfBirth}
                  onChange={(e) => setText('dateOfBirth', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Birth Status</label>
                <select
                  className="form-select"
                  value={form.birthStatus}
                  onChange={(e) => setText('birthStatus', e.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Marital">Marital</option>
                  <option value="Non-marital">Non-marital</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Place of Birth</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.placeOfBirth}
                  onChange={(e) => setText('placeOfBirth', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Religion</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.religion}
                  onChange={(e) => setText('religion', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Case Classification ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">Case Classification</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Case Category</label>
                <select
                  className="form-select"
                  value={form.caseCategory}
                  onChange={(e) => setText('caseCategory', e.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Neglected">Neglected</option>
                  <option value="Surrendered">Surrendered</option>
                  <option value="Abandoned">Abandoned</option>
                  <option value="Abused">Abused</option>
                  <option value="Exploited">Exploited</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <hr />
            <p className="text-muted mb-2">Sub-categories (check all that apply)</p>
            <div className="row g-2">
              {[
                { key: 'subCatOrphaned' as const, label: 'Orphaned' },
                { key: 'subCatTrafficked' as const, label: 'Trafficked' },
                { key: 'subCatChildLabor' as const, label: 'Child Labor' },
                { key: 'subCatPhysicalAbuse' as const, label: 'Physical Abuse' },
                { key: 'subCatSexualAbuse' as const, label: 'Sexual Abuse' },
                { key: 'subCatOsaec' as const, label: 'OSAEC' },
                { key: 'subCatCicl' as const, label: 'CICL' },
                { key: 'subCatAtRisk' as const, label: 'At Risk' },
                { key: 'subCatStreetChild' as const, label: 'Street Child' },
                { key: 'subCatChildWithHiv' as const, label: 'Child with HIV' },
              ].map(({ key, label }) => (
                <div className="col-md-4 col-6" key={key}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={key}
                      checked={form[key] as boolean}
                      onChange={(e) => setBool(key, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={key}>
                      {label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 4: Disability & Special Needs ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">
            Disability &amp; Special Needs
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isPwd"
                    checked={form.isPwd}
                    onChange={(e) => setBool('isPwd', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isPwd">
                    Person with Disability (PWD)
                  </label>
                </div>
                {form.isPwd && (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type of disability"
                    value={form.pwdType ?? ''}
                    onChange={(e) => setText('pwdType', e.target.value)}
                  />
                )}
              </div>
              <div className="col-md-6">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="hasSpecialNeeds"
                    checked={form.hasSpecialNeeds}
                    onChange={(e) =>
                      setBool('hasSpecialNeeds', e.target.checked)
                    }
                  />
                  <label className="form-check-label" htmlFor="hasSpecialNeeds">
                    Has Special Needs
                  </label>
                </div>
                {form.hasSpecialNeeds && (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Diagnosis (e.g. ADHD, Speech Impairment)"
                    value={form.specialNeedsDiagnosis ?? ''}
                    onChange={(e) =>
                      setText('specialNeedsDiagnosis', e.target.value)
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 5: Family Background ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">Family Background</div>
          <div className="card-body">
            <div className="row g-2">
              {[
                { key: 'familyIs4ps' as const, label: '4Ps Beneficiary' },
                { key: 'familySoloParent' as const, label: 'Solo Parent Household' },
                { key: 'familyIndigenous' as const, label: 'Indigenous Group' },
                { key: 'familyParentPwd' as const, label: 'Parent is PWD' },
                { key: 'familyInformalSettler' as const, label: 'Informal Settler' },
              ].map(({ key, label }) => (
                <div className="col-md-4 col-6" key={key}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={key}
                      checked={form[key] as boolean}
                      onChange={(e) => setBool(key, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={key}>
                      {label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 6: Admission & Referral ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">Admission &amp; Referral</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Date of Admission</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateOfAdmission}
                  onChange={(e) => setText('dateOfAdmission', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Age Upon Admission</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.ageUponAdmission}
                  onChange={(e) => setText('ageUponAdmission', e.target.value)}
                  required
                  placeholder="e.g. 15 Years 9 months"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Present Age</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.presentAge}
                  onChange={(e) => setText('presentAge', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Length of Stay</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.lengthOfStay}
                  onChange={(e) => setText('lengthOfStay', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Referral Source</label>
                <select
                  className="form-select"
                  value={form.referralSource ?? ''}
                  onChange={(e) => setText('referralSource', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="NGO">NGO</option>
                  <option value="Government Agency">Government Agency</option>
                  <option value="Court">Court</option>
                  <option value="Self-Referral">Self-Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Referring Agency / Person</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.referringAgencyPerson ?? ''}
                  onChange={(e) =>
                    setText('referringAgencyPerson', e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 7: Civil Registration ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">Civil Registration</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">
                  COLB Registration Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateColbRegistered ?? ''}
                  onChange={(e) =>
                    setText('dateColbRegistered', e.target.value)
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">COLB Obtained Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateColbObtained ?? ''}
                  onChange={(e) => setText('dateColbObtained', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 8: Case Management ── */}
        <div className="card mb-3">
          <div className="card-header fw-semibold">Case Management</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Assigned Social Worker</label>
                <select
                  className="form-select"
                  value={form.assignedSocialWorker ?? ''}
                  onChange={(e) =>
                    setText('assignedSocialWorker', e.target.value)
                  }
                >
                  <option value="">Unassigned</option>
                  {workers.map((w) => (
                    <option key={w.workerCode} value={w.workerCode}>
                      {w.workerCode}
                      {w.displayName ? ` — ${w.displayName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Initial Case Assessment</label>
                <select
                  className="form-select"
                  value={form.initialCaseAssessment ?? ''}
                  onChange={(e) =>
                    setText('initialCaseAssessment', e.target.value)
                  }
                >
                  <option value="">Select...</option>
                  <option value="For Reunification">For Reunification</option>
                  <option value="For Continued Care">For Continued Care</option>
                  <option value="For Foster Care">For Foster Care</option>
                  <option value="For Adoption">For Adoption</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Date Case Study Prepared</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateCaseStudyPrepared ?? ''}
                  onChange={(e) =>
                    setText('dateCaseStudyPrepared', e.target.value)
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Reintegration Type</label>
                <select
                  className="form-select"
                  value={form.reintegrationType ?? ''}
                  onChange={(e) => setText('reintegrationType', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Family Reunification">
                    Family Reunification
                  </option>
                  <option value="Foster Care">Foster Care</option>
                  <option value="Adoption">Adoption</option>
                  <option value="Independent Living">Independent Living</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Reintegration Status</label>
                <select
                  className="form-select"
                  value={form.reintegrationStatus ?? ''}
                  onChange={(e) =>
                    setText('reintegrationStatus', e.target.value)
                  }
                >
                  <option value="">Select...</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Initial Risk Level</label>
                <select
                  className="form-select"
                  value={form.initialRiskLevel ?? ''}
                  onChange={(e) => setText('initialRiskLevel', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Current Risk Level</label>
                <select
                  className="form-select"
                  value={form.currentRiskLevel ?? ''}
                  onChange={(e) => setText('currentRiskLevel', e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Date Enrolled</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateEnrolled ?? ''}
                  onChange={(e) => setText('dateEnrolled', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Date Closed</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateClosed ?? ''}
                  onChange={(e) => setText('dateClosed', e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">
                  Restricted Notes{' '}
                  <span className="text-muted">(Admin/Manager only)</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.notesRestricted ?? ''}
                  onChange={(e) => setText('notesRestricted', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="d-flex justify-content-end gap-2 mb-4">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate(`${basePath}/caseload`)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-theme-primary"
            disabled={submitting}
          >
            {submitting
              ? 'Saving...'
              : isEdit
                ? 'Update Resident'
                : 'Create Resident'}
          </button>
        </div>
      </form>
    </div>
  );
}
