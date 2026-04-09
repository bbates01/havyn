import { useState, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

interface TestDescriptor {
  name: string;
  group: string;
  path: string;
}

interface TestResult {
  name: string;
  group: string;
  status: 'loading' | 'success' | 'error';
  data?: unknown;
  error?: string;
  durationMs?: number;
}

const PG = 'pageSize=5&pageIndex=1';

const tests: TestDescriptor[] = [
  { name: 'Residents', group: 'Core Data', path: `/api/Residents/AllResidents?${PG}` },
  { name: 'Supporters', group: 'Core Data', path: `/api/Supporters/AllSupporters?${PG}` },
  { name: 'Safehouses', group: 'Core Data', path: `/api/Safehouses/AllSafehouses?${PG}` },
  { name: 'Partners', group: 'Core Data', path: `/api/Partners/AllPartners?${PG}` },

  { name: 'Donations', group: 'Donations', path: `/api/Donations/AllDonations?${PG}` },

  { name: 'Appointments', group: 'Services', path: `/api/AppointmentsAndEvents/AllAppointments?${PG}` },
  { name: 'Events', group: 'Services', path: `/api/AppointmentsAndEvents/AllEvents?${PG}` },
  { name: 'Home Visitations', group: 'Services', path: `/api/HomeVisitations/AllVisitations?${PG}` },
  { name: 'Process Recordings', group: 'Services', path: `/api/ProcessRecordings/AllRecordings?${PG}` },
  { name: 'Intervention Plans', group: 'Services', path: `/api/InterventionPlans/AllPlans?${PG}` },

  { name: 'Education Records', group: 'Records', path: `/api/EducationRecords/AllRecords?${PG}` },
  { name: 'Health & Wellbeing', group: 'Records', path: `/api/HealthWellbeingRecords/AllRecords?${PG}` },
  { name: 'Incident Reports', group: 'Records', path: `/api/IncidentReports/AllIncidents?${PG}` },

  { name: 'Social Media Posts', group: 'Content', path: `/api/SocialMediaPosts/AllPosts?${PG}` },
  { name: 'Resident Predictions', group: 'Content', path: `/api/ResidentPredictions/All?${PG}` },

  { name: 'Resident Outcomes', group: 'Reports', path: '/api/Reports/ResidentOutcomes' },
  { name: 'Donation Trends', group: 'Reports', path: '/api/Reports/DonationTrends' },
  { name: 'Safehouse Comparison', group: 'Reports', path: '/api/Reports/SafehouseComparison' },
  { name: 'Services Provided', group: 'Reports', path: '/api/Reports/ServicesProvided' },
  { name: 'Public Impact', group: 'Reports', path: '/api/Reports/PublicImpact' },
];

async function callEndpoint(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

function itemCount(data: unknown): string {
  if (data == null) return '(empty)';
  if (Array.isArray(data)) return `${data.length} items`;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items))
      return `${obj.items.length} of ${obj.totalCount ?? '?'} items`;
    const keys = Object.keys(obj);
    return `object with ${keys.length} keys`;
  }
  return typeof data;
}

function statusBadge(status: TestResult['status']) {
  switch (status) {
    case 'loading':
      return 'bg-secondary';
    case 'success':
      return 'bg-success';
    case 'error':
      return 'bg-danger';
  }
}

function truncatedJson(data: unknown): string {
  const raw = JSON.stringify(data, null, 2);
  if (raw.length <= 2000) return raw;
  return raw.slice(0, 2000) + '\n... (truncated)';
}

export default function ApiTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const runAll = useCallback(async () => {
    setRunning(true);
    setExpanded(new Set());

    const initial: TestResult[] = tests.map((t) => ({
      name: t.name,
      group: t.group,
      status: 'loading',
    }));
    setResults(initial);

    const promises = tests.map(async (t, i) => {
      const start = performance.now();
      try {
        const data = await callEndpoint(t.path);
        const durationMs = Math.round(performance.now() - start);
        setResults((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: 'success', data, durationMs };
          return next;
        });
      } catch (err) {
        const durationMs = Math.round(performance.now() - start);
        setResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
            durationMs,
          };
          return next;
        });
      }
    });

    await Promise.allSettled(promises);
    setRunning(false);
  }, []);

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const loadingCount = results.filter((r) => r.status === 'loading').length;

  const groups = [...new Set(tests.map((t) => t.group))];

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="mb-1">API Test Dashboard</h1>
          <p className="text-muted mb-0">
            Calls {tests.length} backend endpoints to verify connectivity.{' '}
            <code>{BASE_URL || '(VITE_API_URL not set)'}</code>
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={runAll} disabled={running}>
          {running ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Running...
            </>
          ) : results.length > 0 ? (
            'Re-run All'
          ) : (
            'Run All Tests'
          )}
        </button>
      </div>

      {results.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-auto">
            <div className="card text-center border-0 bg-light">
              <div className="card-body py-2 px-4">
                <div className="fs-3 fw-bold">{tests.length}</div>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
          <div className="col-auto">
            <div className="card text-center border-0 bg-light">
              <div className="card-body py-2 px-4">
                <div className="fs-3 fw-bold text-success">{successCount}</div>
                <small className="text-muted">Passed</small>
              </div>
            </div>
          </div>
          <div className="col-auto">
            <div className="card text-center border-0 bg-light">
              <div className="card-body py-2 px-4">
                <div className="fs-3 fw-bold text-danger">{errorCount}</div>
                <small className="text-muted">Failed</small>
              </div>
            </div>
          </div>
          {loadingCount > 0 && (
            <div className="col-auto">
              <div className="card text-center border-0 bg-light">
                <div className="card-body py-2 px-4">
                  <div className="fs-3 fw-bold text-secondary">{loadingCount}</div>
                  <small className="text-muted">Pending</small>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && (
        <div className="text-center py-5 text-muted">
          <p className="fs-5">Click &quot;Run All Tests&quot; to fire off every GET endpoint.</p>
        </div>
      )}

      {groups.map((group) => {
        const groupResults = results.filter((r) => r.group === group);
        if (groupResults.length === 0) return null;
        return (
          <div key={group} className="mb-4">
            <h5 className="text-muted border-bottom pb-2 mb-3">{group}</h5>
            <div className="row g-3">
              {groupResults.map((r) => {
                const desc = tests.find((t) => t.name === r.name);
                return (
                  <div key={r.name} className="col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="card-title mb-0">{r.name}</h6>
                          <span className={`badge ${statusBadge(r.status)}`}>
                            {r.status === 'loading' ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                              />
                            ) : (
                              r.status.toUpperCase()
                            )}
                          </span>
                        </div>

                        {desc && (
                          <small className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>
                            GET {desc.path}
                          </small>
                        )}

                        {r.status === 'success' && (
                          <>
                            <p className="card-text text-success mb-1">
                              {itemCount(r.data)}
                              {r.durationMs != null && (
                                <span className="text-muted ms-2">({r.durationMs}ms)</span>
                              )}
                            </p>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => toggle(r.name)}
                            >
                              {expanded.has(r.name) ? 'Hide' : 'Show'} Response
                            </button>
                            {expanded.has(r.name) && (
                              <pre
                                className="mt-2 p-2 bg-light rounded small"
                                style={{ maxHeight: 300, overflow: 'auto' }}
                              >
                                {truncatedJson(r.data)}
                              </pre>
                            )}
                          </>
                        )}

                        {r.status === 'error' && (
                          <p className="card-text text-danger mb-0">
                            {r.error}
                            {r.durationMs != null && (
                              <span className="text-muted ms-2">({r.durationMs}ms)</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
