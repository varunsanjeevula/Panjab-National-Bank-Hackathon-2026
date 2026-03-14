import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Globe, Shield, Network, Cpu, Search, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAssetDomains } from '../services/api';

const TABS = [
  { key: 'domains', label: 'Domains', icon: Globe },
  { key: 'ssl', label: 'SSL', icon: Shield },
  { key: 'ip', label: 'IP Address / Subnets', icon: Network },
  { key: 'software', label: 'Software', icon: Cpu },
];

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function DomainsTable({ domains, loading }) {
  const [search, setSearch] = useState('');

  const filtered = domains.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.domainName || '').toLowerCase().includes(q) ||
      (d.registrar || '').toLowerCase().includes(q) ||
      (d.companyName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            placeholder="Search domains, registrar, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" /> Loading domains…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No domain records found. Run a scan to populate asset inventory.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Detection Date', 'Domain Name', 'Registration Date', 'Registrar', 'Company Name'].map((col) => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    style={{ borderBottom: '1px solid var(--border-light)', cursor: 'default' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(row.detectionDate)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Globe size={13} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                        {row.domainName || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(row.registrationDate)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {row.registrar || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {row.companyName || '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ComingSoon({ label }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
      <ChevronRight size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
      <div style={{ fontSize: 15, fontWeight: 600 }}>{label} — Coming Soon</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>
        This section will be available in the next update.
      </div>
    </div>
  );
}

export default function AssetInventory() {
  const [activeTab, setActiveTab] = useState('domains');
  const [domains, setDomains] = useState([]);
  const [domainsLoading, setDomainsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'domains') {
      setDomainsLoading(true);
      getAssetDomains()
        .then(({ data }) => setDomains(data))
        .catch(() => toast.error('Failed to load domain assets'))
        .finally(() => setDomainsLoading(false));
    }
  }, [activeTab]);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Database size={24} style={{ color: 'var(--brand-primary)' }} />
          Asset Inventory
        </h1>
        <p className="page-subtitle">
          Organized view of all discovered assets from completed scans
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: activeTab === key ? 700 : 500,
              color: activeTab === key ? 'var(--brand-primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--brand-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {activeTab === 'domains' && (
          <DomainsTable domains={domains} loading={domainsLoading} />
        )}
        {activeTab === 'ssl' && <ComingSoon label="SSL" />}
        {activeTab === 'ip' && <ComingSoon label="IP Address / Subnets" />}
        {activeTab === 'software' && <ComingSoon label="Software" />}
      </motion.div>
    </div>
  );
}
