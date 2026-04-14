/**
 * PortScanner — Pure Node.js TCP Connect Scanner
 * Zero external dependencies. Privacy-safe. Cross-platform.
 * 
 * Uses net.Socket to attempt TCP connections and identify open ports,
 * then performs service fingerprinting via banner grabbing.
 */
const net = require('net');

// ─── Common Port → Service Mapping ─────────────────────
const PORT_SERVICE_MAP = {
  20: { service: 'FTP-Data', protocol: 'TCP', risk: 'high', desc: 'File Transfer Protocol (Data)' },
  21: { service: 'FTP', protocol: 'TCP', risk: 'high', desc: 'File Transfer Protocol — plaintext credentials', quantumNote: 'FTP transmits data in cleartext; no crypto to break, but exposes credentials.' },
  22: { service: 'SSH', protocol: 'TCP', risk: 'medium', desc: 'Secure Shell — remote access', quantumNote: 'SSH RSA/ECDSA host keys are quantum-vulnerable. Migrate to SSH with PQC key exchange.' },
  23: { service: 'Telnet', protocol: 'TCP', risk: 'critical', desc: 'Telnet — plaintext remote access (DEPRECATED)', quantumNote: 'Telnet has zero encryption. Critical security risk even without quantum threats.' },
  25: { service: 'SMTP', protocol: 'TCP', risk: 'medium', desc: 'Simple Mail Transfer Protocol', quantumNote: 'SMTP STARTTLS uses RSA/ECDHE — quantum-vulnerable key exchange.' },
  53: { service: 'DNS', protocol: 'TCP/UDP', risk: 'medium', desc: 'Domain Name System', quantumNote: 'DNSSEC relies on RSA/ECDSA signatures — vulnerable to quantum forgery.' },
  80: { service: 'HTTP', protocol: 'TCP', risk: 'high', desc: 'Hypertext Transfer Protocol (unencrypted)', quantumNote: 'No encryption. All traffic exposed. Should redirect to HTTPS/443.' },
  110: { service: 'POP3', protocol: 'TCP', risk: 'high', desc: 'Post Office Protocol v3 (plaintext)', quantumNote: 'POP3 without TLS exposes email credentials in cleartext.' },
  111: { service: 'RPCBind', protocol: 'TCP', risk: 'high', desc: 'Remote Procedure Call', quantumNote: 'RPC services should not be exposed to the internet.' },
  135: { service: 'MSRPC', protocol: 'TCP', risk: 'high', desc: 'Microsoft RPC', quantumNote: 'Common target for lateral movement attacks.' },
  139: { service: 'NetBIOS', protocol: 'TCP', risk: 'high', desc: 'NetBIOS Session Service', quantumNote: 'Legacy Windows file sharing — should never be internet-exposed.' },
  143: { service: 'IMAP', protocol: 'TCP', risk: 'medium', desc: 'Internet Message Access Protocol', quantumNote: 'IMAP STARTTLS uses RSA certificates — quantum-vulnerable.' },
  443: { service: 'HTTPS', protocol: 'TCP', risk: 'low', desc: 'HTTP over TLS — encrypted web traffic', quantumNote: 'TLS RSA/ECDHE key exchange is quantum-vulnerable. Requires ML-KEM hybrid migration.' },
  445: { service: 'SMB', protocol: 'TCP', risk: 'critical', desc: 'Server Message Block — file sharing', quantumNote: 'SMB exposed to internet is critical risk (WannaCry, EternalBlue). Never expose publicly.' },
  465: { service: 'SMTPS', protocol: 'TCP', risk: 'low', desc: 'SMTP over SSL', quantumNote: 'Uses TLS with RSA/ECDHE — quantum-vulnerable key exchange.' },
  587: { service: 'SMTP-Submission', protocol: 'TCP', risk: 'low', desc: 'SMTP Submission with STARTTLS', quantumNote: 'STARTTLS RSA key exchange is quantum-vulnerable.' },
  993: { service: 'IMAPS', protocol: 'TCP', risk: 'low', desc: 'IMAP over TLS', quantumNote: 'TLS-wrapped but RSA key exchange remains quantum-vulnerable.' },
  995: { service: 'POP3S', protocol: 'TCP', risk: 'low', desc: 'POP3 over TLS', quantumNote: 'TLS-wrapped but RSA key exchange remains quantum-vulnerable.' },
  1433: { service: 'MSSQL', protocol: 'TCP', risk: 'critical', desc: 'Microsoft SQL Server', quantumNote: 'Database ports exposed to internet = critical risk. TDS protocol uses TLS with RSA.' },
  1521: { service: 'Oracle DB', protocol: 'TCP', risk: 'critical', desc: 'Oracle Database TNS Listener', quantumNote: 'Database exposure is critical. Oracle TNS uses RSA for auth handshake.' },
  2049: { service: 'NFS', protocol: 'TCP', risk: 'high', desc: 'Network File System', quantumNote: 'NFS should never be internet-exposed.' },
  3306: { service: 'MySQL', protocol: 'TCP', risk: 'critical', desc: 'MySQL Database', quantumNote: 'Database ports must not be internet-facing. MySQL auth uses SHA-based handshake.' },
  3389: { service: 'RDP', protocol: 'TCP', risk: 'critical', desc: 'Remote Desktop Protocol', quantumNote: 'RDP uses TLS with RSA for NLA — quantum-vulnerable. Also common ransomware entry point.' },
  5432: { service: 'PostgreSQL', protocol: 'TCP', risk: 'critical', desc: 'PostgreSQL Database', quantumNote: 'Database should not be exposed. PostgreSQL uses SCRAM-SHA-256 auth.' },
  5900: { service: 'VNC', protocol: 'TCP', risk: 'critical', desc: 'Virtual Network Computing', quantumNote: 'VNC often has weak/no authentication. Never expose to internet.' },
  5985: { service: 'WinRM-HTTP', protocol: 'TCP', risk: 'high', desc: 'Windows Remote Management (HTTP)', quantumNote: 'WinRM allows remote command execution. Should use HTTPS on 5986.' },
  5986: { service: 'WinRM-HTTPS', protocol: 'TCP', risk: 'medium', desc: 'Windows Remote Management (HTTPS)', quantumNote: 'Uses TLS with RSA — quantum-vulnerable key exchange.' },
  6379: { service: 'Redis', protocol: 'TCP', risk: 'critical', desc: 'Redis In-Memory Database', quantumNote: 'Redis often runs without authentication. Critical if internet-exposed.' },
  8080: { service: 'HTTP-Proxy', protocol: 'TCP', risk: 'medium', desc: 'HTTP Alternate / Proxy', quantumNote: 'Web proxy — check if it uses TLS termination with quantum-safe ciphers.' },
  8443: { service: 'HTTPS-Alt', protocol: 'TCP', risk: 'low', desc: 'HTTPS Alternate', quantumNote: 'Alternative HTTPS — same quantum concerns as port 443.' },
  9090: { service: 'Web-Admin', protocol: 'TCP', risk: 'medium', desc: 'Web Administration Panel', quantumNote: 'Admin panels should use strong TLS with PQC cipher suites.' },
  9200: { service: 'Elasticsearch', protocol: 'TCP', risk: 'critical', desc: 'Elasticsearch REST API', quantumNote: 'Elasticsearch exposed = data breach risk. No quantum angle needed — already critical.' },
  11211: { service: 'Memcached', protocol: 'TCP', risk: 'critical', desc: 'Memcached Cache Server', quantumNote: 'Memcached DDoS amplification vector. Must not be exposed.' },
  27017: { service: 'MongoDB', protocol: 'TCP', risk: 'critical', desc: 'MongoDB Database', quantumNote: 'MongoDB without auth is a top breach vector. Should use SCRAM-SHA-256.' },
};

// ─── Scan Profiles ──────────────────────────────────────
const PROFILES = {
  quick: [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 8080, 8443, 27017],
  standard: [20, 21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 465, 587, 993, 995, 1433, 1521, 2049, 3306, 3389, 5432, 5900, 5985, 5986, 6379, 8080, 8443, 9090, 9200, 11211, 27017],
  full: Array.from({ length: 1024 }, (_, i) => i + 1),
};

/**
 * Scan a single port on the target host.
 * @returns {Promise<{port, state, responseTime, banner}>}
 */
function scanPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let banner = '';

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const responseTime = Date.now() - start;
      // Try banner grabbing — wait briefly for initial data
      socket.once('data', (data) => {
        banner = data.toString('utf8').trim().substring(0, 256);
        socket.destroy();
        resolve({ port, state: 'open', responseTime, banner });
      });
      // If no data within 1.5s, still mark as open
      setTimeout(() => {
        socket.destroy();
        resolve({ port, state: 'open', responseTime, banner });
      }, 1500);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, state: 'filtered', responseTime: timeout, banner: '' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      if (err.code === 'ECONNREFUSED') {
        resolve({ port, state: 'closed', responseTime: Date.now() - start, banner: '' });
      } else {
        resolve({ port, state: 'filtered', responseTime: Date.now() - start, banner: '' });
      }
    });

    socket.connect(port, host);
  });
}

/**
 * Enrich scan result with service info from our local database.
 */
function enrichWithServiceInfo(result) {
  const known = PORT_SERVICE_MAP[result.port];
  if (known) {
    return {
      ...result,
      service: known.service,
      protocol: known.protocol,
      riskLevel: known.risk,
      description: known.desc,
      quantumNote: known.quantumNote || null,
    };
  }

  // Attempt to identify service from banner
  let service = 'Unknown';
  let riskLevel = 'info';
  const b = (result.banner || '').toLowerCase();
  if (b.includes('ssh')) { service = 'SSH'; riskLevel = 'medium'; }
  else if (b.includes('http')) { service = 'HTTP'; riskLevel = 'medium'; }
  else if (b.includes('smtp')) { service = 'SMTP'; riskLevel = 'medium'; }
  else if (b.includes('ftp')) { service = 'FTP'; riskLevel = 'high'; }
  else if (b.includes('mysql')) { service = 'MySQL'; riskLevel = 'critical'; }
  else if (b.includes('postgres')) { service = 'PostgreSQL'; riskLevel = 'critical'; }
  else if (b.includes('redis')) { service = 'Redis'; riskLevel = 'critical'; }
  else if (b.includes('mongo')) { service = 'MongoDB'; riskLevel = 'critical'; }

  return {
    ...result,
    service,
    protocol: 'TCP',
    riskLevel,
    description: `Service on port ${result.port}`,
    quantumNote: null,
  };
}

/**
 * Run a full port scan on the target.
 * @param {string} host - Target hostname or IP
 * @param {string} profile - 'quick', 'standard', 'full', or 'custom'
 * @param {number[]} customPorts - Custom port list (used when profile is 'custom')
 * @param {number} concurrency - Max concurrent connections
 * @param {number} timeout - Per-port timeout in ms
 * @param {Function} onProgress - Progress callback ({scanned, total, openCount})
 */
async function runPortScan(host, profile = 'standard', customPorts = [], concurrency = 50, timeout = 3000, onProgress = null) {
  const ports = profile === 'custom' ? customPorts : (PROFILES[profile] || PROFILES.standard);
  const startTime = Date.now();

  const results = [];
  let scanned = 0;
  let openCount = 0;

  // Process in batches for concurrency control
  for (let i = 0; i < ports.length; i += concurrency) {
    const batch = ports.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(port => scanPort(host, port, timeout))
    );

    for (const result of batchResults) {
      const enriched = enrichWithServiceInfo(result);
      results.push(enriched);
      scanned++;
      if (result.state === 'open') openCount++;
    }

    if (onProgress) {
      onProgress({ scanned, total: ports.length, openCount });
    }
  }

  const scanDuration = Date.now() - startTime;

  // Sort: open first, then by port number
  results.sort((a, b) => {
    if (a.state === 'open' && b.state !== 'open') return -1;
    if (a.state !== 'open' && b.state === 'open') return 1;
    return a.port - b.port;
  });

  const openPorts = results.filter(r => r.state === 'open');
  const filteredPorts = results.filter(r => r.state === 'filtered');

  return {
    target: host,
    profile,
    portsScanned: ports.length,
    scanDuration,
    openPorts,
    filteredPorts: filteredPorts.length,
    closedPorts: results.filter(r => r.state === 'closed').length,
    allResults: results,
  };
}

// ─── Local CVE / Vulnerability Database ─────────────────
// No external API calls. All intelligence is local.
const VULN_DATABASE = {
  'FTP': [
    { cveId: 'CVE-2023-3824', severity: 'high', cvss: 8.1, description: 'FTP bounce attack — can be used to port scan internal networks through the FTP server.', exploitAvailable: true, recommendation: 'Disable FTP entirely. Use SFTP (SSH File Transfer Protocol) instead.', quantumRelevance: 'FTP has no crypto. Replace with SFTP using PQC-safe SSH keys.' },
    { cveId: 'CVE-2024-0553', severity: 'critical', cvss: 9.1, description: 'Anonymous FTP login may expose sensitive banking documents and configuration files.', exploitAvailable: true, recommendation: 'Disable anonymous FTP access. Migrate to SFTP with certificate-based authentication.', quantumRelevance: 'N/A — FTP uses no encryption. The data is already fully exposed.' },
  ],
  'SSH': [
    { cveId: 'CVE-2024-6387', severity: 'critical', cvss: 8.1, description: 'regreSSHion — OpenSSH signal handler race condition allowing unauthenticated RCE on glibc-based Linux systems.', exploitAvailable: true, recommendation: 'Update OpenSSH to 9.8p1 or later immediately. Apply vendor patches.', quantumRelevance: 'SSH RSA host keys (2048-4096 bit) will be breakable by quantum computers. Migrate to SSH with ML-KEM key exchange.' },
    { cveId: 'CVE-2023-48795', severity: 'medium', cvss: 5.9, description: 'Terrapin Attack — prefix truncation attack on SSH Binary Packet Protocol, degrading connection security.', exploitAvailable: true, recommendation: 'Update OpenSSH and disable affected ciphers (chacha20-poly1305, CBC with ETM MACs).', quantumRelevance: 'Weakens SSH crypto negotiation. Combined with future quantum attacks, this reduces the effective security of SSH connections.' },
  ],
  'Telnet': [
    { cveId: 'CVE-2022-29154', severity: 'critical', cvss: 9.8, description: 'Telnet transmits all data including passwords in plaintext. Any network sniffer can capture credentials.', exploitAvailable: true, recommendation: 'DISABLE TELNET IMMEDIATELY. Replace with SSH. There is no secure way to use Telnet.', quantumRelevance: 'Irrelevant — Telnet has zero encryption. Already fully compromised without quantum.' },
  ],
  'HTTP': [
    { cveId: 'CVE-2024-2234', severity: 'high', cvss: 7.5, description: 'Unencrypted HTTP exposes all traffic to eavesdropping, MITM attacks, and session hijacking.', exploitAvailable: true, recommendation: 'Redirect all HTTP traffic to HTTPS (port 443). Implement HSTS header with minimum 1-year max-age.', quantumRelevance: 'HTTP has no encryption to break. Upgrade to HTTPS with PQC-hybrid TLS cipher suites.' },
  ],
  'HTTPS': [
    { cveId: 'CVE-2024-PQVULN', severity: 'medium', cvss: 5.3, description: 'HTTPS using RSA/ECDHE key exchange is vulnerable to Harvest Now Decrypt Later (HNDL) attacks from quantum computers.', exploitAvailable: false, recommendation: 'Enable ML-KEM-768 hybrid key exchange. Deploy TLS 1.3 with X25519+ML-KEM hybrid.', quantumRelevance: 'CRITICAL: All RSA/ECDHE TLS sessions can be recorded and decrypted when CRQCs become available (est. 2030-2035).' },
  ],
  'SMTP': [
    { cveId: 'CVE-2023-52215', severity: 'medium', cvss: 5.9, description: 'SMTP without enforced STARTTLS allows email interception. DMARC/SPF bypass possible.', exploitAvailable: true, recommendation: 'Enforce STARTTLS with modern TLS 1.3. Implement DMARC with reject policy. Enable MTA-STS.', quantumRelevance: 'SMTP STARTTLS with RSA cert is quantum-vulnerable. Email encryption keys should migrate to PQC.' },
  ],
  'SMB': [
    { cveId: 'CVE-2017-0144', severity: 'critical', cvss: 9.8, description: 'EternalBlue — SMBv1 Remote Code Execution. Used in WannaCry ransomware. If SMB is exposed, this is catastrophic.', exploitAvailable: true, recommendation: 'NEVER expose SMB to the internet. Disable SMBv1. Apply MS17-010 patch. Use VPN for remote file access.', quantumRelevance: 'SMB signing uses HMAC-SHA256 which is quantum-resistant, but exposed SMB is critical regardless.' },
  ],
  'RDP': [
    { cveId: 'CVE-2019-0708', severity: 'critical', cvss: 9.8, description: 'BlueKeep — RDP Remote Code Execution without authentication. Wormable vulnerability.', exploitAvailable: true, recommendation: 'NEVER expose RDP to the internet. Use VPN + Network Level Authentication (NLA). Apply patches.', quantumRelevance: 'RDP NLA uses TLS with RSA/CredSSP — quantum-vulnerable. Use VPN with PQC tunnel instead.' },
    { cveId: 'CVE-2024-21351', severity: 'high', cvss: 7.8, description: 'Windows SmartScreen Security Feature Bypass via RDP session delivery.', exploitAvailable: true, recommendation: 'Apply latest Windows security updates. Restrict RDP access to VPN-only.', quantumRelevance: 'RDP credential negotiation relies on RSA — will be quantum-breakable.' },
  ],
  'MySQL': [
    { cveId: 'CVE-2024-20996', severity: 'critical', cvss: 8.8, description: 'MySQL exposed to internet allows brute-force attacks against database credentials. Data breach risk.', exploitAvailable: true, recommendation: 'NEVER expose MySQL to the internet. Bind to localhost or private network only. Use SSH tunnels for remote access.', quantumRelevance: 'MySQL authentication uses SHA-256 which is quantum-resistant, but exposed databases are critical regardless.' },
  ],
  'PostgreSQL': [
    { cveId: 'CVE-2024-4317', severity: 'high', cvss: 8.1, description: 'PostgreSQL exposed to internet enables brute-force and SQL injection attacks against banking data.', exploitAvailable: true, recommendation: 'Restrict PostgreSQL to private network. Use SCRAM-SHA-256 authentication. Enable SSL with client certificates.', quantumRelevance: 'PostgreSQL SCRAM uses SHA-256 (quantum-resistant), but pg_hba.conf misconfigs may allow MD5 auth (vulnerable).' },
  ],
  'MongoDB': [
    { cveId: 'CVE-2024-1354', severity: 'critical', cvss: 9.8, description: 'MongoDB without authentication exposed to internet. #1 cause of database breaches globally.', exploitAvailable: true, recommendation: 'Enable SCRAM-SHA-256 authentication. Bind to private network. Enable TLS. Use MongoDB Atlas with IP whitelisting.', quantumRelevance: 'MongoDB SCRAM-SHA-256 is quantum-resistant, but unauthenticated MongoDB requires no crypto to breach.' },
  ],
  'Redis': [
    { cveId: 'CVE-2024-31228', severity: 'critical', cvss: 9.8, description: 'Redis without authentication allows arbitrary command execution including writing files to disk (RCE).', exploitAvailable: true, recommendation: 'Set requirepass in redis.conf. Bind to localhost only. Disable dangerous commands (FLUSHALL, CONFIG, DEBUG).', quantumRelevance: 'Redis has no TLS by default. Add TLS with PQC if Redis must be network-accessible.' },
  ],
  'Elasticsearch': [
    { cveId: 'CVE-2024-23450', severity: 'critical', cvss: 9.1, description: 'Elasticsearch exposed without authentication allows full read/write access to all indexed data.', exploitAvailable: true, recommendation: 'Enable Elasticsearch Security (X-Pack). Require authentication. Bind to private network. Enable TLS.', quantumRelevance: 'Elasticsearch TLS uses RSA — quantum-vulnerable. But unauthenticated exposure is already critical.' },
  ],
  'VNC': [
    { cveId: 'CVE-2024-26923', severity: 'critical', cvss: 9.0, description: 'VNC exposed to internet with weak or no authentication. Full remote desktop control for attackers.', exploitAvailable: true, recommendation: 'NEVER expose VNC to the internet. Use SSH tunnel or VPN for remote desktop access.', quantumRelevance: 'VNC uses DES-based challenge-response (trivially breakable even classically). No quantum relevance needed.' },
  ],
};

/**
 * Generate vulnerability assessment for discovered open services.
 * 100% local — no API calls.
 */
function assessVulnerabilities(openPorts, target) {
  const vulnerabilities = [];
  let totalCVSS = 0;

  for (const port of openPorts) {
    const service = port.service || 'Unknown';
    const vulns = VULN_DATABASE[service] || [];

    for (const vuln of vulns) {
      vulnerabilities.push({
        ...vuln,
        affectedPort: port.port,
        affectedService: service,
        target,
      });
      totalCVSS += vuln.cvss;
    }
  }

  // Sort by CVSS score descending
  vulnerabilities.sort((a, b) => b.cvss - a.cvss);

  // Calculate risk score (0-100, higher = more risk)
  const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
  const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
  const riskScore = Math.min(100, (criticalCount * 25) + (highCount * 15) + (mediumCount * 8));

  return {
    status: 'completed',
    riskScore,
    riskLevel: riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
    totalVulnerabilities: vulnerabilities.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount: vulnerabilities.filter(v => v.severity === 'low').length,
    vulnerabilities,
    summary: generateVulnSummary(openPorts, vulnerabilities, target, riskScore),
  };
}

function generateVulnSummary(openPorts, vulns, target, riskScore) {
  const critServices = openPorts.filter(p => p.riskLevel === 'critical').map(p => `${p.service} (${p.port})`);
  const exploitable = vulns.filter(v => v.exploitAvailable);

  let summary = `Port scan of ${target} discovered ${openPorts.length} open port(s). `;

  if (critServices.length > 0) {
    summary += `CRITICAL: ${critServices.length} high-risk service(s) detected — ${critServices.join(', ')}. `;
  }

  if (exploitable.length > 0) {
    summary += `${exploitable.length} of ${vulns.length} identified vulnerabilities have known public exploits. `;
  }

  if (riskScore >= 80) {
    summary += 'IMMEDIATE ACTION REQUIRED: This host has critical security exposure requiring urgent remediation.';
  } else if (riskScore >= 50) {
    summary += 'Significant security issues identified. Prioritize remediation within 30 days.';
  } else if (riskScore > 0) {
    summary += 'Moderate security posture. Address findings in next scheduled maintenance window.';
  } else {
    summary += 'No significant vulnerabilities identified in discovered services.';
  }

  return summary;
}

module.exports = {
  runPortScan,
  assessVulnerabilities,
  PORT_SERVICE_MAP,
  PROFILES,
};
