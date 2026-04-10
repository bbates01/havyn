import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchResidents } from '../api/residentsApi';
import { addPlan, getPlan, updatePlan } from '../api/interventionPlansApi';
import type { Resident } from '../types/Resident';

const PLAN_CATEGORIES = ['Safety', 'Education', 'Physical Health'] as const;

const SERVICES_OPTIONS = ['Healing', 'Legal Services', 'Teaching', 'Caring'] as const;

const STATUSES = ['In Progress', 'On Hold', 'Completed'] as const;

function parseServices(raw: string): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export interface InterventionPlanFormPanelProps {
  basePath: string;
  planEditId?: string;
}

export default function InterventionPlanFormPanel({
  basePath,
  planEditId,
}: InterventionPlanFormPanelProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const isEdit = Boolean(planEditId);

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [residentId, setResidentId] = useState<number>(0);
  const [planCategory, setPlanCategory] = useState<string>(PLAN_CATEGORIES[0]);
  const [planDescription, setPlanDescription] = useState('');
  const [servicesSet, setServicesSet] = useState<Set<string>>(new Set());
  const [targetValue, setTargetValue] = useState<string>('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<string>(STATUSES[0]);
  const [caseConferenceDate, setCaseConferenceDate] = useState('');

  const residentOptions = useMemo(() => {
    let list = residents;
    if (role === 'manager' && safehouseId != null) {
      list = list.filter((r) => r.safehouseId === safehouseId);
    } else if (role === 'staff' && workerCode) {
      list = list.filter(
        (r) => (r.assignedSocialWorker ?? '').trim() === workerCode
      );
    }
    return [...list].sort((a, b) => a.internalCode.localeCompare(b.internalCode));
  }, [residents, role, safehouseId, workerCode]);

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

        if (isEdit && planEditId) {
          const p = await getPlan(Number(planEditId));
          if (cancelled) return;
          setResidentId(p.residentId);
          setPlanCategory(p.planCategory || PLAN_CATEGORIES[0]);
          setPlanDescription(p.planDescription ?? '');
          setServicesSet(parseServices(p.servicesProvided ?? ''));
          setTargetValue(p.targetValue != null ? String(p.targetValue) : '');
          setTargetDate(p.targetDate?.slice(0, 10) ?? '');
          setStatus(p.status || STATUSES[0]);
          setCaseConferenceDate(p.caseConferenceDate?.slice(0, 10) ?? '');
        }
      } catch {
        if (!cancelled) {
          setError(isEdit ? 'Failed to load this plan.' : 'Failed to load residents.');
          setResidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, role, isEdit, planEditId]);

  useEffect(() => {
    if (isEdit || !residents.length) return;
    const q = searchParams.get('residentId');
    if (!q) return;
    const n = parseInt(q, 10);
    if (!Number.isFinite(n)) return;
    const exists = residentOptions.some((r) => r.residentId === n);
    if (exists) setResidentId(n);
  }, [isEdit, residents, residentOptions, searchParams]);

  const toggleService = (svc: string) => {
    setServicesSet((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) {
        next.delete(svc);
      } else {
        next.add(svc);
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!residentId) {
      setError('Select a resident.');
      return;
    }
    if (!planDescription.trim()) {
      setError('Plan description is required.');
      return;
    }
    if (!targetDate) {
      setError('Target date is required.');
      return;
    }

    const now = new Date().toISOString();
    const basePayload = {
      residentId,
      planCategory,
      planDescription: planDescription.trim(),
      servicesProvided: [...servicesSet].join(', '),
      targetValue: targetValue !== '' ? parseFloat(targetValue) : 0,
      targetDate,
      status,
      caseConferenceDate: caseConferenceDate || null,
      updatedAt: now,
    };

    setSubmitting(true);
    try {
      if (isEdit && planEditId) {
        await updatePlan(Number(planEditId), {
          planId: Number(planEditId),
          ...basePayload,
        });
        setSuccess('Plan updated.');
      } else {
        await addPlan({ ...basePayload, createdAt: now });
        setSuccess('Plan saved.');
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

  if (isEdit && error && !planDescription) {
    return (
      <>
        <div className="alert alert-danger">{error}</div>
        <Link to={`${basePath}/forms`} className="btn btn-outline-secondary">
          New plan
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="h4 mb-0">
          {isEdit ? 'Edit intervention plan' : 'New intervention plan'}
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
            <div className="col-md-6">
              <label className="form-label" htmlFor="ip-resident">
                Resident
              </label>
              <select
                id="ip-resident"
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
              <label className="form-label" htmlFor="ip-category">
                Plan category
              </label>
              <select
                id="ip-category"
                className="form-select"
                value={planCategory}
                onChange={(e) => setPlanCategory(e.target.value)}
                disabled={submitting}
              >
                {PLAN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="ip-description">
                Plan description
              </label>
              <textarea
                id="ip-description"
                className="form-control"
                rows={3}
                required
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Improve nutrition and overall wellbeing"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Services provided</label>
              <div className="d-flex flex-wrap gap-3">
                {SERVICES_OPTIONS.map((svc) => (
                  <div className="form-check" key={svc}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`ip-svc-${svc}`}
                      checked={servicesSet.has(svc)}
                      onChange={() => toggleService(svc)}
                      disabled={submitting}
                    />
                    <label className="form-check-label" htmlFor={`ip-svc-${svc}`}>
                      {svc}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="ip-target-value">
                Target value
              </label>
              <input
                id="ip-target-value"
                type="number"
                step="any"
                className="form-control"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                disabled={submitting}
                placeholder="e.g. 4.2"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="ip-target-date">
                Target date
              </label>
              <input
                id="ip-target-date"
                type="date"
                className="form-control"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="ip-status">
                Status
              </label>
              <select
                id="ip-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={submitting}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="ip-conference-date">
                Case conference date
              </label>
              <input
                id="ip-conference-date"
                type="date"
                className="form-control"
                value={caseConferenceDate}
                onChange={(e) => setCaseConferenceDate(e.target.value)}
                disabled={submitting}
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
