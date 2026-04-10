import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchResidents,
  fetchSocialWorkers,
  type SocialWorkerOption,
} from '../api/residentsApi';
import {
  addRecording,
  getRecording,
  updateRecording,
} from '../api/processRecordingsApi';
import type { Resident } from '../types/Resident';

const INTERVENTION_OPTIONS = [
  'Caring',
  'Legal Services',
  'Healing',
  'Teaching',
] as const;

function parseInterventions(csv: string | null | undefined): Set<string> {
  const s = new Set<string>();
  if (!csv?.trim()) return s;
  for (const part of csv.split(',')) {
    const t = part.trim();
    if (t) s.add(t);
  }
  return s;
}

function serializeInterventions(selected: Set<string>): string {
  return INTERVENTION_OPTIONS.filter((o) => selected.has(o)).join(', ');
}

export interface ProcessRecordingFormPanelProps {
  basePath: string;
  /** When set, load and edit this recording */
  recordingEditId?: string;
}

export default function ProcessRecordingFormPanel({
  basePath,
  recordingEditId,
}: ProcessRecordingFormPanelProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const isEdit = Boolean(recordingEditId);

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes(
    'Admin'
  )
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const canSeeRestrictedNotes = role === 'admin' || role === 'manager';
  const safehouseId = user?.safehouseId ?? null;
  const workerCode = user?.socialWorkerCode?.trim() || '';

  const [residents, setResidents] = useState<Resident[]>([]);
  const [workers, setWorkers] = useState<SocialWorkerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [residentId, setResidentId] = useState<number>(0);
  const [sessionDate, setSessionDate] = useState('');
  const [socialWorker, setSocialWorker] = useState('');
  const [sessionType, setSessionType] = useState('Individual');
  const [sessionDurationMinutes, setSessionDurationMinutes] =
    useState<number>(30);
  const [emotionalStateObserved, setEmotionalStateObserved] = useState('');
  const [emotionalStateEnd, setEmotionalStateEnd] = useState('');
  const [sessionNarrative, setSessionNarrative] = useState('');
  const [interventionSet, setInterventionSet] = useState<Set<string>>(
    new Set()
  );
  const [followUpActions, setFollowUpActions] = useState('');
  const [progressNoted, setProgressNoted] = useState(false);
  const [concernsFlagged, setConcernsFlagged] = useState(false);
  const [referralMade, setReferralMade] = useState(false);
  const [notesRestricted, setNotesRestricted] = useState('');

  const residentOptions = useMemo(() => {
    let list = residents;
    if (role === 'manager' && safehouseId != null) {
      list = list.filter((r) => r.safehouseId === safehouseId);
    }
    return [...list].sort((a, b) =>
      a.internalCode.localeCompare(b.internalCode)
    );
  }, [residents, role, safehouseId]);

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

        if (role === 'admin' || role === 'manager') {
          try {
            setWorkers(await fetchSocialWorkers());
          } catch {
            setWorkers([]);
          }
        }

        if (isEdit && recordingEditId) {
          const rec = await getRecording(Number(recordingEditId));
          if (cancelled) return;
          setResidentId(rec.residentId);
          setSessionDate(rec.sessionDate?.slice(0, 10) ?? '');
          setSocialWorker(rec.socialWorker ?? '');
          setSessionType(rec.sessionType || 'Individual');
          setSessionDurationMinutes(rec.sessionDurationMinutes ?? 30);
          setEmotionalStateObserved(rec.emotionalStateObserved ?? '');
          setEmotionalStateEnd(rec.emotionalStateEnd ?? '');
          setSessionNarrative(rec.sessionNarrative ?? '');
          setInterventionSet(parseInterventions(rec.interventionsApplied));
          setFollowUpActions(rec.followUpActions ?? '');
          setProgressNoted(!!rec.progressNoted);
          setConcernsFlagged(!!rec.concernsFlagged);
          setReferralMade(!!rec.referralMade);
          setNotesRestricted(rec.notesRestricted ?? '');
        }
      } catch {
        if (!cancelled) {
          setError(
            isEdit
              ? 'Failed to load this recording.'
              : 'Failed to load residents.'
          );
          setResidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, role, isEdit, recordingEditId]);

  useEffect(() => {
    if (role !== 'staff' || !workerCode) return;
    setSocialWorker(workerCode);
  }, [role, workerCode]);

  useEffect(() => {
    if (isEdit || !residents.length) return;
    const q = searchParams.get('residentId');
    if (!q) return;
    const n = parseInt(q, 10);
    if (!Number.isFinite(n)) return;
    const exists = residents.some((r) => r.residentId === n);
    if (exists) setResidentId(n);
  }, [isEdit, residents, searchParams]);

  const toggleIntervention = (label: string) => {
    setInterventionSet((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
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
    if (!sessionDate) {
      setError('Session date is required.');
      return;
    }
    if (!socialWorker.trim()) {
      setError('Social worker is required.');
      return;
    }

    const interventionsApplied = serializeInterventions(interventionSet);

    const basePayload = {
      residentId,
      sessionDate,
      socialWorker: socialWorker.trim(),
      sessionType,
      sessionDurationMinutes,
      emotionalStateObserved: emotionalStateObserved.trim(),
      emotionalStateEnd: emotionalStateEnd.trim(),
      sessionNarrative: sessionNarrative.trim(),
      interventionsApplied,
      followUpActions: followUpActions.trim(),
      progressNoted,
      concernsFlagged,
      referralMade,
    };

    setSubmitting(true);
    try {
      if (isEdit && recordingEditId) {
        const payload = canSeeRestrictedNotes
          ? { ...basePayload, notesRestricted: notesRestricted.trim() || null }
          : basePayload;
        await updateRecording(Number(recordingEditId), {
          recordingId: Number(recordingEditId),
          ...payload,
        });
        setSuccess('Recording updated.');
      } else {
        const payload = canSeeRestrictedNotes
          ? { ...basePayload, notesRestricted: notesRestricted.trim() || null }
          : basePayload;
        await addRecording(payload);
        setSuccess('Recording saved.');
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

  if (isEdit && error && !sessionDate) {
    return (
      <>
        <div className="alert alert-danger">{error}</div>
        <Link to={`${basePath}/forms`} className="btn btn-outline-secondary">
          New recording
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="h4 mb-0">
          {isEdit ? 'Edit process recording' : 'New process recording'}
        </h2>
        <div className="d-flex gap-2 no-print">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => window.print()}
          >
            Print form
          </button>
          <Link
            to={`${basePath}/caseload`}
            className="btn btn-outline-secondary btn-sm"
          >
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
              <label className="form-label" htmlFor="pr-resident">
                Resident
              </label>
              <select
                id="pr-resident"
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
              <label className="form-label" htmlFor="pr-date">
                Session date
              </label>
              <input
                id="pr-date"
                type="date"
                className="form-control"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="pr-worker">
                Social worker
              </label>
              {role === 'staff' ? (
                <input
                  id="pr-worker"
                  type="text"
                  className="form-control"
                  value={socialWorker}
                  readOnly
                  disabled
                />
              ) : (
                <select
                  id="pr-worker"
                  className="form-select"
                  required
                  value={socialWorker}
                  onChange={(e) => setSocialWorker(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select…</option>
                  {workers.map((w) => (
                    <option key={w.workerCode} value={w.workerCode}>
                      {w.workerCode} — {w.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="pr-type">
                Session type
              </label>
              <select
                id="pr-type"
                className="form-select"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                disabled={submitting}
              >
                <option value="Individual">Individual</option>
                <option value="Group">Group</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="pr-duration">
                Duration (minutes)
              </label>
              <input
                id="pr-duration"
                type="number"
                min={1}
                className="form-control"
                required
                value={sessionDurationMinutes}
                onChange={(e) =>
                  setSessionDurationMinutes(Number(e.target.value) || 0)
                }
                disabled={submitting}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="pr-emotion-start">
                Emotional state observed
              </label>
              <textarea
                id="pr-emotion-start"
                className="form-control"
                rows={2}
                required
                value={emotionalStateObserved}
                onChange={(e) => setEmotionalStateObserved(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="pr-emotion-end">
                Emotional state at end
              </label>
              <textarea
                id="pr-emotion-end"
                className="form-control"
                rows={2}
                required
                value={emotionalStateEnd}
                onChange={(e) => setEmotionalStateEnd(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="pr-narrative">
                Session narrative
              </label>
              <textarea
                id="pr-narrative"
                className="form-control"
                rows={4}
                required
                value={sessionNarrative}
                onChange={(e) => setSessionNarrative(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-12">
              <span className="form-label d-block">Interventions applied</span>
              <div className="d-flex flex-wrap gap-3">
                {INTERVENTION_OPTIONS.map((opt) => (
                  <div key={opt} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`pr-int-${opt}`}
                      checked={interventionSet.has(opt)}
                      onChange={() => toggleIntervention(opt)}
                      disabled={submitting}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`pr-int-${opt}`}
                    >
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="pr-followup">
                Follow-up actions
              </label>
              <textarea
                id="pr-followup"
                className="form-control"
                rows={2}
                required
                value={followUpActions}
                onChange={(e) => setFollowUpActions(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="pr-progress"
                  checked={progressNoted}
                  onChange={(e) => setProgressNoted(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="pr-progress">
                  Progress noted
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="pr-concerns"
                  checked={concernsFlagged}
                  onChange={(e) => setConcernsFlagged(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="pr-concerns">
                  Concerns flagged
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="pr-referral"
                  checked={referralMade}
                  onChange={(e) => setReferralMade(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="pr-referral">
                  Referral made
                </label>
              </div>
            </div>
            {canSeeRestrictedNotes && (
              <div className="col-12">
                <label className="form-label" htmlFor="pr-restricted">
                  Notes (restricted)
                </label>
                <textarea
                  id="pr-restricted"
                  className="form-control"
                  rows={3}
                  value={notesRestricted}
                  onChange={(e) => setNotesRestricted(e.target.value)}
                  disabled={submitting}
                  placeholder="Visible to admin and manager only"
                />
              </div>
            )}
          </div>
          <div className="mt-4 d-flex flex-wrap gap-2 no-print">
            <button
              type="submit"
              className="btn btn-theme-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : isEdit ? 'Update' : 'Save'}
            </button>
            <Link
              to={`${basePath}/caseload`}
              className="btn btn-outline-secondary"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
