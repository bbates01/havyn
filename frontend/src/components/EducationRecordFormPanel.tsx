import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchResidents } from '../api/residentsApi';
import {
  addEducationRecord,
  getEducationRecord,
  updateEducationRecord,
} from '../api/educationRecordsApi';
import type { Resident } from '../types/Resident';

const EDUCATION_LEVELS = ['Primary', 'Secondary', 'Vocational'] as const;
const ENROLLMENT_STATUSES = ['Enrolled', 'Not Enrolled'] as const;
const COMPLETION_STATUSES = ['NotStarted', 'InProgress', 'Completed'] as const;

export interface EducationRecordFormPanelProps {
  basePath: string;
  educationRecordEditId?: string;
}

export default function EducationRecordFormPanel({
  basePath,
  educationRecordEditId,
}: EducationRecordFormPanelProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const isEdit = Boolean(educationRecordEditId);

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
  const [recordDate, setRecordDate] = useState('');
  const [educationLevel, setEducationLevel] = useState<string>(EDUCATION_LEVELS[0]);
  const [schoolName, setSchoolName] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>(ENROLLMENT_STATUSES[0]);
  const [attendanceRate, setAttendanceRate] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [completionStatus, setCompletionStatus] = useState<string>(COMPLETION_STATUSES[0]);
  const [notes, setNotes] = useState('');

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

        if (isEdit && educationRecordEditId) {
          const rec = await getEducationRecord(Number(educationRecordEditId));
          if (cancelled) return;
          setResidentId(rec.residentId);
          setRecordDate(rec.recordDate?.slice(0, 10) ?? '');
          setEducationLevel(rec.educationLevel || EDUCATION_LEVELS[0]);
          setSchoolName(rec.schoolName ?? '');
          setEnrollmentStatus(rec.enrollmentStatus || ENROLLMENT_STATUSES[0]);
          setAttendanceRate(rec.attendanceRate ?? 0);
          setProgressPercent(rec.progressPercent ?? 0);
          setCompletionStatus(rec.completionStatus || COMPLETION_STATUSES[0]);
          setNotes(rec.notes ?? '');
        }
      } catch {
        if (!cancelled) {
          setError(isEdit ? 'Failed to load this education record.' : 'Failed to load residents.');
          setResidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, role, isEdit, educationRecordEditId]);

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
    if (!schoolName.trim()) {
      setError('School name is required.');
      return;
    }

    const payload = {
      residentId,
      recordDate,
      educationLevel,
      schoolName: schoolName.trim(),
      enrollmentStatus,
      attendanceRate,
      progressPercent,
      completionStatus,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit && educationRecordEditId) {
        await updateEducationRecord(Number(educationRecordEditId), {
          educationRecordId: Number(educationRecordEditId),
          ...payload,
        });
        setSuccess('Education record updated.');
      } else {
        await addEducationRecord(payload);
        setSuccess('Education record saved.');
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
          New education record
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="h4 mb-0">
          {isEdit ? 'Edit education record' : 'New education record'}
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
              <label className="form-label" htmlFor="er-resident">
                Resident
              </label>
              <select
                id="er-resident"
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
              <label className="form-label" htmlFor="er-date">
                Record date
              </label>
              <input
                id="er-date"
                type="date"
                className="form-control"
                required
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Enrollment details */}
            <div className="col-md-4">
              <label className="form-label" htmlFor="er-level">
                Education level
              </label>
              <select
                id="er-level"
                className="form-select"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                disabled={submitting}
              >
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="er-school">
                School name
              </label>
              <input
                id="er-school"
                type="text"
                className="form-control"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Barangay Elementary School"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="er-enrollment">
                Enrollment status
              </label>
              <select
                id="er-enrollment"
                className="form-select"
                value={enrollmentStatus}
                onChange={(e) => setEnrollmentStatus(e.target.value)}
                disabled={submitting}
              >
                {ENROLLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Progress tracking */}
            <div className="col-md-4">
              <label className="form-label" htmlFor="er-attendance">
                Attendance rate
              </label>
              <input
                id="er-attendance"
                type="number"
                className="form-control"
                min={0}
                max={1}
                step={0.001}
                value={attendanceRate}
                onChange={(e) => setAttendanceRate(parseFloat(e.target.value) || 0)}
                disabled={submitting}
              />
              <div className="form-text">Enter as decimal, e.g. 0.95 = 95%</div>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="er-progress">
                Progress (%)
              </label>
              <input
                id="er-progress"
                type="number"
                className="form-control"
                min={0}
                max={100}
                step={0.1}
                value={progressPercent}
                onChange={(e) => setProgressPercent(parseFloat(e.target.value) || 0)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="er-completion">
                Completion status
              </label>
              <select
                id="er-completion"
                className="form-select"
                value={completionStatus}
                onChange={(e) => setCompletionStatus(e.target.value)}
                disabled={submitting}
              >
                {COMPLETION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="col-12">
              <label className="form-label" htmlFor="er-notes">
                Notes <span className="text-muted fw-normal">(optional)</span>
              </label>
              <textarea
                id="er-notes"
                className="form-control"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Progress: InProgress"
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
