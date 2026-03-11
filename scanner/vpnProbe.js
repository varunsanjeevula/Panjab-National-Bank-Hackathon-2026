/**
 * VPN Endpoint Scanner
 * Probes common VPN protocol ports and detects VPN service presence.
 * This is a non-intrusive detection — it only checks if ports respond.
 */
const net = require('net');
const dgram = require('dgram');

/**
 * Check if a TCP port is open
 */
function checkTCPPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ open: true, port, protocol: 'TCP' });
    });
    socket.on('timeout', () => { socket.destroy(); resolve({ open: false, port, protocol: 'TCP' }); });
    socket.on('error', () => { socket.destroy(); resolve({ open: false, port, protocol: 'TCP' }); });
    socket.connect(port, host);
  });
}

/**
 * Check if a UDP port responds (best-effort detection)
 */
function checkUDPPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const client = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      client.close();
      // UDP: no response might mean port is open (filtered)
      resolve({ open: 'filtered', port, protocol: 'UDP' });
    }, timeout);

    // Send a minimal probe packet
    const probe = Buffer.alloc(8, 0);
    client.send(probe, 0, probe.length, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        client.close();
        resolve({ open: false, port, protocol: 'UDP', error: err.message });
      }
    });

    client.on('message', () => {
      clearTimeout(timer);
      client.close();
      resolve({ open: true, port, protocol: 'UDP' });
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      client.close();
      resolve({ open: false, port, protocol: 'UDP', error: err.message });
    });
  });
}

/**
 * Classify VPN protocol based on port
 */
function classifyVPNProtocol(port) {
  const portMap = {
    500: { name: 'IPSec IKEv1/IKEv2', protocol: 'IKE', pqcStatus: 'Not Quantum-Safe', recommendation: 'Migrate to PQ-IKEv2 when standardized' },
    4500: { name: 'IPSec NAT-T', protocol: 'IKE-NAT-T', pqcStatus: 'Not Quantum-Safe', recommendation: 'Ensure IKEv2 uses ML-KEM for key exchange' },
    1194: { name: 'OpenVPN', protocol: 'OpenVPN', pqcStatus: 'Potentially Upgradable', recommendation: 'Use OpenVPN with --tls-crypt and PQC cipher suites' },
    51820: { name: 'WireGuard', protocol: 'WireGuard', pqcStatus: 'Not Quantum-Safe (Curve25519)', recommendation: 'WireGuard uses Curve25519 — vulnerable to quantum. Consider Rosenpass or PQ-WireGuard' },
    1701: { name: 'L2TP', protocol: 'L2TP', pqcStatus: 'Not Quantum-Safe', recommendation: 'L2TP/IPSec uses classical key exchange — migrate to IKEv2 with PQC' },
    1723: { name: 'PPTP', protocol: 'PPTP', pqcStatus: 'Critical - Insecure', recommendation: 'PPTP is broken even classically — remove immediately' },
    443: { name: 'SSTP/SSL VPN', protocol: 'SSTP', pqcStatus: 'Depends on TLS config', recommendation: 'Ensure TLS 1.3 with PQC-hybrid cipher suites' },
  };
  return portMap[port] || { name: `Unknown (port ${port})`, protocol: 'Unknown', pqcStatus: 'Unknown', recommendation: 'Manual inspection required' };
}

/**
 * Scan a host for VPN endpoints
 */
async function scanVPNEndpoints(host) {
  const startTime = Date.now();

  // Define VPN ports to probe
  const tcpPorts = [443, 1194, 1701, 1723];
  const udpPorts = [500, 4500, 1194, 51820];

  // Probe all ports in parallel
  const [tcpResults, udpResults] = await Promise.all([
    Promise.all(tcpPorts.map(p => checkTCPPort(host, p))),
    Promise.all(udpPorts.map(p => checkUDPPort(host, p)))
  ]);

  // Combine and classify
  const detectedServices = [];

  for (const result of [...tcpResults, ...udpResults]) {
    if (result.open === true || result.open === 'filtered') {
      const classification = classifyVPNProtocol(result.port);
      detectedServices.push({
        port: result.port,
        protocol: result.protocol,
        status: result.open === true ? 'Open' : 'Filtered',
        ...classification
      });
    }
  }

  // Deduplicate by port
  const unique = [];
  const seen = new Set();
  for (const svc of detectedServices) {
    const key = `${svc.port}-${svc.protocol}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(svc);
    }
  }

  const scanDuration = Date.now() - startTime;

  return {
    host,
    scanDuration: `${scanDuration}ms`,
    vpnServicesDetected: unique.length,
    services: unique,
    overallAssessment: unique.length === 0
      ? 'No VPN endpoints detected'
      : unique.some(s => s.pqcStatus.includes('Critical'))
        ? 'Critical — Insecure VPN protocols detected'
        : unique.every(s => s.pqcStatus.includes('Quantum-Safe'))
          ? 'All VPN endpoints are PQC-ready'
          : 'VPN endpoints require PQC migration'
  };
}

module.exports = { scanVPNEndpoints };
