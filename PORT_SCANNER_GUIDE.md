# 🔍 Port Scanner & Vulnerability Assessment — User Guide

> **QuantumShield Scanner** | Privacy-Safe Network Reconnaissance  
> Version 1.0 | Last Updated: April 2026

---

## 📋 Table of Contents

1. [What is Port Scanning?](#what-is-port-scanning)
2. [What is Vulnerability Assessment?](#what-is-vulnerability-assessment)
3. [Why Does QuantumShield Need This?](#why-does-quantumshield-need-this)
4. [How to Access the Feature](#how-to-access-the-feature)
5. [Step-by-Step Usage Guide](#step-by-step-usage-guide)
6. [Scan Profiles Explained](#scan-profiles-explained)
7. [Understanding Your Results](#understanding-your-results)
8. [Valid Targets & Examples](#valid-targets--examples)
9. [When to Use Port Scanning](#when-to-use-port-scanning)
10. [Do's and Don'ts](#dos-and-donts)
11. [Legal & Compliance Notice](#legal--compliance-notice)
12. [Technical Architecture](#technical-architecture)
13. [FAQ](#faq)

---

## What is Port Scanning?

Port scanning is a network reconnaissance technique used to discover **which services are running** on a target host. Every networked service (web servers, databases, email servers, etc.) listens on a specific **port number** (0–65535).

By probing these ports, we can determine:

| Discovery | Why It Matters |
|-----------|---------------|
| **Open ports** | Services actively accepting connections — potential attack surface |
| **Running services** | What software is exposed (SSH, HTTP, MySQL, etc.) |
| **Service versions** | Whether outdated/vulnerable versions are in use (via banner grabbing) |
| **Misconfigurations** | Databases or admin panels accidentally exposed to the internet |
| **Quantum vulnerabilities** | Services using RSA/ECDHE that will be breakable by quantum computers |

### How QuantumShield's Scanner Works

```
┌──────────────┐     TCP SYN     ┌──────────────┐
│  QuantumShield│ ──────────────► │  Target Host │
│  Scanner      │                 │              │
│  (Node.js)    │ ◄────────────── │  Port 22     │ → SYN-ACK = OPEN
│               │                 │  Port 80     │ → SYN-ACK = OPEN
│               │ ◄────────────── │  Port 443    │ → SYN-ACK = OPEN
│               │                 │  Port 3306   │ → RST = CLOSED
│               │                 │  Port 445    │ → Timeout = FILTERED
└──────────────┘                 └──────────────┘
         │
         ▼
   ┌─────────────┐
   │ Banner Grab  │ → Read service identification data
   │ Service DB   │ → Match port → known service
   │ CVE Database │ → Check for known vulnerabilities
   │ Quantum Risk │ → Assess PQC readiness
   └─────────────┘
```

**Key**: Our scanner uses **TCP Connect scanning** via Node.js `net.Socket`. This is the most reliable and cross-platform method. No external tools (nmap, masscan) are required.

---

## What is Vulnerability Assessment?

After discovering open ports and services, QuantumShield automatically performs a **local vulnerability assessment**:

1. **Service Identification** — Maps each open port to its known service (e.g., port 22 → SSH)
2. **Banner Grabbing** — Reads initial data sent by the service to identify version info
3. **CVE Matching** — Checks our local database of 25+ known vulnerabilities
4. **Quantum Risk Analysis** — Evaluates whether the service's cryptography is quantum-safe
5. **Risk Scoring** — Computes a 0-100 composite risk score

### Risk Score Calculation

```
Risk Score = (Critical CVEs × 25) + (High CVEs × 15) + (Medium CVEs × 8)
Maximum score: 100
```

| Risk Score | Level | Color | Action Required |
|-----------|-------|-------|----------------|
| 80–100 | **CRITICAL** | 🔴 Red | Immediate remediation |
| 50–79 | **HIGH** | 🟠 Orange | Fix within 7 days |
| 20–49 | **MEDIUM** | 🟡 Yellow | Fix within 30 days |
| 0–19 | **LOW** | 🟢 Green | Monitor in next cycle |

---

## Why Does QuantumShield Need This?

QuantumShield is a **Post-Quantum Cryptographic (PQC) security scanner**. Port scanning is essential because:

1. **Discover the Attack Surface** — Before you can secure a system, you need to know what's exposed
2. **Find Quantum-Vulnerable Services** — Services using RSA/ECDHE key exchange are vulnerable to future quantum computers
3. **Detect Misconfigurations** — Databases, admin panels, or legacy services accidentally exposed to the internet
4. **Compliance Requirements** — Banking regulations (RBI IT Framework, PCI-DSS) require regular network scanning
5. **Pre-Migration Assessment** — Before migrating crypto to PQC, you need to inventory all exposed services

---

## How to Access the Feature

### Navigation

1. **Login** to QuantumShield with an **admin** or **analyst** account
2. In the **left sidebar**, click on **"Additional Features"** to expand the section
3. Click on **"🔍 Port Scanner"**

> ⚠️ **Note**: Viewers cannot access the Port Scanner. Only **admin** and **analyst** roles have permission to initiate scans.

### Direct URL

```
http://localhost:5173/port-scanner
```

---

## Step-by-Step Usage Guide

### Step 1: Enter a Target

In the **TARGET HOST** field, enter:
- A **hostname**: `scanme.nmap.org`
- An **IP address**: `192.168.1.1`
- A **domain name**: `example.com`

> The scanner automatically strips `http://`, `https://`, paths, and port numbers from the input.

### Step 2: Select a Scan Profile

Choose one of three scan profiles:

| Profile | Ports | Time | Best For |
|---------|-------|------|----------|
| **Quick Scan** | 18 | ~5 sec | Fast check of critical ports |
| **Standard Scan** | 34 | ~15 sec | Recommended for most assessments |
| **Full Scan** | 1,024 | ~2 min | Comprehensive audit of all well-known ports |

### Step 3: Acknowledge Authorization

Check the consent box:
> ☑️ *"I confirm I have authorization to scan this target. Unauthorized scanning may violate computer fraud laws."*

This is a **mandatory step**. The scan button will not activate without consent.

### Step 4: Launch the Scan

Click **"🔍 Launch Port Scan"**. You'll see:
- A **spinning radar animation** while scanning
- A **progress bar** showing ports scanned vs. total
- Live count of **open ports found**

### Step 5: Review Results

When the scan completes, you'll see:

#### Stats Bar (top)
- **Open Ports** — Number of services discovered
- **Ports Scanned** — Total ports checked
- **Vulnerabilities** — CVEs found in discovered services
- **Risk Score** — Composite security rating (0-100)

#### Open Ports Tab
Each open port shows:
- **Port number** and **service name** (e.g., 22 — SSH)
- **Risk level** badge (CRITICAL / HIGH / MEDIUM / LOW)
- **Response time** in milliseconds
- **Service description**
- **Banner data** (if captured from the service)
- **⚛️ Quantum Note** — Whether the service is quantum-vulnerable

#### Vulnerabilities Tab
Each CVE shows:
- **CVE ID** (e.g., CVE-2024-6387)
- **Severity** and **CVSS score**
- **⚡ EXPLOIT** badge if a public exploit exists
- **Description** — What the vulnerability does
- **Recommendation** — How to fix it
- **⚛️ Quantum Threat** — Post-quantum relevance

### Step 6: Review Scan History

Previous scans are stored in MongoDB and displayed in the **"Recent Scans"** panel. Click any previous scan to reload its results.

---

## Scan Profiles Explained

### Quick Scan (18 ports)

```
Ports: 21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 
       3306, 3389, 5432, 8080, 8443, 27017
```

**Best for**: Quick health check. Covers the most commonly exploited ports.

**Services checked**: FTP, SSH, Telnet, SMTP, DNS, HTTP, POP3, IMAP, HTTPS, SMB, MySQL, RDP, PostgreSQL, HTTP-Proxy, HTTPS-Alt, MongoDB

### Standard Scan (34 ports)

```
Ports: 20, 21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 
       443, 445, 465, 587, 993, 995, 1433, 1521, 2049, 3306, 
       3389, 5432, 5900, 5985, 5986, 6379, 8080, 8443, 
       9090, 9200, 11211, 27017
```

**Best for**: Standard security assessment. Includes databases, caching servers, and admin panels.

**Additional services**: MSSQL, Oracle DB, NFS, VNC, WinRM, Redis, Elasticsearch, Memcached

### Full Scan (1,024 ports)

```
Ports: 1–1024 (all IANA well-known ports)
```

**Best for**: Comprehensive audit. Catches services running on non-standard ports.

**Trade-off**: Takes ~2 minutes. Use when doing a thorough security audit.

---

## Valid Targets & Examples

### ✅ Recommended Test Targets

| Target | Description | Expected Results |
|--------|-------------|-----------------|
| `scanme.nmap.org` | Official Nmap test server (explicitly allows scanning) | Ports 22, 80 open |
| `localhost` | Your own machine | Varies by your local services |
| `127.0.0.1` | Same as localhost | Varies by your local services |
| `192.168.x.x` | Devices on your local network | Depends on network devices |

### ✅ Valid Input Formats

| Input | How It's Processed |
|-------|-------------------|
| `example.com` | Scans as-is via DNS resolution |
| `192.168.1.1` | Direct IP scan |
| `http://example.com` | Auto-strips `http://` → scans `example.com` |
| `https://example.com/path` | Auto-strips protocol and path → scans `example.com` |
| `example.com:8080` | Auto-strips port → scans `example.com` (all profile ports) |

### ❌ Invalid Inputs

| Input | Why It Fails |
|-------|-------------|
| (empty) | No target specified |
| `ftp://files.example.com` | FTP protocol not supported as input (enter just the hostname) |
| `192.168.1.0/24` | CIDR ranges not supported (scan individual IPs) |
| `10.0.0.1-10.0.0.50` | IP ranges not supported (scan one at a time) |

---

## When to Use Port Scanning

### ✅ Use Port Scanning When:

1. **Onboarding a new asset** — Before adding a server to your infrastructure, scan it to know what's exposed
2. **After deploying a new service** — Verify only intended ports are open
3. **During security audits** — Regular scans as part of your security hygiene
4. **Incident response** — When investigating a potential breach, scan to identify all exposed services
5. **Before PQC migration** — Inventory all services using quantum-vulnerable cryptography
6. **Compliance assessments** — PCI-DSS, RBI IT Framework, and ISO 27001 all require network scanning
7. **After firewall changes** — Verify that firewall rules are working as expected
8. **Testing new environments** — Scan staging/test servers before go-live

### ❌ Don't Use Port Scanning When:

1. **You don't have authorization** — Never scan targets you don't own or have explicit permission to scan
2. **During peak business hours** — Full scans generate network traffic; schedule during maintenance windows
3. **On production databases** — The scan itself is safe, but always coordinate with DBAs
4. **Across jurisdictions without legal review** — Different countries have different computer fraud laws
5. **As a substitute for penetration testing** — Port scanning finds exposure, not exploitation paths

---

## Do's and Don'ts

### ✅ DO's

| # | Do | Why |
|---|-----|-----|
| 1 | **DO get written authorization** before scanning any system | Legal protection and compliance requirement |
| 2 | **DO start with Quick Scan** before running Full Scan | Saves time, gets critical results first |
| 3 | **DO scan regularly** (weekly/monthly) | New services or misconfigs can appear any time |
| 4 | **DO review quantum risk notes** for each service | Prepare for post-quantum migration |
| 5 | **DO correlate with CBOM findings** | Match exposed services with cryptographic inventory |
| 6 | **DO document all findings** in your remediation tracker | Track progress and prove compliance |
| 7 | **DO scan from outside your network** | See what external attackers would see |
| 8 | **DO remediate CRITICAL findings immediately** | These are actively exploitable vulnerabilities |
| 9 | **DO use Standard or Full profile for compliance** | Quick scan may miss non-standard services |
| 10 | **DO check scan history** for trends over time | Monitor whether your exposure is increasing or decreasing |

### ❌ DON'Ts

| # | Don't | Why |
|---|-------|-----|
| 1 | **DON'T scan targets without authorization** | It's illegal in most jurisdictions (CFAA, IT Act 2000, CMA) |
| 2 | **DON'T scan third-party production servers** | Can trigger IDS/IPS alerts and cause service disruption |
| 3 | **DON'T ignore CRITICAL vulnerabilities** | Services like exposed RDP, SMB, or databases are actively targeted by ransomware |
| 4 | **DON'T assume "closed" means "secure"** | Services may be behind load balancers or WAFs |
| 5 | **DON'T share scan results externally** | Vulnerability reports are sensitive security data |
| 6 | **DON'T run Full Scans on slow networks** | 1,024 concurrent connections can saturate bandwidth |
| 7 | **DON'T scan without coordinating with ops team** | Scans can trigger security alerts and incident responses |
| 8 | **DON'T rely solely on port scanning** | It's one layer of a comprehensive security program |
| 9 | **DON'T scan cloud resources without provider approval** | AWS, Azure, GCP all have acceptable use policies |
| 10 | **DON'T leave databases exposed after discovery** | If MongoDB/MySQL/Redis is internet-facing, fix it NOW |

---

## Legal & Compliance Notice

### ⚠️ Authorization is Mandatory

Port scanning systems you do not own or have explicit permission to scan may violate:

| Law | Jurisdiction | Penalty |
|-----|-------------|---------|
| **Computer Fraud and Abuse Act (CFAA)** | United States | Up to 10 years imprisonment |
| **Information Technology Act 2000, Section 43** | India | Up to ₹1 crore in damages |
| **Computer Misuse Act 1990** | United Kingdom | Up to 10 years imprisonment |
| **General Data Protection Regulation (GDPR)** | European Union | Up to €20 million or 4% of annual turnover |

### Safe Harbor

The following targets are **explicitly safe** to scan for testing:
- `scanme.nmap.org` — Maintained by the Nmap project for testing
- `localhost` / `127.0.0.1` — Your own machine
- Any system you have **written authorization** to test

### Banking Compliance

For PNB (Punjab National Bank) and other financial institutions:
- **RBI Master Direction on IT Framework** — Requires regular vulnerability assessments
- **PCI-DSS Requirement 11.2** — Quarterly internal and external network scans
- **ISO 27001 Control A.12.6.1** — Management of technical vulnerabilities
- **CERT-IN Guidelines** — Mandatory vulnerability reporting for critical infrastructure

---

## Technical Architecture

### Privacy-First Design

```
┌─────────────────────────────────────────────────────┐
│                  QuantumShield                        │
│                                                       │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐  │
│  │ Frontend  │───►│ REST API  │───►│ Port Scanner │  │
│  │ React     │    │ Express   │    │ Node.js net  │  │
│  │           │◄───│           │◄───│              │  │
│  └──────────┘    └───────────┘    └──────┬───────┘  │
│                                          │           │
│                  ┌───────────┐    ┌──────▼───────┐  │
│                  │ MongoDB   │◄───│ Vuln Assess  │  │
│                  │ (Results) │    │ Local CVE DB │  │
│                  └───────────┘    └──────────────┘  │
│                                                       │
│  ✅ Zero external API calls                           │
│  ✅ Zero data sent to third parties                   │
│  ✅ All intelligence computed locally                 │
│  ✅ Full data sovereignty                             │
└─────────────────────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/port-scan` | Admin, Analyst | Initiate a new port scan |
| `GET` | `/api/port-scan` | All authenticated | List all scan history |
| `GET` | `/api/port-scan/:id` | All authenticated | Get scan details + results |

### Request/Response Examples

**Start a scan:**
```json
POST /api/port-scan
{
  "target": "scanme.nmap.org",
  "profile": "standard"
}
```

**Response (immediate):**
```json
{
  "scanId": "661c...",
  "target": "scanme.nmap.org",
  "profile": "standard",
  "status": "running",
  "message": "Port scan initiated. Poll GET /api/port-scan/:id for results."
}
```

**Poll results:**
```json
GET /api/port-scan/661c...

{
  "status": "completed",
  "target": "scanme.nmap.org",
  "portsScanned": 34,
  "scanDuration": 12540,
  "openPorts": [
    {
      "port": 22,
      "state": "open",
      "service": "SSH",
      "riskLevel": "medium",
      "quantumNote": "SSH RSA host keys are quantum-vulnerable..."
    },
    {
      "port": 80,
      "state": "open",
      "service": "HTTP",
      "riskLevel": "high",
      "quantumNote": "No encryption. Upgrade to HTTPS with PQC..."
    }
  ],
  "vulnAssessment": {
    "riskScore": 45,
    "riskLevel": "MEDIUM",
    "totalVulnerabilities": 4,
    "vulnerabilities": [...]
  }
}
```

---

## FAQ

### Q: Does the scanner need external tools like Nmap or Metasploit?
**No.** QuantumShield's port scanner is 100% built with Node.js `net` module. Zero external dependencies. It works on any OS that runs Node.js.

### Q: Does scanning send data to any external server?
**No.** All scanning, service identification, and vulnerability assessment is performed locally. No data leaves your network. This is critical for banking-grade privacy compliance.

### Q: Can I scan multiple targets at once?
Currently, the scanner supports **one target per scan**. You can run multiple scans sequentially, and all results are stored in MongoDB for comparison.

### Q: Will port scanning crash the target server?
**No.** TCP Connect scanning is non-intrusive. It simply attempts a normal TCP connection — the same thing your web browser does. It does not send exploit payloads or crash services.

### Q: How is this different from Nmap?
| Feature | Nmap | QuantumShield Scanner |
|---------|------|----------------------|
| Installation | Requires system install | Built into the app |
| Dependencies | Native binaries | Pure Node.js |
| Quantum analysis | ❌ | ✅ Post-quantum risk notes |
| CVE assessment | Requires NSE scripts | Built-in local CVE DB |
| Banking compliance | Manual reporting | Integrated with CBOM & reports |
| Privacy | Depends on configuration | Zero external data exposure |

### Q: What ports are considered "dangerous"?
Services that should **never** be exposed to the public internet:

| Port | Service | Why It's Dangerous |
|------|---------|-------------------|
| 23 | Telnet | Zero encryption — all data in cleartext |
| 445 | SMB | WannaCry, EternalBlue — #1 ransomware vector |
| 3389 | RDP | BlueKeep — wormable RCE without authentication |
| 3306 | MySQL | Database breach — direct access to banking data |
| 5432 | PostgreSQL | Database breach risk |
| 6379 | Redis | Often no authentication — allows RCE |
| 27017 | MongoDB | #1 cause of database breaches globally |
| 9200 | Elasticsearch | Full data access without authentication |

### Q: How often should I scan?
| Environment | Recommended Frequency |
|-------------|----------------------|
| Production servers | Weekly Quick Scan, Monthly Full Scan |
| Development/staging | Before each deployment |
| New infrastructure | Before go-live |
| After firewall changes | Immediately |
| Compliance audits | Quarterly (PCI-DSS requirement) |

---

> **Document maintained by**: QuantumShield Security Team  
> **Classification**: Internal Use — Do Not Distribute Externally  
> **Next Review Date**: July 2026
