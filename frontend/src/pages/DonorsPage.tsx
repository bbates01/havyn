import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { apiFetch } from '../api/apiHelper';
import { useAuth } from '../context/AuthContext';
import type { Supporter } from '../types/Supporter';
import type { Donation } from '../types/Donation';
import type { DonationAllocation } from '../types/DonationAllocation';
import type { InKindItem } from '../types/InKindItem';
import type { Safehouse } from '../types/Safehouse';

// ─── Constants (match API / product spec) ────────────────────────────────────

const SUPPORTER_TYPES = [
  'MonetaryDonor',
  'InKindDonor',
  'Volunteer',
  'SkillsContributor',
  'SocialMediaAdvocate',
  'PartnerOrganization',
] as const;

const RELATIONSHIP_TYPES = ['Local', 'International', 'PartnerOrganization'] as const;

const RELATIONSHIP_TYPE_OPTIONS = RELATIONSHIP_TYPES.map((t) => ({ value: t, label: t }));

const ACQUISITION_CHANNELS = [
  'Website',
  'SocialMedia',
  'Event',
  'WordOfMouth',
  'PartnerReferral',
  'Church',
] as const;

const DONATION_TYPES = ['Monetary', 'InKind', 'Time', 'Skills', 'SocialMedia'] as const;

const CHANNEL_SOURCES = [
  'Campaign',
  'Event',
  'Direct',
  'SocialMedia',
  'PartnerReferral',
] as const;

const CAMPAIGN_PRESETS = [
  'Year-End Hope',
  'Back to School',
  'Summer of Safety',
  'GivingTuesday',
] as const;

const PROGRAM_AREAS = [
  'Education',
  'Wellbeing',
  'Operations',
  'Transport',
  'Maintenance',
  'Outreach',
] as const;

const ITEM_CATEGORIES = [
  'Food',
  'Supplies',
  'Clothing',
  'SchoolMaterials',
  'Hygiene',
  'Furniture',
  'Medical',
] as const;

const INTENDED_USES = ['Meals', 'Education', 'Shelter', 'Hygiene', 'Health'] as const;
const THEME_BLUE = '#4A6FA5';

const RECEIVED_CONDITIONS = ['New', 'Good', 'Fair'] as const;

const SUPPORTER_TYPE_OPTIONS = SUPPORTER_TYPES.map((t) => ({ value: t, label: t }));
const ACQUISITION_CHANNEL_OPTIONS = ACQUISITION_CHANNELS.map((t) => ({
  value: t,
  label: t,
}));
const DONATION_TYPE_OPTIONS = DONATION_TYPES.map((t) => ({ value: t, label: t }));
const CHANNEL_SOURCE_OPTIONS = CHANNEL_SOURCES.map((t) => ({ value: t, label: t }));
const CAMPAIGN_PRESET_OPTIONS = CAMPAIGN_PRESETS.map((c) => ({ value: c, label: c }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhpAmount(n: number): string {
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

function extractItems<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as { items?: T[]; Items?: T[] };
  return o.items ?? o.Items ?? (Array.isArray(raw) ? (raw as T[]) : []);
}

function extractTotalCount(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const o = raw as { totalCount?: number; TotalCount?: number };
  return o.totalCount ?? o.TotalCount ?? 0;
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function appendRepeated(
  sp: URLSearchParams,
  key: string,
  values: string[] | undefined
): void {
  if (!values?.length) return;
  for (const v of values) sp.append(key, v);
}

/** Opens on click; checkboxes inside; closes on outside click or Escape. */
function MultiCheckboxDropdown<T extends string | number>({
  label,
  selected,
  onChange,
  options,
  buttonMinWidth = 200,
}: {
  label: string;
  selected: T[];
  onChange: (next: T[]) => void;
  options: { value: T; label: string }[];
  buttonMinWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const summary =
    selected.length === 0
      ? 'All'
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? String(selected[0])
        : `${selected.length} selected`;

  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((x) => x !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div ref={rootRef} className="position-relative">
      <label htmlFor={btnId} className="form-label small mb-0">
        {label}
      </label>
      <button
        id={btnId}
        type="button"
        className="form-select form-select-sm text-start d-flex align-items-center justify-content-between gap-1 cursor-pointer"
        style={{ minWidth: buttonMinWidth }}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-truncate">{summary}</span>
        <span className="text-muted flex-shrink-0 small" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="position-absolute border rounded bg-white shadow-sm mt-1 py-2 px-2 start-0"
          style={{ zIndex: 1050, minWidth: 'max(100%, 220px)', maxHeight: 260, overflowY: 'auto' }}
          role="listbox"
        >
          {options.map((opt) => (
            <label
              key={String(opt.value)}
              className="d-flex align-items-center gap-2 small mb-0 py-1 px-1 rounded user-select-none"
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                className="form-check-input mt-0 flex-shrink-0"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function impactUnitForDonationType(t: string): string {
  switch (t) {
    case 'Monetary':
      return 'pesos';
    case 'InKind':
      return 'items';
    case 'Time':
      return 'hours';
    case 'Skills':
      return 'hours';
    case 'SocialMedia':
      return 'campaigns';
    default:
      return 'units';
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DonorsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const safehouseId = user?.safehouseId ?? null;
  const managerScoped = role === 'manager' && safehouseId != null;

  const [mainTab, setMainTab] = useState<'supporters' | 'history'>('supporters');

  const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);
  const pushAlert = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setAlerts((a) => [...a, { id, message }]);
  }, []);

  // ─── All allocations (safehouse filters) + manager donation scope ──────────
  const [allAllocations, setAllAllocations] = useState<DonationAllocation[] | null>(null);
  const [managerDonationIdSet, setManagerDonationIdSet] = useState<Set<number> | null>(
    null
  );

  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') {
      setAllAllocations(null);
      setManagerDonationIdSet(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const all = await apiFetch<DonationAllocation[]>('/api/DonationAllocations/All');
        if (cancelled) return;
        setAllAllocations(all);
        if (role === 'manager' && safehouseId != null) {
          const ids = new Set<number>();
          for (const a of all) {
            if (a.safehouseId === safehouseId) ids.add(a.donationId);
          }
          setManagerDonationIdSet(ids);
        } else {
          setManagerDonationIdSet(null);
        }
      } catch (e) {
        if (!cancelled) {
          pushAlert(e instanceof Error ? e.message : 'Failed to load allocations.');
          setAllAllocations([]);
          setManagerDonationIdSet(role === 'manager' ? new Set() : null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, safehouseId, pushAlert]);

  // ─── Tab 1: Supporters ────────────────────────────────────────────────────

  const [supporterTypesSel, setSupporterTypesSel] = useState<string[]>([]);
  const [relationshipTypesSel, setRelationshipTypesSel] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [regionSearch, setRegionSearch] = useState('');
  const [acquisitionChannelsSel, setAcquisitionChannelsSel] = useState<string[]>([]);
  const [supSafehouseIds, setSupSafehouseIds] = useState<number[]>([]);
  const effectiveSupSafehouseIds = useMemo(() => {
    if (managerScoped && safehouseId != null) return [safehouseId];
    return supSafehouseIds;
  }, [managerScoped, safehouseId, supSafehouseIds]);
  const [supShEligibleIds, setSupShEligibleIds] = useState<Set<number> | null>(null);
  const [supShEligibleLoading, setSupShEligibleLoading] = useState(false);

  const [supSortBy, setSupSortBy] = useState<
    'DisplayName' | 'FirstDonationDate' | 'Status'
  >('DisplayName');
  const [supSortOrder, setSupSortOrder] = useState<'asc' | 'desc'>('asc');
  const [supPageIndex, setSupPageIndex] = useState(1);
  const [supReloadToken, setSupReloadToken] = useState(0);

  const [supportersRows, setSupportersRows] = useState<Supporter[]>([]);
  const [supportersTotal, setSupportersTotal] = useState(0);
  const [supportersLoading, setSupportersLoading] = useState(false);
  const [regionFilteredBulk, setRegionFilteredBulk] = useState<Supporter[] | null>(
    null
  );

  const regionTrim = regionSearch.trim();
  const useSupBulk =
    regionTrim !== '' ||
    effectiveSupSafehouseIds.length > 0 ||
    acquisitionChannelsSel.length > 1;

  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;
    if (effectiveSupSafehouseIds.length === 0) {
      setSupShEligibleIds(null);
      setSupShEligibleLoading(false);
      return;
    }
    if (allAllocations === null) {
      setSupShEligibleLoading(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setSupShEligibleLoading(true);
      setSupShEligibleIds(null);
      const needDids = new Set<number>();
      for (const a of allAllocations) {
        if (effectiveSupSafehouseIds.includes(a.safehouseId)) needDids.add(a.donationId);
      }
      const map = new Map<number, number>();
      let page = 1;
      const pageSize = 100;
      let tc = Infinity;
      try {
        while (
          !cancelled &&
          (page - 1) * pageSize < tc &&
          map.size < needDids.size
        ) {
          const raw = await apiFetch<unknown>(
            `/api/Donations/AllDonations?pageSize=${pageSize}&pageIndex=${page}&sortBy=DonationDate&sortOrder=desc`
          );
          const items = extractItems<Donation>(raw);
          tc = extractTotalCount(raw);
          for (const d of items) {
            if (needDids.has(d.donationId)) map.set(d.donationId, d.supporterId);
          }
          if (items.length < pageSize) break;
          page++;
        }
        if (!cancelled) setSupShEligibleIds(new Set(map.values()));
      } catch (e) {
        if (!cancelled) {
          pushAlert(e instanceof Error ? e.message : 'Failed to map donations to donors.');
          setSupShEligibleIds(new Set());
        }
      } finally {
        if (!cancelled) setSupShEligibleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, effectiveSupSafehouseIds, allAllocations, pushAlert]);

  const buildSupportersQuery = useCallback(
    (pageSize: number, pageIndex: number) => {
      const sp = new URLSearchParams();
      sp.set('pageSize', String(pageSize));
      sp.set('pageIndex', String(pageIndex));
      sp.set('sortBy', supSortBy);
      sp.set('sortOrder', supSortOrder);
      if (supporterTypesSel.length > 0) appendRepeated(sp, 'supporterTypes', supporterTypesSel);
      if (relationshipTypesSel.length > 0) {
        appendRepeated(sp, 'relationshipTypes', relationshipTypesSel);
      }
      if (statusFilter !== 'all') appendRepeated(sp, 'statuses', [statusFilter]);
      if (acquisitionChannelsSel.length === 1) {
        sp.set('acquisitionChannel', acquisitionChannelsSel[0]);
      }
      return `/api/Supporters/AllSupporters?${sp.toString()}`;
    },
    [
      supporterTypesSel,
      relationshipTypesSel,
      statusFilter,
      acquisitionChannelsSel,
      supSortBy,
      supSortOrder,
    ]
  );

  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;
    if (
      effectiveSupSafehouseIds.length > 0 &&
      (supShEligibleLoading || supShEligibleIds === null)
    ) {
      setSupportersLoading(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setSupportersLoading(true);
      try {
        if (!useSupBulk) {
          const raw = await apiFetch<unknown>(buildSupportersQuery(25, supPageIndex));
          if (cancelled) return;
          setSupportersRows(extractItems<Supporter>(raw));
          setSupportersTotal(extractTotalCount(raw));
          setRegionFilteredBulk(null);
        } else {
          const raw = await apiFetch<unknown>(buildSupportersQuery(500, 1));
          if (cancelled) return;
          let items = extractItems<Supporter>(raw);
          if (regionTrim) {
            items = items.filter((s) =>
              (s.region ?? '').toLowerCase().includes(regionTrim.toLowerCase())
            );
          }
          if (effectiveSupSafehouseIds.length > 0 && supShEligibleIds) {
            items = items.filter((s) => supShEligibleIds.has(s.supporterId));
          }
          if (acquisitionChannelsSel.length > 1) {
            items = items.filter((s) =>
              acquisitionChannelsSel.includes(s.acquisitionChannel)
            );
          }
          setRegionFilteredBulk(items);
          setSupportersTotal(items.length);
          const start = (supPageIndex - 1) * 25;
          setSupportersRows(items.slice(start, start + 25));
        }
      } catch (e) {
        if (!cancelled) {
          pushAlert(e instanceof Error ? e.message : 'Failed to load supporters.');
          setSupportersRows([]);
          setSupportersTotal(0);
        }
      } finally {
        if (!cancelled) setSupportersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    role,
    buildSupportersQuery,
    supPageIndex,
    regionTrim,
    useSupBulk,
    effectiveSupSafehouseIds,
    supShEligibleIds,
    supShEligibleLoading,
    supporterTypesSel,
    relationshipTypesSel,
    statusFilter,
    acquisitionChannelsSel,
    supSortBy,
    supSortOrder,
    supReloadToken,
  ]);

  useEffect(() => {
    if (!useSupBulk || !regionFilteredBulk) return;
    const start = (supPageIndex - 1) * 25;
    setSupportersRows(regionFilteredBulk.slice(start, start + 25));
  }, [useSupBulk, regionFilteredBulk, supPageIndex]);

  const [selectedSupporterId, setSelectedSupporterId] = useState<number | null>(null);

  // ─── Tab 2: Donation history ───────────────────────────────────────────────

  const [supporterNameMap, setSupporterNameMap] = useState<Map<number, string>>(
    () => new Map()
  );

  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;
    if (mainTab !== 'history') return;
    let cancelled = false;
    (async () => {
      const map = new Map<number, string>();
      let page = 1;
      try {
        while (!cancelled) {
          const raw = await apiFetch<unknown>(
            `/api/Supporters/AllSupporters?pageSize=100&pageIndex=${page}&sortBy=DisplayName&sortOrder=asc`
          );
          const items = extractItems<Supporter>(raw);
          const tc = extractTotalCount(raw);
          for (const s of items) map.set(s.supporterId, s.displayName);
          if (items.length === 0 || page * 100 >= tc) break;
          page++;
        }
        if (!cancelled) setSupporterNameMap(map);
      } catch {
        if (!cancelled) pushAlert('Failed to load supporter names for lookup.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, mainTab, pushAlert]);

  const [histDonationTypesSel, setHistDonationTypesSel] = useState<string[]>([]);
  const [histCampaignMode, setHistCampaignMode] = useState<'preset' | 'custom'>('preset');
  const [histCampaignPresetsSel, setHistCampaignPresetsSel] = useState<string[]>([]);
  const [histCampaignCustom, setHistCampaignCustom] = useState('');
  const [histChannelsSel, setHistChannelsSel] = useState<string[]>([]);
  const [histRecurring, setHistRecurring] = useState<'all' | 'yes' | 'no'>('all');
  const [histStartDate, setHistStartDate] = useState('');
  const [histEndDate, setHistEndDate] = useState('');
  const [histSupporterSearch, setHistSupporterSearch] = useState('');
  const [histSafehouseIds, setHistSafehouseIds] = useState<number[]>([]);
  const [histSortBy, setHistSortBy] = useState<
    'DonationDate' | 'Amount' | 'SupporterName'
  >('DonationDate');
  const [histSortOrder, setHistSortOrder] = useState<'asc' | 'desc'>('desc');
  const [histPageIndex, setHistPageIndex] = useState(1);

  const [donationsRows, setDonationsRows] = useState<Donation[]>([]);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [histClientList, setHistClientList] = useState<Donation[] | null>(null);

  const histDonationIdsForSafehouse = useMemo(() => {
    if (histSafehouseIds.length === 0 || allAllocations === null) return null;
    const s = new Set<number>();
    for (const a of allAllocations) {
      if (histSafehouseIds.includes(a.safehouseId)) s.add(a.donationId);
    }
    return s;
  }, [histSafehouseIds, allAllocations]);

  const useClientDonationMode =
    role === 'manager' ||
    histSupporterSearch.trim() !== '' ||
    histSortBy === 'SupporterName' ||
    histSafehouseIds.length > 0 ||
    (histCampaignMode === 'preset' && histCampaignPresetsSel.length > 1) ||
    histChannelsSel.length > 1;

  const buildDonationsUrl = useCallback(
    (pageSize: number, pageIndex: number) => {
      const sp = new URLSearchParams();
      sp.set('pageSize', String(pageSize));
      sp.set('pageIndex', String(pageIndex));
      const serverSort =
        histSortBy === 'SupporterName' ? 'DonationDate' : histSortBy;
      sp.set('sortBy', serverSort);
      sp.set('sortOrder', histSortOrder);
      if (histDonationTypesSel.length > 0) {
        appendRepeated(sp, 'donationTypes', histDonationTypesSel);
      }
      if (histCampaignMode === 'custom' && histCampaignCustom.trim()) {
        sp.set('campaignName', histCampaignCustom.trim());
      }
      if (histCampaignMode === 'preset' && histCampaignPresetsSel.length === 1) {
        sp.set('campaignName', histCampaignPresetsSel[0]);
      }
      if (histChannelsSel.length === 1) {
        sp.set('channelSource', histChannelsSel[0]);
      }
      if (histRecurring === 'yes') sp.set('isRecurring', 'true');
      if (histRecurring === 'no') sp.set('isRecurring', 'false');
      if (histStartDate) sp.set('startDate', histStartDate);
      if (histEndDate) sp.set('endDate', histEndDate);
      return `/api/Donations/AllDonations?${sp.toString()}`;
    },
    [
      histSortBy,
      histSortOrder,
      histDonationTypesSel,
      histCampaignMode,
      histCampaignCustom,
      histCampaignPresetsSel,
      histChannelsSel,
      histRecurring,
      histStartDate,
      histEndDate,
    ]
  );

  const loadClientDonationList = useCallback(async () => {
    const acc: Donation[] = [];
    let page = 1;
    const pageSize = 100;
    let tc = Infinity;
    while (acc.length < 5000 && (page - 1) * pageSize < tc) {
      const raw = await apiFetch<unknown>(buildDonationsUrl(pageSize, page));
      const items = extractItems<Donation>(raw);
      tc = extractTotalCount(raw);
      acc.push(...items);
      if (items.length < pageSize) break;
      page++;
    }
    return acc;
  }, [buildDonationsUrl]);

  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;
    if (mainTab !== 'history') return;
    if (managerDonationIdSet === null && role === 'manager') return;
    if (histSafehouseIds.length > 0 && allAllocations === null) {
      setDonationsLoading(true);
      return;
    }

    let cancelled = false;
    (async () => {
      setDonationsLoading(true);
      try {
        if (useClientDonationMode) {
          const all = await loadClientDonationList();
          if (cancelled) return;
          let list = all;
          if (role === 'manager' && managerDonationIdSet) {
            list = list.filter((d) => managerDonationIdSet.has(d.donationId));
          }
          if (histDonationIdsForSafehouse != null) {
            list = list.filter((d) => histDonationIdsForSafehouse.has(d.donationId));
          }
          if (histCampaignMode === 'preset' && histCampaignPresetsSel.length > 1) {
            const cset = new Set(histCampaignPresetsSel);
            list = list.filter(
              (d) => d.campaignName != null && cset.has(d.campaignName)
            );
          }
          if (histChannelsSel.length > 1) {
            list = list.filter((d) => histChannelsSel.includes(d.channelSource));
          }
          const q = histSupporterSearch.trim().toLowerCase();
          if (q) {
            const matchIds = new Set<number>();
            for (const [id, name] of supporterNameMap) {
              if (name.toLowerCase().includes(q)) matchIds.add(id);
            }
            list = list.filter((d) => matchIds.has(d.supporterId));
          }
          list = [...list];
          list.sort((a, b) => {
            let c = 0;
            if (histSortBy === 'SupporterName') {
              const na = supporterNameMap.get(a.supporterId) ?? '';
              const nb = supporterNameMap.get(b.supporterId) ?? '';
              c = na.localeCompare(nb, undefined, { sensitivity: 'base' });
            } else if (histSortBy === 'Amount') {
              const va = Number(a.amount ?? a.estimatedValue ?? 0);
              const vb = Number(b.amount ?? b.estimatedValue ?? 0);
              c = va - vb;
            } else {
              const da = new Date(String(a.donationDate)).getTime();
              const db = new Date(String(b.donationDate)).getTime();
              c = da - db;
            }
            return histSortOrder === 'asc' ? c : -c;
          });
          setHistClientList(list);
          setDonationsTotal(list.length);
          const start = (histPageIndex - 1) * 25;
          setDonationsRows(list.slice(start, start + 25));
        } else {
          const raw = await apiFetch<unknown>(buildDonationsUrl(25, histPageIndex));
          if (cancelled) return;
          const items = extractItems<Donation>(raw);
          setHistClientList(null);
          setDonationsRows(items);
          setDonationsTotal(extractTotalCount(raw));
        }
      } catch (e) {
        if (!cancelled) {
          pushAlert(e instanceof Error ? e.message : 'Failed to load donations.');
          setDonationsRows([]);
          setDonationsTotal(0);
        }
      } finally {
        if (!cancelled) setDonationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    role,
    mainTab,
    buildDonationsUrl,
    histPageIndex,
    useClientDonationMode,
    loadClientDonationList,
    managerDonationIdSet,
    histSupporterSearch,
    supporterNameMap,
    histSortBy,
    histSortOrder,
    pushAlert,
    histSafehouseIds,
    histDonationIdsForSafehouse,
    allAllocations,
    histCampaignMode,
    histCampaignPresetsSel,
    histChannelsSel,
  ]);

  useEffect(() => {
    if (!useClientDonationMode || !histClientList) return;
    const start = (histPageIndex - 1) * 25;
    setDonationsRows(histClientList.slice(start, start + 25));
  }, [useClientDonationMode, histClientList, histPageIndex]);

  const [detailDonationId, setDetailDonationId] = useState<number | null>(null);

  const [allSafehouses, setAllSafehouses] = useState<Safehouse[]>([]);

  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;
    let cancelled = false;
    (async () => {
      const acc: Safehouse[] = [];
      let page = 1;
      try {
        while (!cancelled) {
          const raw = await apiFetch<unknown>(
            `/api/Safehouses/AllSafehouses?pageSize=20&pageIndex=${page}`
          );
          const items = extractItems<Safehouse>(raw);
          const tc = extractTotalCount(raw);
          acc.push(...items);
          if (items.length === 0 || acc.length >= tc) break;
          page++;
        }
        if (!cancelled) setAllSafehouses(acc);
      } catch {
        if (!cancelled) pushAlert('Failed to load safehouses.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, pushAlert]);

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordSupporterId, setRecordSupporterId] = useState<number | null>(null);
  const [rdType, setRdType] = useState<string>('Monetary');
  const [rdDate, setRdDate] = useState(() => formatDateYMD(new Date()));
  const [rdRecurring, setRdRecurring] = useState(false);
  const [rdCampaignMode, setRdCampaignMode] = useState<'preset' | 'custom'>('preset');
  const [rdCampaignPreset, setRdCampaignPreset] = useState<string>(CAMPAIGN_PRESETS[0]);
  const [rdCampaignCustom, setRdCampaignCustom] = useState('');
  const [rdChannel, setRdChannel] = useState('Campaign');
  const [rdAmount, setRdAmount] = useState('');
  const [rdEstimated, setRdEstimated] = useState('');
  const [rdNotes, setRdNotes] = useState('');
  const [rdSaving, setRdSaving] = useState(false);
  const [postedDonation, setPostedDonation] = useState<Donation | null>(null);
  const [allocPostedSum, setAllocPostedSum] = useState(0);

  const resetRecordDonationForm = () => {
    setRdType('Monetary');
    setRdDate(formatDateYMD(new Date()));
    setRdRecurring(false);
    setRdCampaignMode('preset');
    setRdCampaignPreset(CAMPAIGN_PRESETS[0]);
    setRdCampaignCustom('');
    setRdChannel('Campaign');
    setRdAmount('');
    setRdEstimated('');
    setRdNotes('');
    setPostedDonation(null);
    setAllocPostedSum(0);
  };

  const openRecordDonation = (supporterId: number) => {
    setRecordSupporterId(supporterId);
    resetRecordDonationForm();
    setAllocSafehouseId(managerScoped && safehouseId != null ? safehouseId : '');
    setRecordModalOpen(true);
  };

  const rdCampaignFinal = useMemo(() => {
    if (rdCampaignMode === 'custom') return rdCampaignCustom.trim() || null;
    return rdCampaignPreset || null;
  }, [rdCampaignMode, rdCampaignCustom, rdCampaignPreset]);

  const submitRecordDonation = async () => {
    if (recordSupporterId == null) return;
    if (!rdChannel.trim()) {
      pushAlert('Channel source is required.');
      return;
    }
    const est = parseFloat(rdEstimated);
    const amt = parseFloat(rdAmount);
    if (rdType === 'Monetary') {
      if (!Number.isFinite(amt) || amt <= 0) {
        pushAlert('Amount is required for monetary donations.');
        return;
      }
    } else {
      if (!Number.isFinite(est) || est <= 0) {
        pushAlert('Estimated value is required for non-monetary donations.');
        return;
      }
    }
    setRdSaving(true);
    try {
      const body: Record<string, unknown> = {
        supporterId: recordSupporterId,
        donationType: rdType,
        donationDate: rdDate,
        isRecurring: rdRecurring,
        campaignName: rdCampaignFinal,
        channelSource: rdChannel,
        currencyCode: rdType === 'Monetary' ? 'PHP' : null,
        amount: rdType === 'Monetary' ? amt : null,
        estimatedValue: rdType === 'Monetary' ? amt : est,
        impactUnit: impactUnitForDonationType(rdType),
        notes: rdNotes.trim() || null,
      };
      const created = await apiFetch<Donation>('/api/Donations/AddDonation', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setPostedDonation(created);
      setAllocPostedSum(0);
      pushAlert('Donation recorded.');
      setSupReloadToken((t) => t + 1);
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Failed to record donation.');
    } finally {
      setRdSaving(false);
    }
  };

  const closeRecordModal = () => {
    setRecordModalOpen(false);
    setRecordSupporterId(null);
    resetRecordDonationForm();
    setAllocSafehouseId('');
  };

  const [allocSafehouseId, setAllocSafehouseId] = useState<number | ''>('');
  const [allocProgramArea, setAllocProgramArea] = useState<string>(PROGRAM_AREAS[0]);
  const [allocAmountIn, setAllocAmountIn] = useState('');
  const [allocDateStr, setAllocDateStr] = useState(() => formatDateYMD(new Date()));
  const [allocPosting, setAllocPosting] = useState(false);

  const [ikName, setIkName] = useState('');
  const [ikCategory, setIkCategory] = useState<string>(ITEM_CATEGORIES[0]);
  const [ikQty, setIkQty] = useState('1');
  const [ikUom, setIkUom] = useState('unit');
  const [ikUnitVal, setIkUnitVal] = useState('');
  const [ikUse, setIkUse] = useState<string>(INTENDED_USES[0]);
  const [ikCond, setIkCond] = useState<string>(RECEIVED_CONDITIONS[0]);
  const [ikPosting, setIkPosting] = useState(false);

  const postAllocation = async () => {
    if (!postedDonation) return;
    const sid =
      typeof allocSafehouseId === 'number' ? allocSafehouseId : Number(allocSafehouseId);
    if (!Number.isFinite(sid) || sid <= 0) {
      pushAlert('Select a safehouse.');
      return;
    }
    const a = parseFloat(allocAmountIn);
    if (!Number.isFinite(a) || a <= 0) {
      pushAlert('Enter a valid allocation amount.');
      return;
    }
    setAllocPosting(true);
    try {
      await apiFetch<DonationAllocation>('/api/DonationAllocations/AddAllocation', {
        method: 'POST',
        body: JSON.stringify({
          donationId: postedDonation.donationId,
          safehouseId: sid,
          programArea: allocProgramArea,
          amountAllocated: a,
          allocationDate: allocDateStr,
          allocationNotes: null,
        }),
      });
      setAllocPostedSum((s) => s + a);
      setAllocAmountIn('');
      pushAlert('Allocation saved.');
      setSupReloadToken((t) => t + 1);
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Allocation failed.');
    } finally {
      setAllocPosting(false);
    }
  };

  const postInKindItem = async () => {
    if (!postedDonation) return;
    const v = parseFloat(ikUnitVal);
    const q = parseInt(ikQty, 10);
    if (!ikName.trim()) {
      pushAlert('Item name is required.');
      return;
    }
    if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(q) || q <= 0) {
      pushAlert('Valid quantity and estimated unit value are required.');
      return;
    }
    setIkPosting(true);
    try {
      await apiFetch<InKindItem>('/api/InKindDonationItems/AddItem', {
        method: 'POST',
        body: JSON.stringify({
          donationId: postedDonation.donationId,
          itemName: ikName.trim(),
          itemCategory: ikCategory,
          quantity: q,
          unitOfMeasure: ikUom.trim() || 'unit',
          estimatedUnitValue: v,
          intendedUse: ikUse,
          receivedCondition: ikCond,
        }),
      });
      setIkName('');
      setIkQty('1');
      setIkUnitVal('');
      pushAlert('Item saved.');
      setSupReloadToken((t) => t + 1);
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Failed to save item.');
    } finally {
      setIkPosting(false);
    }
  };

  const monetaryTotal = postedDonation?.amount != null ? Number(postedDonation.amount) : 0;

  const safehousesForSelect = useMemo(
    () =>
      [...allSafehouses].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [allSafehouses]
  );

  const safehouseDropdownOptions = useMemo(
    () =>
      safehousesForSelect.map((sh) => ({
        value: sh.safehouseId,
        label: `${sh.name}${sh.city ? ` · ${sh.city}` : ''}`,
      })),
    [safehousesForSelect]
  );

  const safehousesForAllocationSelect = useMemo(() => {
    if (managerScoped && safehouseId != null) {
      return allSafehouses.filter((s) => s.safehouseId === safehouseId);
    }
    return allSafehouses;
  }, [managerScoped, safehouseId, allSafehouses]);

  const supTotalPages = Math.max(1, Math.ceil(supportersTotal / 25));
  const histTotalPages = Math.max(1, Math.ceil(donationsTotal / 25));

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'admin' && role !== 'manager') {
    return <Navigate to="/staff" replace />;
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {alerts.map((a) => (
        <div key={a.id} className="alert alert-warning alert-dismissible" role="alert">
          {a.message}
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss"
            onClick={() => setAlerts((x) => x.filter((y) => y.id !== a.id))}
          />
        </div>
      ))}

      <h1 className="h3 fw-bold mb-3">Donor Info</h1>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className="nav-link"
            style={
              mainTab === 'supporters'
                ? { backgroundColor: THEME_BLUE, borderColor: THEME_BLUE, color: '#fff' }
                : { color: THEME_BLUE }
            }
            onClick={() => setMainTab('supporters')}
          >
            Donors
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className="nav-link"
            style={
              mainTab === 'history'
                ? { backgroundColor: THEME_BLUE, borderColor: THEME_BLUE, color: '#fff' }
                : { color: THEME_BLUE }
            }
            onClick={() => setMainTab('history')}
          >
            Donation History
          </button>
        </li>
      </ul>

      {mainTab === 'supporters' && (
        <div>
          <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
            {!managerScoped ? (
              <MultiCheckboxDropdown
                label="Safehouses"
                selected={supSafehouseIds}
                onChange={(next) => {
                  setSupSafehouseIds(next.sort((a, b) => a - b));
                  setSupPageIndex(1);
                }}
                options={safehouseDropdownOptions}
              />
            ) : null}
            <MultiCheckboxDropdown
              label="Supporter type"
              selected={supporterTypesSel}
              onChange={(next) => {
                setSupporterTypesSel(next.sort((a, b) => a.localeCompare(b)));
                setSupPageIndex(1);
              }}
              options={SUPPORTER_TYPE_OPTIONS}
            />
            <MultiCheckboxDropdown
              label="Relationship"
              selected={relationshipTypesSel}
              onChange={(next) => {
                setRelationshipTypesSel(next.sort((a, b) => a.localeCompare(b)));
                setSupPageIndex(1);
              }}
              options={RELATIONSHIP_TYPE_OPTIONS}
            />
            <div>
              <label className="form-label small mb-0">Status</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive');
                  setSupPageIndex(1);
                }}
              >
                <option value="all">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="form-label small mb-0">Region contains</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={regionSearch}
                onChange={(e) => {
                  setRegionSearch(e.target.value);
                  setSupPageIndex(1);
                }}
                placeholder="Search…"
              />
            </div>
            <MultiCheckboxDropdown
              label="Acquisition channel"
              selected={acquisitionChannelsSel}
              onChange={(next) => {
                setAcquisitionChannelsSel(next.sort((a, b) => a.localeCompare(b)));
                setSupPageIndex(1);
              }}
              options={ACQUISITION_CHANNEL_OPTIONS}
            />
            <div>
              <label className="form-label small mb-0">Sort</label>
              <select
                className="form-select form-select-sm"
                value={supSortBy}
                onChange={(e) => {
                  setSupSortBy(e.target.value as typeof supSortBy);
                  setSupPageIndex(1);
                }}
              >
                <option value="DisplayName">Display name</option>
                <option value="FirstDonationDate">First donation date</option>
                <option value="Status">Status</option>
              </select>
            </div>
            <div>
              <label className="form-label small mb-0">Order</label>
              <select
                className="form-select form-select-sm"
                value={supSortOrder}
                onChange={(e) => {
                  setSupSortOrder(e.target.value as 'asc' | 'desc');
                  setSupPageIndex(1);
                }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {supportersLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
            </div>
          ) : (
            <div className="table-responsive shadow-sm rounded border p-3 p-md-4">
              <table className="table table-hover table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Display name</th>
                    <th>Type</th>
                    <th>Relationship</th>
                    <th>Region</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>First donation</th>
                    <th>Acquisition</th>
                  </tr>
                </thead>
                <tbody>
                  {supportersRows.map((s) => (
                    <tr
                      key={s.supporterId}
                      role="button"
                      className="cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedSupporterId(s.supporterId)}
                    >
                      <td className="fw-semibold">{s.displayName}</td>
                      <td>{s.supporterType}</td>
                      <td>{s.relationshipType}</td>
                      <td>{s.region}</td>
                      <td>{s.country}</td>
                      <td>
                        <span
                          className={`badge ${s.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td>{s.firstDonationDate ?? '—'}</td>
                      <td>{s.acquisitionChannel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {supportersTotal} total · page {supPageIndex} of {supTotalPages}
            </span>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={supPageIndex <= 1}
                onClick={() => setSupPageIndex((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={supPageIndex >= supTotalPages}
                onClick={() => setSupPageIndex((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {mainTab === 'history' && (
        <div>
          {managerScoped && (
            <p className="text-muted small">
              Donors and donations are limited to your safehouse (allocations to this location).
            </p>
          )}
          <div className="d-flex flex-wrap gap-3 align-items-end mb-2">
            {!managerScoped ? (
              <MultiCheckboxDropdown
                label="Safehouses"
                selected={histSafehouseIds}
                onChange={(next) => {
                  setHistSafehouseIds(next.sort((a, b) => a - b));
                  setHistPageIndex(1);
                }}
                options={safehouseDropdownOptions}
              />
            ) : null}
            <div>
              <label className="form-label small mb-0">Supporter search</label>
              <input
                className="form-control form-control-sm"
                style={{ minWidth: 180 }}
                value={histSupporterSearch}
                onChange={(e) => {
                  setHistSupporterSearch(e.target.value);
                  setHistPageIndex(1);
                }}
                placeholder="Name contains…"
              />
            </div>
            <MultiCheckboxDropdown
              label="Donation type"
              selected={histDonationTypesSel}
              onChange={(next) => {
                setHistDonationTypesSel(next.sort((a, b) => a.localeCompare(b)));
                setHistPageIndex(1);
              }}
              options={DONATION_TYPE_OPTIONS}
            />
            <div className="d-flex flex-wrap gap-3 align-items-end">
              <div>
                <label className="form-label small mb-0">Campaign</label>
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: 140 }}
                  value={histCampaignMode}
                  onChange={(e) => {
                    const m = e.target.value as 'preset' | 'custom';
                    setHistCampaignMode(m);
                    if (m === 'custom') setHistCampaignPresetsSel([]);
                    if (m === 'preset') setHistCampaignCustom('');
                    setHistPageIndex(1);
                  }}
                >
                  <option value="preset">Preset (multi)</option>
                  <option value="custom">Custom text</option>
                </select>
              </div>
              {histCampaignMode === 'preset' ? (
                <MultiCheckboxDropdown
                  label="Preset campaigns"
                  selected={histCampaignPresetsSel}
                  onChange={(next) => {
                    setHistCampaignPresetsSel(next.sort((a, b) => a.localeCompare(b)));
                    setHistPageIndex(1);
                  }}
                  options={CAMPAIGN_PRESET_OPTIONS}
                />
              ) : (
                <div>
                  <label className="form-label small mb-0">Exact name</label>
                  <input
                    className="form-control form-control-sm"
                    style={{ minWidth: 200 }}
                    value={histCampaignCustom}
                    onChange={(e) => {
                      setHistCampaignCustom(e.target.value);
                      setHistPageIndex(1);
                    }}
                    placeholder="Exact campaign name"
                  />
                </div>
              )}
            </div>
            <MultiCheckboxDropdown
              label="Channel"
              selected={histChannelsSel}
              onChange={(next) => {
                setHistChannelsSel(next.sort((a, b) => a.localeCompare(b)));
                setHistPageIndex(1);
              }}
              options={CHANNEL_SOURCE_OPTIONS}
            />
          </div>
          <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
            <div>
              <label className="form-label small mb-0">Recurring</label>
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 120 }}
                value={histRecurring}
                onChange={(e) => {
                  setHistRecurring(e.target.value as 'all' | 'yes' | 'no');
                  setHistPageIndex(1);
                }}
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="form-label small mb-0">Start date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={histStartDate}
                onChange={(e) => {
                  setHistStartDate(e.target.value);
                  setHistPageIndex(1);
                }}
              />
            </div>
            <div>
              <label className="form-label small mb-0">End date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={histEndDate}
                onChange={(e) => {
                  setHistEndDate(e.target.value);
                  setHistPageIndex(1);
                }}
              />
            </div>
            <div>
              <label className="form-label small mb-0">Sort by</label>
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 220 }}
                value={histSortBy}
                onChange={(e) => {
                  setHistSortBy(e.target.value as typeof histSortBy);
                  setHistPageIndex(1);
                }}
              >
                <option value="DonationDate">Date</option>
                <option value="Amount">Amount</option>
                <option value="SupporterName">Supporter name (this page / client)</option>
              </select>
            </div>
            <div>
              <label className="form-label small mb-0">Order</label>
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 130 }}
                value={histSortOrder}
                onChange={(e) => {
                  setHistSortOrder(e.target.value as 'asc' | 'desc');
                  setHistPageIndex(1);
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {donationsLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
            </div>
          ) : (
            <div className="table-responsive shadow-sm rounded border p-3 p-md-4">
              <table className="table table-hover table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Supporter</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Amount / value</th>
                    <th>Campaign</th>
                    <th>Channel</th>
                    <th>Recurring</th>
                  </tr>
                </thead>
                <tbody>
                  {donationsRows.map((d) => (
                    <tr
                      key={d.donationId}
                      role="button"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDetailDonationId(d.donationId)}
                    >
                      <td>{supporterNameMap.get(d.supporterId) ?? `#${d.supporterId}`}</td>
                      <td>
                        <span className="badge bg-info text-dark">{d.donationType}</span>
                      </td>
                      <td>{String(d.donationDate)}</td>
                      <td>
                        {formatPhpAmount(
                          Number(d.amount ?? d.estimatedValue ?? 0)
                        )}
                      </td>
                      <td>{d.campaignName ?? '—'}</td>
                      <td>{d.channelSource}</td>
                      <td>
                        {d.isRecurring ? (
                          <span className="badge bg-primary">Recurring</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {donationsTotal} total · page {histPageIndex} of {histTotalPages}
              {useClientDonationMode && (
                <span className="ms-1">(client-filtered / sorted)</span>
              )}
            </span>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={histPageIndex <= 1}
                onClick={() => setHistPageIndex((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={histPageIndex >= histTotalPages}
                onClick={() => setHistPageIndex((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {recordModalOpen && recordSupporterId != null && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRecordModal();
          }}
        >
          <div className="modal-dialog modal-dialog-scrollable modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Record donation</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeRecordModal}
                />
              </div>
              <div className="modal-body">
                {!postedDonation ? (
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label">Donation type</label>
                      <select
                        className="form-select"
                        value={rdType}
                        onChange={(e) => setRdType(e.target.value)}
                      >
                        {DONATION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Donation date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={rdDate}
                        onChange={(e) => setRdDate(e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={rdRecurring}
                          onChange={(e) => setRdRecurring(e.target.checked)}
                          id="rd-rec"
                        />
                        <label className="form-check-label" htmlFor="rd-rec">
                          Recurring donation
                        </label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Campaign</label>
                      <select
                        className="form-select"
                        value={rdCampaignMode}
                        onChange={(e) =>
                          setRdCampaignMode(e.target.value as 'preset' | 'custom')
                        }
                      >
                        <option value="preset">Preset</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">&nbsp;</label>
                      {rdCampaignMode === 'preset' ? (
                        <select
                          className="form-select"
                          value={rdCampaignPreset}
                          onChange={(e) => setRdCampaignPreset(e.target.value)}
                        >
                          {CAMPAIGN_PRESETS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="form-control"
                          value={rdCampaignCustom}
                          onChange={(e) => setRdCampaignCustom(e.target.value)}
                          placeholder="Campaign name"
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Channel source *</label>
                      <select
                        className="form-select"
                        value={rdChannel}
                        onChange={(e) => setRdChannel(e.target.value)}
                      >
                        {CHANNEL_SOURCES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {rdType === 'Monetary' ? (
                      <div className="col-md-6">
                        <label className="form-label">Amount (₱) *</label>
                        <input
                          className="form-control"
                          type="number"
                          min={0}
                          step="0.01"
                          value={rdAmount}
                          onChange={(e) => setRdAmount(e.target.value)}
                        />
                        <small className="text-muted">
                          Currency PHP · Impact unit: pesos
                        </small>
                      </div>
                    ) : (
                      <div className="col-md-6">
                        <label className="form-label">Estimated value (₱) *</label>
                        <input
                          className="form-control"
                          type="number"
                          min={0}
                          step="0.01"
                          value={rdEstimated}
                          onChange={(e) => setRdEstimated(e.target.value)}
                        />
                        <small className="text-muted">
                          Impact unit: {impactUnitForDonationType(rdType)}
                        </small>
                      </div>
                    )}
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={rdNotes}
                        onChange={(e) => setRdNotes(e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={rdSaving}
                        onClick={() => void submitRecordDonation()}
                      >
                        {rdSaving ? 'Saving…' : 'Save donation'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="small text-muted mb-3">
                      Donation #{postedDonation.donationId} saved. Complete follow-up below if
                      needed.
                    </p>
                    {postedDonation.donationType === 'Monetary' && (
                      <div className="border rounded p-3 mb-3">
                        <h6 className="fw-bold">Allocate donation</h6>
                        <p className="mb-2">
                          {formatPhpAmount(allocPostedSum)} allocated of{' '}
                          {formatPhpAmount(monetaryTotal)} total
                        </p>
                        <div className="row g-2 align-items-end">
                          <div className="col-md-4">
                            <label className="form-label small">Safehouse</label>
                            {managerScoped && safehouseId != null ? (
                              <div className="form-control form-control-sm bg-light text-muted">
                                {(() => {
                                  const sh = allSafehouses.find(
                                    (s) => s.safehouseId === safehouseId
                                  );
                                  if (!sh) return `Safehouse #${safehouseId}`;
                                  return sh.city ? `${sh.name} (${sh.city})` : sh.name;
                                })()}
                              </div>
                            ) : (
                              <select
                                className="form-select form-select-sm"
                                value={allocSafehouseId === '' ? '' : String(allocSafehouseId)}
                                onChange={(e) =>
                                  setAllocSafehouseId(
                                    e.target.value ? Number(e.target.value) : ''
                                  )
                                }
                              >
                                <option value="">Select…</option>
                                {safehousesForAllocationSelect.map((sh) => (
                                  <option key={sh.safehouseId} value={sh.safehouseId}>
                                    {sh.name} ({sh.city})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">Program area</label>
                            <select
                              className="form-select form-select-sm"
                              value={allocProgramArea}
                              onChange={(e) => setAllocProgramArea(e.target.value)}
                            >
                              {PROGRAM_AREAS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Amount</label>
                            <input
                              className="form-control form-control-sm"
                              type="number"
                              min={0}
                              step="0.01"
                              value={allocAmountIn}
                              onChange={(e) => setAllocAmountIn(e.target.value)}
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Date</label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={allocDateStr}
                              onChange={(e) => setAllocDateStr(e.target.value)}
                            />
                          </div>
                          <div className="col-md-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary w-100"
                              disabled={allocPosting}
                              onClick={() => void postAllocation()}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {postedDonation.donationType === 'InKind' && (
                      <div className="border rounded p-3 mb-3">
                        <h6 className="fw-bold">Add in-kind items</h6>
                        <div className="row g-2">
                          <div className="col-md-4">
                            <label className="form-label small">Item name</label>
                            <input
                              className="form-control form-control-sm"
                              value={ikName}
                              onChange={(e) => setIkName(e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small">Category</label>
                            <select
                              className="form-select form-select-sm"
                              value={ikCategory}
                              onChange={(e) => setIkCategory(e.target.value)}
                            >
                              {ITEM_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Qty</label>
                            <input
                              className="form-control form-control-sm"
                              type="number"
                              min={1}
                              value={ikQty}
                              onChange={(e) => setIkQty(e.target.value)}
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Unit</label>
                            <input
                              className="form-control form-control-sm"
                              value={ikUom}
                              onChange={(e) => setIkUom(e.target.value)}
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">Est. unit value</label>
                            <input
                              className="form-control form-control-sm"
                              type="number"
                              min={0}
                              value={ikUnitVal}
                              onChange={(e) => setIkUnitVal(e.target.value)}
                            />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">Intended use</label>
                            <select
                              className="form-select form-select-sm"
                              value={ikUse}
                              onChange={(e) => setIkUse(e.target.value)}
                            >
                              {INTENDED_USES.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">Condition</label>
                            <select
                              className="form-select form-select-sm"
                              value={ikCond}
                              onChange={(e) => setIkCond(e.target.value)}
                            >
                              {RECEIVED_CONDITIONS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3 d-flex align-items-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={ikPosting}
                              onClick={() => void postInKindItem()}
                            >
                              Add item
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <button type="button" className="btn btn-success" onClick={closeRecordModal}>
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSupporterId != null && (
        <>
          <div
            onClick={() => setSelectedSupporterId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(3px)',
              zIndex: 1040,
            }}
          />
          <SupporterSidePanel
            supporterId={selectedSupporterId}
            refreshSignal={supReloadToken}
            onClose={() => setSelectedSupporterId(null)}
            pushAlert={pushAlert}
            onRefresh={() => setSupReloadToken((t) => t + 1)}
            onRecordDonation={openRecordDonation}
          />
        </>
      )}

      {detailDonationId != null && (
        <DonationDetailModal
          donationId={detailDonationId}
          supporterNameMap={supporterNameMap}
          onClose={() => setDetailDonationId(null)}
        />
      )}
    </div>
  );
}

type SidePanelProps = {
  supporterId: number;
  refreshSignal: number;
  onClose: () => void;
  pushAlert: (m: string) => void;
  onRefresh: () => void;
  onRecordDonation: (id: number) => void;
};

function SupporterSidePanel({
  supporterId,
  refreshSignal,
  onClose,
  pushAlert,
  onRefresh,
  onRecordDonation,
}: SidePanelProps) {
  const [s, setS] = useState<Supporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Partial<Supporter>>({});
  const [donations, setDonations] = useState<Donation[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sup = await apiFetch<Supporter>(`/api/Supporters/GetSupporter/${supporterId}`);
        if (cancelled) return;
        setS(sup);
        setDraft(sup);
        const acc: Donation[] = [];
        let page = 1;
        let tc = Infinity;
        while ((page - 1) * 100 < tc) {
          const raw = await apiFetch<unknown>(
            `/api/Donations/AllDonations?supporterId=${supporterId}&pageSize=100&pageIndex=${page}&sortBy=DonationDate&sortOrder=desc`
          );
          const items = extractItems<Donation>(raw);
          tc = extractTotalCount(raw);
          acc.push(...items);
          if (items.length < 100) break;
          page++;
        }
        if (!cancelled) setDonations(acc);
      } catch (e) {
        if (!cancelled) pushAlert(e instanceof Error ? e.message : 'Failed to load supporter.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supporterId, pushAlert, refreshSignal]);

  const saveProfile = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await apiFetch(`/api/Supporters/UpdateSupporter/${supporterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          supporterType: draft.supporterType ?? s.supporterType,
          displayName: draft.displayName ?? s.displayName,
          organizationName: draft.organizationName ?? s.organizationName,
          firstName: draft.firstName ?? s.firstName,
          lastName: draft.lastName ?? s.lastName,
          relationshipType: draft.relationshipType ?? s.relationshipType,
          region: draft.region ?? s.region,
          country: draft.country ?? s.country,
          email: draft.email ?? s.email,
          phone: draft.phone ?? s.phone,
          status: draft.status ?? s.status,
          acquisitionChannel: draft.acquisitionChannel ?? s.acquisitionChannel,
          createdAt: s.createdAt,
          firstDonationDate: draft.firstDonationDate ?? s.firstDonationDate,
        }),
      });
      const fresh = await apiFetch<Supporter>(`/api/Supporters/GetSupporter/${supporterId}`);
      setS(fresh);
      setDraft(fresh);
      setEditMode(false);
      onRefresh();
      pushAlert('Profile updated.');
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!s) return;
    const next = s.status === 'Active' ? 'Inactive' : 'Active';
    setSaving(true);
    try {
      await apiFetch(`/api/Supporters/UpdateSupporter/${supporterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...s,
          status: next,
        }),
      });
      const fresh = await apiFetch<Supporter>(`/api/Supporters/GetSupporter/${supporterId}`);
      setS(fresh);
      setDraft(fresh);
      onRefresh();
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 420,
        height: '100vh',
        backgroundColor: '#fff',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        zIndex: 1050,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h5 className="fw-bold mb-0">{s?.displayName ?? 'Supporter'}</h5>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        {loading || !s ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" />
          </div>
        ) : (
          <>
            <div className="d-flex gap-2 mb-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => void toggleStatus()}
                disabled={saving}
              >
                Mark {s.status === 'Active' ? 'Inactive' : 'Active'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => (editMode ? void saveProfile() : setEditMode(true))}
                disabled={saving}
              >
                {editMode ? (saving ? 'Saving…' : 'Save') : 'Edit profile'}
              </button>
              {editMode && (
                <button
                  type="button"
                  className="btn btn-sm btn-link"
                  onClick={() => {
                    setDraft(s);
                    setEditMode(false);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {!editMode ? (
              <dl className="small">
                <dt>Type</dt>
                <dd>{s.supporterType}</dd>
                <dt>Organization</dt>
                <dd>{s.organizationName ?? '—'}</dd>
                <dt>Name</dt>
                <dd>
                  {(s.firstName || s.lastName) ? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() : '—'}
                </dd>
                <dt>Relationship</dt>
                <dd>{s.relationshipType}</dd>
                <dt>Region / Country</dt>
                <dd>
                  {s.region} / {s.country}
                </dd>
                <dt>Email</dt>
                <dd>{s.email}</dd>
                <dt>Phone</dt>
                <dd>{s.phone || '—'}</dd>
                <dt>Status</dt>
                <dd>
                  <span className={`badge ${s.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                    {s.status}
                  </span>
                </dd>
                <dt>First donation</dt>
                <dd>{s.firstDonationDate ?? '—'}</dd>
                <dt>Acquisition</dt>
                <dd>{s.acquisitionChannel}</dd>
              </dl>
            ) : (
              <div className="vstack gap-2 small">
                <input
                  className="form-control form-control-sm"
                  value={draft.displayName ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                />
                <select
                  className="form-select form-select-sm"
                  value={draft.supporterType ?? s.supporterType}
                  onChange={(e) => setDraft((d) => ({ ...d, supporterType: e.target.value }))}
                >
                  {SUPPORTER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  className="form-control form-control-sm"
                  placeholder="Organization"
                  value={draft.organizationName ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, organizationName: e.target.value }))
                  }
                />
                <input
                  className="form-control form-control-sm"
                  placeholder="Email"
                  value={draft.email ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
                <input
                  className="form-control form-control-sm"
                  placeholder="Phone"
                  value={draft.phone ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                />
                <input
                  className="form-control form-control-sm"
                  placeholder="Region"
                  value={draft.region ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
                />
                <input
                  className="form-control form-control-sm"
                  placeholder="Country"
                  value={draft.country ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                />
              </div>
            )}

            <h6 className="fw-bold border-top pt-3 mt-3">Donations</h6>
            {donations.length === 0 ? (
              <p className="text-muted small mb-0">No donations yet.</p>
            ) : (
              <ul className="list-group list-group-flush small">
                {donations.map((d) => (
                  <li key={d.donationId} className="list-group-item px-0">
                    <div className="d-flex justify-content-between">
                      <span>{String(d.donationDate)}</span>
                      <span className="fw-semibold">
                        {formatPhpAmount(Number(d.amount ?? d.estimatedValue ?? 0))}
                      </span>
                    </div>
                    <div className="text-muted">{d.donationType}</div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="btn btn-primary w-100 mt-3"
              onClick={() => onRecordDonation(supporterId)}
            >
              Record new donation
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DonationDetailModal({
  donationId,
  supporterNameMap,
  onClose,
}: {
  donationId: number;
  supporterNameMap: Map<number, string>;
  onClose: () => void;
}) {
  const [d, setD] = useState<Donation | null>(null);
  const [alloc, setAlloc] = useState<DonationAllocation[]>([]);
  const [items, setItems] = useState<InKindItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const don = await apiFetch<Donation>(`/api/Donations/GetDonation/${donationId}`);
        const al = await apiFetch<DonationAllocation[]>(
          `/api/DonationAllocations/ByDonation/${donationId}`
        );
        let ik: InKindItem[] = [];
        if (don.donationType === 'InKind') {
          ik = await apiFetch<InKindItem[]>(`/api/InKindDonationItems/ByDonation/${donationId}`);
        }
        if (!cancelled) {
          setD(don);
          setAlloc(Array.isArray(al) ? al : extractItems<DonationAllocation>(al));
          setItems(ik);
        }
      } catch {
        if (!cancelled) setD(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [donationId]);

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-scrollable modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Donation #{donationId}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" />
              </div>
            ) : !d ? (
              <p className="text-danger">Could not load donation.</p>
            ) : (
              <>
                <dl className="row small">
                  <dt className="col-sm-4">Supporter</dt>
                  <dd className="col-sm-8">
                    {supporterNameMap.get(d.supporterId) ?? `#${d.supporterId}`}
                  </dd>
                  <dt className="col-sm-4">Type</dt>
                  <dd className="col-sm-8">{d.donationType}</dd>
                  <dt className="col-sm-4">Date</dt>
                  <dd className="col-sm-8">{String(d.donationDate)}</dd>
                  <dt className="col-sm-4">Recurring</dt>
                  <dd className="col-sm-8">{d.isRecurring ? 'Yes' : 'No'}</dd>
                  <dt className="col-sm-4">Campaign</dt>
                  <dd className="col-sm-8">{d.campaignName ?? '—'}</dd>
                  <dt className="col-sm-4">Channel</dt>
                  <dd className="col-sm-8">{d.channelSource}</dd>
                  <dt className="col-sm-4">Amount / value</dt>
                  <dd className="col-sm-8">
                    {formatPhpAmount(Number(d.amount ?? d.estimatedValue ?? 0))} (
                    {d.impactUnit})
                  </dd>
                  <dt className="col-sm-4">Notes</dt>
                  <dd className="col-sm-8">{d.notes ?? '—'}</dd>
                </dl>
                <h6 className="fw-bold">Allocations</h6>
                {alloc.length === 0 ? (
                  <p className="text-muted small">None.</p>
                ) : (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Safehouse</th>
                        <th>Program</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alloc.map((a) => (
                        <tr key={a.allocationId}>
                          <td>#{a.safehouseId}</td>
                          <td>{a.programArea}</td>
                          <td>{formatPhpAmount(a.amountAllocated)}</td>
                          <td>{String(a.allocationDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {d.donationType === 'InKind' && (
                  <>
                    <h6 className="fw-bold mt-3">In-kind items</h6>
                    {items.length === 0 ? (
                      <p className="text-muted small">None.</p>
                    ) : (
                      <ul className="small">
                        {items.map((it) => (
                          <li key={it.itemId}>
                            {it.itemName} × {it.quantity} ({it.itemCategory})
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

