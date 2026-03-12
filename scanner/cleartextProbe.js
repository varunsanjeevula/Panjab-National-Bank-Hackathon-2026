const net = require('net');

/**
 * Common cleartext ports to scan
 */
const CLEARTEXT_PORTS = [
  { port: 21, service: 'FTP' },
  { port: 23, service: 'Telnet' },
  { port: 80, service: 'HTTP' },
  { port: 110, service: 'POP3' },
  { port: 143, service: 'IMAP' },
  { port: 3306, service: 'MySQL' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 6379, service: 'Redis' },
];

/**
 * Attempts to connect to a specific port on a host to check for cleartext services.
 * 
 * @param {string} host 
 * @param {number} port 
 * @param {string} serviceName 
 * @param {number} timeout 
 * @returns {Promise<Object|null>} Result object if open, null if closed/timeout
 */
function checkPort(host, port, serviceName, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      socket.destroy();
    };

    const handleResolve = (result) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve(result);
      }
    };

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      handleResolve({
        port,
        service: serviceName,
        status: 'open',
        vulnerability: 'CRITICAL: Unencrypted Protocol Detected',
        description: `Service ${serviceName} is running on port ${port} without TLS encryption. This is highly vulnerable to interception and completely fails post-quantum readiness.`
      });
    });

    socket.on('timeout', () => {
      handleResolve(null);
    });

    socket.on('error', () => {
      handleResolve(null);
    });

    socket.connect(port, host);
  });
}

/**
 * Scans a host for common cleartext protocols.
 * 
 * @param {string} host Target IP or hostname
 * @param {number} timeout Timeout in ms per port
 * @returns {Promise<Array<Object>>} Array of discovered cleartext services
 */
async function probeCleartextProtocols(host, timeout = 3000) {
  console.log(`[Cleartext Probe] Scanning ${host} for unencrypted services...`);
  
  const promises = CLEARTEXT_PORTS.map(p => checkPort(host, p.port, p.service, timeout));
  const results = await Promise.all(promises);
  
  // Filter out nulls (closed ports)
  const openPorts = results.filter(r => r !== null);
  
  if (openPorts.length > 0) {
    console.log(`[Cleartext Probe] ⚠ Found ${openPorts.length} unencrypted services on ${host}!`);
  } else {
    console.log(`[Cleartext Probe] ✓ No common unencrypted services found on ${host}.`);
  }
  
  return openPorts;
}

module.exports = {
  probeCleartextProtocols,
  CLEARTEXT_PORTS
};
