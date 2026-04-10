import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuth } from '../context/AuthContext';
import ProcessRecordingFormPanel from '../components/ProcessRecordingFormPanel';
import HomeVisitationFormPanel from '../components/HomeVisitationFormPanel';
import InterventionPlanFormPanel from '../components/InterventionPlanFormPanel';
import IncidentReportFormPanel from '../components/IncidentReportFormPanel';
import HealthWellbeingFormPanel from '../components/HealthWellbeingFormPanel';
import EducationRecordFormPanel from '../components/EducationRecordFormPanel';

type FormTypeId = 'process-recording' | 'home-visitation' | 'intervention-plan' | 'incident-report' | 'health-wellbeing' | 'education-record' | 'more-coming';

const FORM_OPTIONS: { id: FormTypeId; label: string }[] = [
  { id: 'process-recording', label: 'Process recording' },
  { id: 'home-visitation', label: 'Home visitation' },
  { id: 'intervention-plan', label: 'Intervention plan' },
  { id: 'incident-report', label: 'Incident report' },
  { id: 'health-wellbeing', label: 'Health & wellbeing' },
  { id: 'education-record', label: 'Education record' },
  { id: 'more-coming', label: 'More forms (coming soon)' },
];

export default function FormsPage() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const recordingEditId =
    location.pathname.includes('/forms/process-recording/') &&
    location.pathname.endsWith('/edit') &&
    id
      ? id
      : undefined;

  const homeVisitationEditId =
    location.pathname.includes('/forms/home-visitation/') &&
    location.pathname.endsWith('/edit') &&
    id
      ? id
      : undefined;

  const interventionPlanEditId =
    location.pathname.includes('/forms/intervention-plan/') &&
    location.pathname.endsWith('/edit') &&
    id
      ? id
      : undefined;

  const incidentReportEditId =
    location.pathname.includes('/forms/incident-report/') &&
    location.pathname.endsWith('/edit') &&
    id
      ? id
      : undefined;

  const healthWellbeingEditId =
    location.pathname.includes('/forms/health-wellbeing/') &&
    location.pathname.endsWith('/edit') &&
    id
      ? id
      : undefined;

  const educationRecordEditId =
    location.pathname.includes('/forms/education-record/') &&
    location.pathname.endsWith('/edit') &&
    id
      ? id
      : undefined;

  const editModeLocked = Boolean(recordingEditId || homeVisitationEditId || interventionPlanEditId || incidentReportEditId || healthWellbeingEditId || educationRecordEditId);

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes(
    'Admin'
  )
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/manager')) return '/manager';
    if (location.pathname.startsWith('/staff')) return '/staff';
    if (location.pathname.startsWith('/dashboard')) return '/dashboard';
    return '/admin';
  }, [location.pathname]);

  const workerCode = user?.socialWorkerCode?.trim() || '';

  const [formType, setFormType] = useState<FormTypeId>('process-recording');

  useEffect(() => {
    if (recordingEditId) setFormType('process-recording');
  }, [recordingEditId]);

  useEffect(() => {
    if (homeVisitationEditId) setFormType('home-visitation');
  }, [homeVisitationEditId]);

  useEffect(() => {
    if (interventionPlanEditId) setFormType('intervention-plan');
  }, [interventionPlanEditId]);

  useEffect(() => {
    if (incidentReportEditId) setFormType('incident-report');
  }, [incidentReportEditId]);

  useEffect(() => {
    if (healthWellbeingEditId) setFormType('health-wellbeing');
  }, [healthWellbeingEditId]);

  useEffect(() => {
    if (educationRecordEditId) setFormType('education-record');
  }, [educationRecordEditId]);

  const handleFormTypeChange = (next: FormTypeId) => {
    if (recordingEditId && next !== 'process-recording') {
      navigate(`${basePath}/forms`);
    }
    if (homeVisitationEditId && next !== 'home-visitation') {
      navigate(`${basePath}/forms`);
    }
    if (interventionPlanEditId && next !== 'intervention-plan') {
      navigate(`${basePath}/forms`);
    }
    if (incidentReportEditId && next !== 'incident-report') {
      navigate(`${basePath}/forms`);
    }
    if (healthWellbeingEditId && next !== 'health-wellbeing') {
      navigate(`${basePath}/forms`);
    }
    if (educationRecordEditId && next !== 'education-record') {
      navigate(`${basePath}/forms`);
    }
    setFormType(next);
  };

  if (authLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '60vh' }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === null) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          You do not have access to this area.{' '}
          <Link to="/donor">Return to donor home</Link>
        </div>
      </div>
    );
  }

  if (role === 'staff' && !workerCode) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          Your account has no social worker code. Ask an administrator to assign
          one before using forms.
        </div>
        <Link to={`${basePath}/caseload`} className="btn btn-outline-secondary">
          Back to caseload
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h3 mb-2">Forms</h1>
        <p className="text-muted small mb-0">
          Choose a form type, then complete the fields below.
        </p>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3 p-md-4">
          <label className="form-label fw-semibold" htmlFor="forms-type-select">
            Form type
          </label>
          <select
            id="forms-type-select"
            className="form-select form-select-lg"
            value={formType}
            onChange={(e) =>
              handleFormTypeChange(e.target.value as FormTypeId)
            }
            disabled={editModeLocked}
            aria-describedby={
              editModeLocked ? 'forms-type-edit-hint' : undefined
            }
          >
            {FORM_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {editModeLocked && (
            <p id="forms-type-edit-hint" className="form-text mb-0">
              Form type is fixed while editing a recording, visitation, or plan.
            </p>
          )}
        </div>
      </div>

      {formType === 'process-recording' && (
        <ProcessRecordingFormPanel
          basePath={basePath}
          recordingEditId={recordingEditId}
        />
      )}

      {formType === 'home-visitation' && (
        <HomeVisitationFormPanel
          basePath={basePath}
          visitationEditId={homeVisitationEditId}
        />
      )}

      {formType === 'intervention-plan' && (
        <InterventionPlanFormPanel
          basePath={basePath}
          planEditId={interventionPlanEditId}
        />
      )}

      {formType === 'incident-report' && (
        <IncidentReportFormPanel
          basePath={basePath}
          incidentEditId={incidentReportEditId}
        />
      )}

      {formType === 'health-wellbeing' && (
        <HealthWellbeingFormPanel
          basePath={basePath}
          healthRecordEditId={healthWellbeingEditId}
        />
      )}

      {formType === 'education-record' && (
        <EducationRecordFormPanel
          basePath={basePath}
          educationRecordEditId={educationRecordEditId}
        />
      )}

      {formType === 'more-coming' && (
        <div className="alert alert-secondary">
          Additional forms will appear here as they are added.
        </div>
      )}
    </div>
  );
}
