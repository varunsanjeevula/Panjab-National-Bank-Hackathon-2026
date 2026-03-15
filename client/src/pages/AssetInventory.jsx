import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAssetDomains, getAssetSSL, getAssetIPs, getAssetSoftware } from '../services/api';
import { motion } from 'framer-motion';
import { Globe, Lock, Network, PackageOpen, Search, Calendar, Building2, ShieldCheck, Fingerprint, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'domains', label: 'Domains', icon: Globe },
  { key: 'ssl', label: 'SSL', icon: Lock },
  { key: 'ip', label: 'IP Address/Subnets', icon: Network },
  { key: 'software', label: 'Software', icon: PackageOpen },
];

export default function AssetInventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'domains';
  const [domains, setDomains] = useState([]);
  const [sslRecords, setSslRecords] = useState([]);
  const [ipRecords, setIpRecords] = useState([]);
  const [softwareRecords, setSoftwareRecords] = useState([]);
  const [loadingTab, setLoadingTab] = useState(null);
  const [search, setSearch] = useState('');
  const loadedTabs = useRef(new Set());

  const setTab = (tab) => { setSearch(''); setSearchParams({ tab }); };

  useEffect(() => {
    // Skip if this tab's data was already fetched
    if (loadedTabs.current.has(activeTab)) return;

    let cancelled = false;

    if (activeTab === 'domains') {
      setLoadingTab('domains');
      (async () => {
        try {
          const { data } = await getAssetDomains();
          if (!cancelled) { setDomains(data); loadedTabs.current.add('domains'); }
        } catch {
          if (!cancelled) toast.error('Failed to load domain inventory');
        } finally {
          if (!cancelled) setLoadingTab(null);
        }
      })();
    }
    if (activeTab === 'ssl') {
      setLoadingTab('ssl');
      (async () => {
        try {
          const { data } = await getAssetSSL();
          if (!cancelled) { setSslRecords(data); loadedTabs.current.add('ssl'); }
        } catch {
          if (!cancelled) toast.error('Failed to load SSL inventory');
        } finally {
          if (!cancelled) setLoadingTab(null);
        }
      })();
    }
    if (activeTab === 'ip') {
      setLoadingTab('ip');
      (async () => {
        try {
          const { data } = await getAssetIPs();
          if (!cancelled) { setIpRecords(data); loadedTabs.current.add('ip'); }
        } catch {
          if (!cancelled) toast.error('Failed to load IP inventory');
        } finally {
          if (!cancelled) setLoadingTab(null);
        }
      })();
    }
    if (activeTab === 'software') {
      setLoadingTab('software');
      (async () => {
        try {
          const { data } = await getAssetSoftware();
          if (!cancelled) { setSoftwareRecords(data); loadedTabs.current.add('software'); }
        } catch {
          if (!cancelled) toast.error('Failed to load software inventory');
        } finally {
          if (!cancelled) setLoadingTab(null);
        }
      })();
    }

    return () => { cancelled = true; };
  }, [activeTab]);

  // Prefetch other tabs in background after active tab loads
  useEffect(() => {
    // Only prefetch after at least one tab has finished loading
    if (loadingTab || loadedTabs.current.size === 0) return;
    const timer = setTimeout(() => {
      const prefetch = async (tab, fetcher, setter) => {
        if (loadedTabs.current.has(tab)) return;
        try {
          const { data } = await fetcher();
          setter(data);
          loadedTabs.current.add(tab);
        } catch { /* silent */ }
      };
      prefetch('domains', getAssetDomains, setDomains);
      prefetch('ssl', getAssetSSL, setSslRecords);
      prefetch('ip', getAssetIPs, setIpRecords);
      prefetch('software', getAssetSoftware, setSoftwareRecords);
    }, 500); // small delay to not compete with active tab
    return () => clearTimeout(timer);
  }, [loadingTab]);

  const filteredDomains = domains.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.domainName || '').toLowerCase().includes(q) ||
      (d.host || '').toLowerCase().includes(q) ||
      (d.companyName || '').toLowerCase().includes(q) ||
      (d.registrar || '').toLowerCase().includes(q)
    );
  });

  const filteredSSL = sslRecords.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.commonName || '').toLowerCase().includes(q) ||
      (s.host || '').toLowerCase().includes(q) ||
      (s.companyName || '').toLowerCase().includes(q) ||
      (s.certificateAuthority || '').toLowerCase().includes(q) ||
      (s.sslShaFingerprint || '').toLowerCase().includes(q)
    );
  });

  const filteredIPs = ipRecords.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.ipAddress || '').toLowerCase().includes(q) ||
      (r.host || '').toLowerCase().includes(q) ||
      (r.subnet || '').toLowerCase().includes(q) ||
      (r.netname || '').toLowerCase().includes(q) ||
      (r.company || '').toLowerCase().includes(q) ||
      (r.location || '').toLowerCase().includes(q)
    );
  });

  const filteredSoftware = softwareRecords.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.product || '').toLowerCase().includes(q) ||
      (s.host || '').toLowerCase().includes(q) ||
      (s.version || '').toLowerCase().includes(q) ||
      (s.type || '').toLowerCase().includes(q) ||
      (s.companyName || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Asset Inventory</h1>
        <p className="page-subtitle">Organized view of all discovered assets from your scans</p>
      </div>

      {/* Tabs */}
      <div className="asset-tabs" style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-input)', padding: 4, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
                opacity: 1
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'domains' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Search bar */}
          <div className="card" style={{ marginBottom: 16, padding: '12px 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                placeholder="Search domains, companies, registrars..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total Domains</div>
              <div className="stat-card-value">{domains.length}</div>
              <div className="stat-card-sub"><Globe size={12} /> Discovered from scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Unique Registrars</div>
              <div className="stat-card-value">{new Set(domains.map(d => d.registrar).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><Building2 size={12} /> Certificate issuers</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Unique Companies</div>
              <div className="stat-card-value">{new Set(domains.map(d => d.companyName).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><ShieldCheck size={12} /> Certificate subjects</div>
            </div>
          </div>

          {/* Table */}
          {loadingTab === 'domains' ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" /> Loading domain inventory...
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              {domains.length === 0
                ? 'No domain data found. Run a scan to discover domains.'
                : 'No domains match your search.'}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Detection Date</th>
                      <th>Domain Name</th>
                      <th>Registration Date</th>
                      <th>Registrar</th>
                      <th>Company Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDomains.map((domain, idx) => (
                      <tr key={domain.host + '-' + idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            {formatDate(domain.detectionDate)}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {domain.domainName}
                          </span>
                        </td>
                        <td>{formatDate(domain.registrationDate)}</td>
                        <td>
                          <span style={{ fontSize: 13 }}>
                            {domain.registrar || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 13 }}>
                            {domain.companyName || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* SSL Tab */}
      {activeTab === 'ssl' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Search bar */}
          <div className="card" style={{ marginBottom: 16, padding: '12px 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                placeholder="Search by fingerprint, common name, company, CA..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total SSL Certificates</div>
              <div className="stat-card-value">{sslRecords.length}</div>
              <div className="stat-card-sub"><Lock size={12} /> Discovered from scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Certificate Authorities</div>
              <div className="stat-card-value">{new Set(sslRecords.map(s => s.certificateAuthority).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><Building2 size={12} /> Unique issuers</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Unique Companies</div>
              <div className="stat-card-value">{new Set(sslRecords.map(s => s.companyName).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><ShieldCheck size={12} /> Certificate subjects</div>
            </div>
          </div>

          {/* Table */}
          {loadingTab === 'ssl' ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" /> Loading SSL inventory...
            </div>
          ) : filteredSSL.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              {sslRecords.length === 0
                ? 'No SSL data found. Run a scan to discover certificates.'
                : 'No SSL records match your search.'}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Detection Date</th>
                      <th>SSL SHA Fingerprint</th>
                      <th>Valid From</th>
                      <th>Common Name</th>
                      <th>Company Name</th>
                      <th>Certificate Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSSL.map((ssl, idx) => (
                      <tr key={ssl.host + '-' + idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            {formatDate(ssl.detectionDate)}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                            {ssl.sslShaFingerprint
                              ? ssl.sslShaFingerprint.length > 24
                                ? ssl.sslShaFingerprint.substring(0, 24) + '...'
                                : ssl.sslShaFingerprint
                              : '—'}
                          </span>
                        </td>
                        <td>{formatDate(ssl.validFrom)}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {ssl.commonName}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 13 }}>
                            {ssl.companyName || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 13 }}>
                            {ssl.certificateAuthority || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* IP Address/Subnets Tab */}
      {activeTab === 'ip' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Search bar */}
          <div className="card" style={{ marginBottom: 16, padding: '12px 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                placeholder="Search by IP, subnet, netname, company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total IPs</div>
              <div className="stat-card-value">{ipRecords.length}</div>
              <div className="stat-card-sub"><Network size={12} /> Discovered from scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Unique Subnets</div>
              <div className="stat-card-value">{new Set(ipRecords.map(r => r.subnet).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><Globe size={12} /> /24 subnets</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Unique Companies</div>
              <div className="stat-card-value">{new Set(ipRecords.map(r => r.company).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><Building2 size={12} /> Organizations</div>
            </div>
          </div>

          {/* Table */}
          {loadingTab === 'ip' ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" /> Loading IP inventory...
            </div>
          ) : filteredIPs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              {ipRecords.length === 0
                ? 'No IP data found. Run a scan to discover IP addresses.'
                : 'No IP records match your search.'}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Detection Date</th>
                      <th>IP Address</th>
                      <th>Ports</th>
                      <th>Subnet</th>
                      <th>ASN</th>
                      <th>Netname</th>
                      <th>Location</th>
                      <th>Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIPs.map((ip, idx) => (
                      <tr key={ip.host + '-' + idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            {formatDate(ip.detectionDate)}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {ip.ipAddress}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(Array.isArray(ip.ports) ? ip.ports : [ip.ports]).map(p => (
                              <span key={p} style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--color-info-bg)', color: 'var(--brand-primary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {ip.subnet || '—'}
                          </span>
                        </td>
                        <td><span style={{ fontSize: 13 }}>{ip.asn || '—'}</span></td>
                        <td><span style={{ fontSize: 13 }}>{ip.netname || '—'}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                            {ip.location && <MapPin size={12} style={{ color: 'var(--text-muted)' }} />}
                            {ip.location || '—'}
                          </div>
                        </td>
                        <td><span style={{ fontSize: 13 }}>{ip.company || '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'software' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Search bar */}
          <div className="card" style={{ marginBottom: 16, padding: '12px 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                placeholder="Search by product, host, type, company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total Software</div>
              <div className="stat-card-value">{softwareRecords.length}</div>
              <div className="stat-card-sub"><PackageOpen size={12} /> Discovered from scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Unique Types</div>
              <div className="stat-card-value">{new Set(softwareRecords.map(s => s.type).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><ShieldCheck size={12} /> Algorithm types</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Unique Hosts</div>
              <div className="stat-card-value">{new Set(softwareRecords.map(s => s.host).filter(Boolean)).size}</div>
              <div className="stat-card-sub"><Globe size={12} /> Endpoints</div>
            </div>
          </div>

          {/* Table */}
          {loadingTab === 'software' ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" /> Loading software inventory...
            </div>
          ) : filteredSoftware.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              {softwareRecords.length === 0
                ? 'No software data found. Run a scan to discover software.'
                : 'No software records match your search.'}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Detection Date</th>
                      <th>Product</th>
                      <th>Version</th>
                      <th>Type</th>
                      <th>Port</th>
                      <th>Host</th>
                      <th>Company Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSoftware.map((sw, idx) => (
                      <tr key={sw.host + '-' + sw.port + '-' + idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            {formatDate(sw.detectionDate)}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {sw.product || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                            {sw.version || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--color-info-bg)', color: 'var(--brand-primary)', fontSize: 12 }}>
                            {sw.type || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {sw.port}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                            {sw.host}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 13 }}>
                            {sw.companyName || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
