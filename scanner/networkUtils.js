const net = require('net');

/**
 * Converts an IP address string to a 32-bit integer.
 */
function ipToInt(ip) {
  return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Converts a 32-bit integer back to an IP address string.
 */
function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.');
}

/**
 * Checks if a string is a valid IPv4 address.
 */
function isValidIp(ip) {
  return net.isIPv4(ip);
}

/**
 * Checks if a string is a valid CIDR notation (e.g., 192.168.1.0/24).
 */
function isValidCidr(cidr) {
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;
  
  const ip = parts[0];
  const mask = parseInt(parts[1], 10);
  
  return isValidIp(ip) && mask >= 0 && mask <= 32;
}

/**
 * Parses a CIDR block and returns an array of all usable IP addresses within it.
 * Note: Avoids returning massive arrays for masks smaller than /16 to prevent memory crash.
 * 
 * @param {string} cidr Example: '192.168.1.0/24'
 * @returns {Array<string>} Array of IP addresses
 */
function expandCidr(cidr) {
  if (!isValidCidr(cidr)) {
    throw new Error('Invalid CIDR format');
  }

  const [ipStr, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  if (prefix < 16) {
    throw new Error('CIDR prefix too small (too many IP addresses). Minimum supported prefix is /16.');
  }

  const ipInt = ipToInt(ipStr);
  
  // Calculate the bitmask
  // e.g., for /24, mask is 11111111.11111111.11111111.00000000
  const mask = ~((1 << (32 - prefix)) - 1) >>> 0;
  
  // Network address (first IP)
  const networkInt = (ipInt & mask) >>> 0;
  
  // Broadcast address (last IP)
  const broadcastInt = (networkInt | ~mask) >>> 0;
  
  const ips = [];
  
  // Typically we skip network (.0) and broadcast (.255) for typical subnets,
  // but for scanning, sometimes useful to try them all depending on the network.
  // We'll skip the very first and last to be standard, unless it's a /31 or /32.
  if (prefix === 32) {
    return [intToIp(networkInt)];
  } else if (prefix === 31) {
    return [intToIp(networkInt), intToIp(broadcastInt)];
  }

  for (let i = networkInt + 1; i <= broadcastInt - 1; i++) {
    ips.push(intToIp(i));
  }

  return ips;
}

/**
 * Extremely basic ping-like host discovery (attempts TCP connection to 80 or 443).
 * Actual ICMP ping requires root privileges in Node.js, so TCP connect is safer.
 *
 * @param {string} host 
 * @param {number} timeout 
 * @returns {Promise<boolean>}
 */
function isHostAlive(host, timeout = 2000) {
  return new Promise((resolve) => {
    let resolved = false;

    // We check both 80 and 443 in parallel
    const checkTarget = (port) => {
      return new Promise((res) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.on('connect', () => {
          socket.destroy();
          res(true);
        });

        socket.on('timeout', () => {
          socket.destroy();
          res(false);
        });

        socket.on('error', () => {
          // Connection refused means the host is alive but port is closed!
          // We consider it alive.
          res(true);
        });

        socket.connect(port, host);
      });
    };

    Promise.all([checkTarget(80), checkTarget(443)]).then((results) => {
      if (!resolved) {
        resolved = true;
        resolve(results.includes(true));
      }
    });

    // Failsafe overall timeout just in case socket timeout doesn't fire
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeout + 500);
  });
}

module.exports = {
  isValidIp,
  isValidCidr,
  expandCidr,
  isHostAlive
};
