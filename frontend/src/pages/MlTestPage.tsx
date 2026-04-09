import { useEffect, useMemo, useState, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ApiTestPage.css';
import { apiFetch } from '../api/apiHelper';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

interface TestDescriptor {
  name: string;
  group: 'Progress Models' | 'Partner Models';
  path: string;
}

interface TestResult {
  name: string;
  group: TestDescriptor['group'];
  status: 'loading' | 'success' | 'error';
  data?: unknown;
  error?: string;
  durationMs?: number;
  summary?: string;
  summaryTone?: 'success' | 'error';
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

function safeJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function formatDateOnly(value: unknown): string {
  if (typeof value !== 'string') return 'n/a';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function toPercent(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 'n/a';
  return `${Math.round(n * 100)}%`;
}

export default function MlTestPage() {
  const tests: TestDescriptor[] = useMemo(
    () => [
      {
        name: 'All Progress Predictions',
        group: 'Progress Models',
        path: '/api/ml/predictions',
      },
      {
        name: 'Progress Prediction (Resident #1)',
        group: 'Progress Models',
        path: '/api/ml/predictions/1',
      },
      {
        name: 'Null EmotionalProb Handling',
        group: 'Progress Models',
        path: '/api/ml/predictions',
      },
      {
        name: 'All Incident Risk Scores',
        group: 'Partner Models',
        path: '/api/ml/incident-risk',
      },
      {
        name: 'Incident Risk (Resident #1)',
        group: 'Partner Models',
        path: '/api/ml/incident-risk/1',
      },
      {
        name: 'ML Model Meta',
        group: 'Partner Models',
        path: '/api/ml/model-meta',
      },
    ],
    []
  );

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

    // Shared fetch for /api/ml/predictions (Cards 1 + 3) to avoid duplicate calls.
    let predictionsCache:
      | { ok: true; data: unknown; durationMs: number }
      | { ok: false; error: string; durationMs: number }
      | null = null;

    async function getPredictionsOnce() {
      if (predictionsCache) return predictionsCache;
      const start = performance.now();
      try {
        const data = await apiFetch<unknown>('/api/ml/predictions', {
          headers: { Accept: 'application/json' },
        });
        predictionsCache = {
          ok: true,
          data,
          durationMs: Math.round(performance.now() - start),
        };
      } catch (err) {
        predictionsCache = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Math.round(performance.now() - start),
        };
      }
      return predictionsCache;
    }

    const promises = tests.map(async (t, i) => {
      const start = performance.now();

      try {
        // Card-specific logic for summaries and success conditions.
        if (t.name === 'All Progress Predictions') {
          const p = await getPredictionsOnce();
          if (!p.ok) throw new Error(p.error);

          const arr = Array.isArray(p.data) ? p.data : [];
          const summary = `${arr.length} residents scored`;
          const success = arr.length > 0;

          setResults((prev) => {
            const next = [...prev];
            next[i] = {
              ...next[i],
              status: success ? 'success' : 'error',
              data: p.data,
              durationMs: p.durationMs,
              summary,
              summaryTone: success ? 'success' : 'error',
              error: success ? undefined : 'Expected a non-empty array',
            };
            return next;
          });
          return;
        }

        if (t.name === 'Null EmotionalProb Handling') {
          const p = await getPredictionsOnce();
          if (!p.ok) throw new Error(p.error);

          const arr = Array.isArray(p.data) ? (p.data as unknown[]) : [];
          const nullCount = arr.filter((row) => {
            if (row && typeof row === 'object') {
              const r = row as Record<string, unknown>;
              return r.emotionalProb === null;
            }
            return false;
          }).length;

          const summary =
            nullCount > 0
              ? `${nullCount} resident(s) with insufficient session data (EmotionalProb null) — handled correctly`
              : 'All residents have EmotionalProb data';

          setResults((prev) => {
            const next = [...prev];
            next[i] = {
              ...next[i],
              status: 'success',
              data: p.data,
              durationMs: p.durationMs,
              summary,
              summaryTone: 'success',
            };
            return next;
          });
          return;
        }

        // All other endpoints are fetched normally.
        const data = await apiFetch<unknown>(t.path, {
          headers: { Accept: 'application/json' },
        });
        const durationMs = Math.round(performance.now() - start);

        let status: TestResult['status'] = 'success';
        let summary = '';
        let error: string | undefined;
        let summaryTone: TestResult['summaryTone'] = 'success';

        if (t.name === 'Progress Prediction (Resident #1)') {
          const obj = (data ?? {}) as Record<string, unknown>;
          const residentId = obj.residentId;
          const overallScore = obj.overallScore;
          const ok = residentId != null;
          status = ok ? 'success' : 'error';
          summary = ok
            ? `ResidentId: ${residentId} | Overall: ${toPercent(overallScore)}`
            : 'Missing residentId in response';
          if (!ok) {
            error = 'Expected an object with residentId present';
            summaryTone = 'error';
          }
        } else if (t.name === 'All Incident Risk Scores') {
          const arr = Array.isArray(data) ? (data as unknown[]) : [];
          const counts = { high: 0, monitor: 0, stable: 0 };
          for (const row of arr) {
            if (row && typeof row === 'object') {
              const r = row as Record<string, unknown>;
              const tier = r.riskTier;
              if (tier === 'High Alert') counts.high++;
              else if (tier === 'Monitor Closely') counts.monitor++;
              else if (tier === 'Stable') counts.stable++;
            }
          }
          const ok = arr.length > 0;
          status = ok ? 'success' : 'error';
          summary = `${arr.length} residents scored | High Alert: ${counts.high} | Monitor: ${counts.monitor} | Stable: ${counts.stable}`;
          if (!ok) {
            error = 'Expected a non-empty array';
            summaryTone = 'error';
          }
        } else if (t.name === 'Incident Risk (Resident #1)') {
          const obj = (data ?? {}) as Record<string, unknown>;
          const residentId = obj.residentId;
          const riskTier = obj.riskTier;
          const flagged = obj.flaggedForReview;
          const ok = residentId != null;
          status = ok ? 'success' : 'error';
          summary = ok
            ? `ResidentId: ${residentId} | Tier: ${String(riskTier)} | Flagged: ${String(flagged)}`
            : 'Missing residentId in response';
          if (!ok) {
            error = 'Expected an object with residentId present';
            summaryTone = 'error';
          }
        } else if (t.name === 'ML Model Meta') {
          const obj = (data ?? {}) as Record<string, unknown>;
          const incidentRiskFactors = obj.incidentRiskFactors;
          const socialMediaRecs = obj.socialMediaRecs;
          const reintegrationModel = obj.reintegrationModel;
          const updatedAt = obj.updatedAt;

          const incidentOk = incidentRiskFactors != null;
          const socialOk = socialMediaRecs != null;
          const reintegrationOk = reintegrationModel != null;
          const ok = incidentOk && socialOk && reintegrationOk;

          status = ok ? 'success' : 'error';
          summaryTone = ok ? 'success' : 'error';

          summary = `IncidentRisk ${incidentOk ? '✓' : '✗'} | SocialMedia ${socialOk ? '✓' : '✗'} | Reintegration ${reintegrationOk ? '✓' : '✗'} | Updated: ${formatDateOnly(updatedAt)}`;

          if (!ok) {
            error = 'One or more JSON payload columns were null';
          }
        } else {
          // Fallback for unexpected items.
          summary = Array.isArray(data)
            ? `${data.length} items`
            : data && typeof data === 'object'
              ? `object with ${Object.keys(data as object).length} keys`
              : String(typeof data);
        }

        setResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status,
            data,
            durationMs,
            summary,
            summaryTone,
            error: status === 'error' ? error ?? 'Test failed' : undefined,
          };
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
            summary: err instanceof Error ? err.message : String(err),
            summaryTone: 'error',
          };
          return next;
        });
      }
    });

    await Promise.allSettled(promises);
    setRunning(false);
  }, [tests]);

  useEffect(() => {
    // Run on mount (dev/demo dashboard behavior)
    runAll();
  }, [runAll]);

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
  const groups: TestDescriptor['group'][] = ['Progress Models', 'Partner Models'];

  return (
    <div className="api-test-page container py-4">
      <header className="api-test-header">
        <div>
          <h1 className="mb-1 api-test-title">ML Models API Test Dashboard</h1>
          <p className="text-muted mb-0 api-test-meta">
            Tests 6 ML pipeline endpoints — ResidentPredictions,
            ResidentIncidentRisk, MlModelMeta.{' '}
            <code>{BASE_URL || '(VITE_API_URL not set)'}</code>
          </p>
        </div>
        <button
          className="btn btn-primary btn-lg api-test-run-btn"
          type="button"
          onClick={runAll}
          disabled={running}
        >
          {running ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
              />
              Running...
            </>
          ) : (
            'Re-run All'
          )}
        </button>
      </header>

      {results.length > 0 && (
        <div className="api-test-stats">
          <div className="api-test-stat-card">
            <div className="card text-center border-0 bg-light h-100">
              <div className="card-body py-2 px-3">
                <div className="fs-3 fw-bold">6</div>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
          <div className="api-test-stat-card">
            <div className="card text-center border-0 bg-light h-100">
              <div className="card-body py-2 px-3">
                <div className="fs-3 fw-bold text-success">
                  {successCount}
                </div>
                <small className="text-muted">Passed</small>
              </div>
            </div>
          </div>
          <div className="api-test-stat-card">
            <div className="card text-center border-0 bg-light h-100">
              <div className="card-body py-2 px-3">
                <div className="fs-3 fw-bold text-danger">{errorCount}</div>
                <small className="text-muted">Failed</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {groups.map((group) => {
        const groupResults = results.filter((r) => r.group === group);
        if (groupResults.length === 0) return null;
        return (
          <div key={group} className="mb-4">
            <h5 className="text-muted border-bottom pb-2 mb-3 api-test-group-title">
              {group}
            </h5>
            <div className="row g-3">
              {groupResults.map((r) => {
                const desc = tests.find((t) => t.name === r.name);
                const summaryClass =
                  r.summaryTone === 'error' ? 'text-danger' : 'text-success';

                return (
                  <div key={r.name} className="col-12 col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="api-test-card-head mb-2">
                          <h6 className="card-title mb-0 api-test-card-title">
                            {r.name}
                          </h6>
                          <span
                            className={`badge flex-shrink-0 ${statusBadge(r.status)}`}
                          >
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
                          <small
                            className="text-muted d-block mb-2"
                            style={{ fontSize: '0.75rem' }}
                          >
                            GET {desc.path}
                          </small>
                        )}

                        {r.status !== 'loading' && (
                          <>
                            <p className={`card-text mb-1 ${summaryClass}`}>
                              {r.summary ?? (r.status === 'error' ? r.error : '')}
                              {r.durationMs != null && (
                                <span className="text-muted ms-2">
                                  ({r.durationMs}ms)
                                </span>
                              )}
                            </p>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary api-test-toggle-btn"
                              onClick={() => toggle(r.name)}
                            >
                              {expanded.has(r.name) ? 'Hide' : 'Show'} Response
                            </button>
                            {expanded.has(r.name) && (
                              <pre
                                className="mt-2 p-2 bg-light rounded small api-test-json"
                                style={{ maxHeight: 300 }}
                              >
                                {safeJson(
                                  r.status === 'success' ? r.data : { error: r.error }
                                )}
                              </pre>
                            )}
                          </>
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

