const express = require('express');
const dns = require('dns');
const { protect } = require('../middleware/auth');
const CbomRecord = require('../models/CbomRecord');
const Scan = require('../models/Scan');

const router = express.Router();

// ── Caches (5-minute TTL) ──────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;
const responseCache = new Map();   // key → { data, ts }
const ipInfoCache = new Map();     // ip  → { result, ts }

function getCached(key) {
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  responseCache.set(key, { data, ts: Date.now() });
}

// ── Shared: get scan IDs visible to user ───────────────
async function getUserScanIds(user) {
  const filter = (user.role === 'admin' || user.role === 'viewer') ? {} : { initiatedBy: user._id };
  const scans = await Scan.find(
    { ...filter, status: { $in: ['completed', 'partial'] } },
    '_id'
  ).lean();
  return scans.map(s => s._id);
}

// ── Shared: get completed records (only needed fields) ─
// Cache records per user to avoid duplicate DB hits when
// multiple tabs are loaded in the same session
const recordsCache = new Map();

async function getRecords(user) {
  const key = `records_${user._id}`;
  const cached = recordsCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const scanIds = await getUserScanIds(user);
  const data = await CbomRecord.find(
    { scanId: { $in: scanIds }, status: 'completed' },
    'host port certificate tlsVersions negotiatedCipher scanId createdAt'
  )
    .sort({ createdAt: -1 })
    .lean();

  recordsCache.set(key, { data, ts: Date.now() });
  return data;
}

// @route   GET /api/asset-inventory/domains
router.get('/domains', protect, async (req, res) => {
  try {
    const cacheKey = `domains_${req.user._id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const records = await getRecords(req.user);

    const domainMap = new Map();
    for (const record of records) {
      if (domainMap.has(record.host)) continue;
      const cert = record.certificate || {};
      domainMap.set(record.host, {
        host: record.host,
        port: record.port,
        detectionDate: record.createdAt,
        domainName: cert.commonName || record.host,
        registrationDate: cert.validFrom || null,
        registrar: cert.issuerOrg || cert.issuer || null,
        companyName: cert.subject || null,
        scanId: record.scanId
      });
    }

    const result = Array.from(domainMap.values());
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/asset-inventory/ssl
router.get('/ssl', protect, async (req, res) => {
  try {
    const cacheKey = `ssl_${req.user._id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const records = await getRecords(req.user);

    const sslMap = new Map();
    for (const record of records) {
      if (sslMap.has(record.host)) continue;
      const cert = record.certificate || {};
      sslMap.set(record.host, {
        host: record.host,
        port: record.port,
        detectionDate: record.createdAt,
        sslShaFingerprint: cert.fingerprint256 || null,
        validFrom: cert.validFrom || null,
        commonName: cert.commonName || record.host,
        companyName: cert.subject || null,
        certificateAuthority: cert.issuerOrg || cert.issuer || null,
        scanId: record.scanId
      });
    }

    const result = Array.from(sslMap.values());
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── IP helpers ─────────────────────────────────────────
const dnsCache = new Map(); // host → { ip, ts }

function resolveHost(host) {
  // Check DNS cache first
  const cached = dnsCache.get(host);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return Promise.resolve(cached.ip);

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    dnsCache.set(host, { ip: host, ts: Date.now() });
    return Promise.resolve(host);
  }
  return new Promise(resolve => {
    dns.lookup(host, { family: 4 }, (err, address) => {
      const ip = err ? null : address;
      dnsCache.set(host, { ip, ts: Date.now() });
      resolve(ip);
    });
  });
}

function deriveSubnet(ip) {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

// In-flight dedup for ipinfo requests
const ipInfoInFlight = new Map();

async function fetchIpInfo(ip) {
  if (!ip) return { asn: null, location: null, org: null };

  // Check per-IP cache
  const cached = ipInfoCache.get(ip);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result;

  // Dedup: if already in-flight, wait for it
  if (ipInfoInFlight.has(ip)) return ipInfoInFlight.get(ip);

  const promise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`https://ipinfo.io/${ip}/json`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) {
        const fallback = { asn: null, location: null, org: null };
        ipInfoCache.set(ip, { result: fallback, ts: Date.now() });
        return fallback;
      }
      const data = await resp.json();
      const result = {
        asn: data.org ? data.org.split(' ')[0] : null,
        location: [data.city, data.region, data.country].filter(Boolean).join(', ') || null,
        org: data.org || null
      };
      ipInfoCache.set(ip, { result, ts: Date.now() });
      return result;
    } catch {
      const fallback = { asn: null, location: null, org: null };
      ipInfoCache.set(ip, { result: fallback, ts: Date.now() });
      return fallback;
    } finally {
      ipInfoInFlight.delete(ip);
    }
  })();

  ipInfoInFlight.set(ip, promise);
  return promise;
}

// @route   GET /api/asset-inventory/ip
router.get('/ip', protect, async (req, res) => {
  try {
    const cacheKey = `ip_${req.user._id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const records = await getRecords(req.user);

    // Aggregate all distinct ports per host
    const hostMap = new Map();
    for (const record of records) {
      if (hostMap.has(record.host)) {
        hostMap.get(record.host).ports.add(record.port);
      } else {
        hostMap.set(record.host, { record, ports: new Set([record.port]) });
      }
    }

    // Step 1: Resolve all hostnames to IPs in parallel
    const entries = Array.from(hostMap.values());
    const resolvedIPs = await Promise.all(entries.map(e => resolveHost(e.record.host)));

    // Step 2: Batch-fetch ipinfo for unique IPs in parallel (max 10 concurrent)
    const uniqueIPs = [...new Set(resolvedIPs.filter(Boolean))];
    // Limit concurrency to avoid rate-limiting
    const BATCH = 10;
    for (let i = 0; i < uniqueIPs.length; i += BATCH) {
      await Promise.all(uniqueIPs.slice(i, i + BATCH).map(ip => fetchIpInfo(ip)));
    }

    // Step 3: Build results (ipinfo is now cached, so instant)
    const ipEntries = entries.map(({ record, ports }, i) => {
      const cert = record.certificate || {};
      const ip = resolvedIPs[i];
      const subnet = deriveSubnet(ip);
      const ipInfo = ip ? (ipInfoCache.get(ip)?.result || { asn: null, location: null, org: null }) : { asn: null, location: null, org: null };

      return {
        host: record.host,
        detectionDate: record.createdAt,
        ipAddress: ip || record.host,
        ports: Array.from(ports).sort((a, b) => a - b),
        subnet,
        asn: ipInfo.asn,
        netname: ipInfo.org || cert.issuerOrg || null,
        location: ipInfo.location,
        company: cert.subject || null,
        scanId: record.scanId
      };
    });

    setCache(cacheKey, ipEntries);
    res.json(ipEntries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/asset-inventory/software
router.get('/software', protect, async (req, res) => {
  try {
    const cacheKey = `software_${req.user._id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const records = await getRecords(req.user);

    const softwareList = [];
    for (const record of records) {
      const cert = record.certificate || {};
      const cipher = record.negotiatedCipher || {};

      // TLS/SSL product entry
      const tlsBest = record.tlsVersions?.bestVersion || null;
      const cipherName = cipher.standardName || cipher.name || null;
      const product = [tlsBest, cipherName].filter(Boolean).join(' / ') || record.host;

      softwareList.push({
        host: record.host,
        detectionDate: record.createdAt,
        product,
        version: tlsBest || null,
        type: cert.keyAlgorithm
          ? `${cert.keyAlgorithm}${cert.keySize ? ` (${cert.keySize}-bit)` : ''}`
          : 'TLS Endpoint',
        port: record.port,
        companyName: cert.subject || null,
        scanId: record.scanId
      });
    }

    setCache(cacheKey, softwareList);
    res.json(softwareList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
