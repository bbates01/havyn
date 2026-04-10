import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchResidents,
  type SocialWorkerOption,
} from '../api/residentsApi';
import {
  addHealthRecord,
  getHealthRecord,
  updateHealthRecord,
} from '../api/healthWellbeingApi';
import type { Resident } from '../types/Resident';

export interface HealthWellbeingFormPanelProps {
  basePath: string;
  healthRecordEditId?: string;
}

function computeBmi(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

export default function HealthWellbeingFormPanel({
  basePath,
  healthRecordEditId,
}: HealthWellbeingFormPanelProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const isEdit = Boolean(healthRecordEditId);

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const safehouseId = user?.safehouseId ?? null;
  const workerCode = user?.socialWorkerCode?.trim() || '';

  const [residents, setResidents] = useState<Resident[]>([]);
  const [_workers, _setWorkers] = useState<SocialWorkerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [residentId, setResidentId] = useState<number>(0);
  const [recordDate, setRecordDate] = useState('');
  const [heightCm, setHeightCm] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [generalHealthScore, setGeneralHealthScore] = useState<number>(0);
  const [nutritionScore, setNutritionScore] = useState<number>(0);
  const [sleepQualityScore, setSleepQualityScore] = useState<number>(0);
  const [energyLevelScore, setEnergyLevelScore] = useState<number>(0);
  const [medicalCheckupDone, setMedicalCheckupDone] = useState(false);
  const [dentalCheckupDone, setDentalCheckupDone] = useState(false);
  const [psychologicalCheckupDone, setPsychologicalCheckupDone] = useState(false);
  const [notes, setNotes] = useState('');

  const bmi = useMemo(() => computeBmi(heightCm, weightKg), [heightCm, weightKg]);

  // Staff: assigned residents only. Manager: own safehouse. Admin: all.
  const residentOptions = useMemo(() => {
    let list = residents;
    if (role === 'staff' && workerCode) {
      list = list.filter((r) => r.assignedSocialWorker === workerCode);
    } else if (role === 'manager' && safehouseId != null) {
      list = list.filter((r) => r.safehouseId === safehouseId);
    }
    return [...list].sort((a, b) => a.internalCode.localeCompare(b.internalCode));
  }, [residents, role, workerCode, safehouseId]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !role) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchResidents({ pageSize: 500, pageIndex: 1 });
        if (cancelled) return;
        setResidents(res.items ?? []);

        if (isEdit && healthRecordEditId) {
          const rec = await getHealthRecord(Number(healthRecordEditId));
          if (cancelled) return;
          setResidentId(rec.residentId);
          setRecordDate(rec.recordDate?.slice(0, 10) ?? '');
          setHeightCm(rec.heightCm);
          setWeightKg(rec.weightKg);
          setGeneralHealthScore(rec.generalHealthScore);
          setNutritionScore(rec.nutritionScore);
          setSleepQualityScore(rec.sleepQualityScore);
          setEnergyLevelScore(rec.energyLevelScore);
          setMedicalCheckupDone(!!rec.medicalCheckupDone);
          setDentalCheckupDone(!!rec.dentalCheckupDone);
          setPsychologicalCheckupDone(!!rec.psychologicalCheckupDone);
          setNotes(rec.notes ?? '');
        }
      } catch {
        if (!cancelled) {
          setError(isEdit ? 'Failed to load this health record.' : 'Failed to load residents.');
          setResidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, role, isEdit, healthRecordEditId]);

  useEffect(() => {
    if (isEdit || !residents.length) return;
    const q = searchParams.get('residentId');
    if (!q) return;
    const n = parseInt(q, 10);
    if (!Number.isFinite(n)) return;
    const exists = residentOptions.some((r) => r.residentId === n);
    if (exists) setResidentId(n);
  }, [isEdit, residents, residentOptions, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!residentId) {
      setError('Select a resident.');
      return;
    }
    if (!recordDate) {
      setError('Record date is required.');
      return;
    }
    if (!heightCm || heightCm <= 0) {
      setError('Height must be greater than 0.');
      return;
    }
    if (!weightKg || weightKg <= 0) {
      setError('Weight must be greater than 0.');
      return;
    }

    const payload = {
      residentId,
      recordDate,
      generalHealthScore,
      nutritionScore,
      sleepQualityScore,
      energyLevelScore,
      heightCm,
      weightKg,
      bmi,
      medicalCheckupDone,
      dentalCheckupDone,
      psychologicalCheckupDone,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit && healthRecordEditId) {
        await updateHealthRecord(Number(healthRecordEditId), {
          healthRecordId: Number(healthRecordEditId),
          ...payload,
        });
        setSuccess('Health record updated.');
      } else {
        await addHealthRecord(payload);
        setSuccess('Health record saved.');
      }
      setTimeout(() => navigate(`${basePath}/caseload`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" />
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (isEdit && error && !recordDate) {
    return (
      <>
        <div className="alert alert-danger">{error}</div>
        <Link to={`${basePath}/forms`} className="btn btn-outline-secondary">
          New health record
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="h4 mb-0">
          {isEdit ? 'Edit health & wellbeing record' : 'New health & wellbeing record'}
        </h2>
        <div className="d-flex gap-2 no-print">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => window.print()}
          >
            Print form
          </button>
          <Link to={`${basePath}/caseload`} className="btn btn-outline-secondary btn-sm">
            Back to caseload
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="card shadow-sm border-0">
        <div className="card-body p-4">
          <div className="row g-3">

            {/* Resident + record date */}
            <div className="col-md-6">
              <label className="form-label" htmlFor="hw-resident">
                Resident
              </label>
              <select
                id="hw-resident"
                className="form-select"
                required
                value={residentId || ''}
                onChange={(e) => setResidentId(Number(e.target.value))}
                disabled={submitting}
              >
                <option value="">Select…</option>
                {residentOptions.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.internalCode} — {r.caseControlNo}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="hw-date">
                Record date
              </label>
              <input
                id="hw-date"
                type="date"
                className="form-control"
                required
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Physical measurements */}
            <div className="col-12 mt-2">
              <h3 className="h6 fw-semibold text-muted mb-0">Physical measurements</h3>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="hw-height">
                Height (cm)
              </label>
              <input
                id="hw-height"
                type="number"
                className="form-control"
                min={1}
                step={0.1}
                required
                value={heightCm || ''}
                onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                disabled={submitting}
                placeholder="e.g. 150"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="hw-weight">
                Weight (kg)
              </label>
              <input
                id="hw-weight"
                type="number"
                className="form-control"
                min={1}
                step={0.1}
                required
                value={weightKg || ''}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                disabled={submitting}
                placeholder="e.g. 45"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="hw-bmi">
                BMI (auto-computed)
              </label>
              <input
                id="hw-bmi"
                type="text"
                className="form-control bg-light"
                value={bmi > 0 ? bmi.toFixed(2) : '—'}
                readOnly
                disabled
              />
            </div>

            {/* Wellness scores */}
            <div className="col-12 mt-2">
              <h3 className="h6 fw-semibold text-muted mb-0">Wellness scores <span className="fw-normal">(0 – 5)</span></h3>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="hw-general">
                General health
              </label>
              <input
                id="hw-general"
                type="number"
                className="form-control"
                min={0}
                max={5}
                step={0.1}
                required
                value={generalHealthScore}
                onChange={(e) => setGeneralHealthScore(parseFloat(e.target.value) || 0)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="hw-nutrition">
                Nutrition
              </label>
              <input
                id="hw-nutrition"
                type="number"
                className="form-control"
                min={0}
                max={5}
                step={0.1}
                required
                value={nutritionScore}
                onChange={(e) => setNutritionScore(parseFloat(e.target.value) || 0)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="hw-sleep">
                Sleep quality
              </label>
              <input
                id="hw-sleep"
                type="number"
                className="form-control"
                min={0}
                max={5}
                step={0.1}
                required
                value={sleepQualityScore}
                onChange={(e) => setSleepQualityScore(parseFloat(e.target.value) || 0)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="hw-energy">
                Energy level
              </label>
              <input
                id="hw-energy"
                type="number"
                className="form-control"
                min={0}
                max={5}
                step={0.1}
                required
                value={energyLevelScore}
                onChange={(e) => setEnergyLevelScore(parseFloat(e.target.value) || 0)}
                disabled={submitting}
              />
            </div>

            {/* Checkups */}
            <div className="col-12 mt-2">
              <h3 className="h6 fw-semibold text-muted mb-2">Checkups completed this period</h3>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hw-medical"
                  checked={medicalCheckupDone}
                  onChange={(e) => setMedicalCheckupDone(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="hw-medical">
                  Medical checkup
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hw-dental"
                  checked={dentalCheckupDone}
                  onChange={(e) => setDentalCheckupDone(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="hw-dental">
                  Dental checkup
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hw-psych"
                  checked={psychologicalCheckupDone}
                  onChange={(e) => setPsychologicalCheckupDone(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="hw-psych">
                  Psychological checkup
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="col-12">
              <label className="form-label" htmlFor="hw-notes">
                Notes <span className="text-muted fw-normal">(optional)</span>
              </label>
              <textarea
                id="hw-notes"
                className="form-control"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Health status: Stable"
              />
            </div>
          </div>

          <div className="mt-4 d-flex flex-wrap gap-2 no-print">
            <button
              type="submit"
              className="btn btn-theme-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : isEdit ? 'Update' : 'Save'}
            </button>
            <Link to={`${basePath}/caseload`} className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
