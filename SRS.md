# Software Requirements Specification (SRS)

## **QuantumShield Scanner**

### Quantum-Proof Cryptographic Assessment & CBOM Generator for Public-Facing Banking Applications

---

**Document Version:** 1.0  
**Date:** 10th March 2026  
**Team Name:** \<Team Name\>  
**Project Name:** QuantumShield Scanner  

---

## Declaration

The purpose of this Software Requirements Specification (SRS) document is to identify and document the user requirements for the **QuantumShield Scanner**. The end deliverable software that will be supplied by **\<Team Name\>** will comprise of all the requirements documented in the current document and will be operated in the manner specified in the document. The source code will be developed subsequently based on these requirements and will formally go through code review during the testing process.

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 [Purpose](#11-purpose)
   - 1.2 [Scope](#12-scope)
   - 1.3 [Intended Audience](#13-intended-audience)
2. [Overall Description](#2-overall-description)
   - 2.1 [Product Perspective](#21-product-perspective)
   - 2.2 [Product Functions](#22-product-functions)
   - 2.3 [User Classes and Characteristics](#23-user-classes-and-characteristics)
   - 2.4 [Operating Environment](#24-operating-environment)
   - 2.5 [Design and Implementation Constraints](#25-design-and-implementation-constraints)
   - 2.6 [Assumptions and Dependencies](#26-assumptions-and-dependencies)
3. [Specific Requirements](#3-specific-requirements)
   - 3.1 [Functional Requirements](#31-functional-requirements)
   - 3.2 [External Interface Requirements](#32-external-interface-requirements)
   - 3.3 [System Features](#33-system-features)
   - 3.4 [Non-functional Requirements](#34-non-functional-requirements)
4. [Technological Requirements](#4-technological-requirements)
   - 4.1 [Technologies Used in Development](#41-technologies-used-in-development-of-the-web-application)
   - 4.2 [I.D.E. (Integrated Development Environment)](#42-ide-integrated-development-environment)
   - 4.3 [Database Management Software](#43-database-management-software)
5. [Security Requirements](#5-security-requirements)

---

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to define the complete software requirements for the **QuantumShield Scanner** — a web-based cryptographic assessment tool designed to scan public-facing banking applications (web servers, APIs, and systems) to:

- **Discover** all cryptographic assets and configurations in use (TLS certificates, cipher suites, key exchange mechanisms, protocol versions).
- **Generate** a Cryptographic Bill of Materials (CBOM) inventory for each scanned asset.
- **Assess** quantum-readiness of each asset against NIST Post-Quantum Cryptography (PQC) standards (FIPS 203, 204, 205, 206).
- **Label** each asset with a quantum-safety status: **"PQC Ready"**, **"Hybrid Mode"**, or **"Not PQC Ready"**.
- **Recommend** actionable migration steps for non-quantum-safe assets.

This SRS serves as the authoritative reference for the design, development, and testing of the QuantumShield Scanner.

### 1.2 Scope

The **QuantumShield Scanner** is scoped to:

**In Scope:**
- Scanning **public-facing** (internet-accessible) banking applications including:
  - Web Servers (HTTPS endpoints)
  - RESTful / SOAP APIs
  - TLS-based VPN endpoints (IPSec IKEv2, OpenVPN, WireGuard)
- TLS handshake analysis and cipher suite enumeration
- X.509 certificate chain extraction and analysis
- TLS protocol version detection (TLS 1.0, 1.1, 1.2, 1.3)
- Key exchange algorithm identification (RSA, DHE, ECDHE, X25519, ML-KEM/Kyber)
- Signature algorithm identification (RSA, ECDSA, EdDSA, ML-DSA/Dilithium, SLH-DSA/SPHINCS+)
- Symmetric cipher and hash algorithm identification
- CBOM report generation in JSON, CSV, and PDF formats
- Quantum-safety classification and digital labeling
- Actionable remediation recommendations for non-PQC-ready assets

**Out of Scope:**
- Scanning internal (intranet) applications
- Active exploitation or penetration testing
- Modification of target system configurations
- Scanning non-TLS protocols (e.g., plain HTTP, FTP, SMTP without STARTTLS)
- Hardware Security Module (HSM) internal assessments

### 1.3 Intended Audience

| Audience | Purpose |
|---|---|
| **Hackathon Judges** | Evaluate the technical depth, innovation, and completeness of the solution |
| **Development Team** | Reference for implementation, coding, and unit testing |
| **Security Analysts / CISOs** | Understand the tool's capabilities for quantum-risk assessment |
| **Bank IT Administrators** | Operate the scanner and interpret the generated CBOM reports |
| **Compliance Officers** | Verify alignment with NIST PQC standards and regulatory requirements |

---

## 2. Overall Description

### 2.1 Product Perspective

The **QuantumShield Scanner** is a **standalone web application** that operates as a non-intrusive, read-only cryptographic assessment tool. It does not modify, intercept, or disrupt any target system. It functions by:

1. Initiating standard TLS handshakes to target endpoints.
2. Passively extracting negotiated cryptographic parameters.
3. Analyzing the extracted data against a knowledge base of quantum-vulnerable and quantum-safe algorithms.
4. Generating structured CBOM reports with quantum-safety labels.

**System Context Diagram:**

```
┌───────────────────┐       TLS Handshake        ┌──────────────────────┐
│                   │ ◄──────────────────────────►│  Target Public-Facing│
│  QuantumShield    │    Certificate Exchange      │  Banking Application │
│  Scanner          │ ◄──────────────────────────►│  (Web/API/VPN)       │
│  (Web Application)│    Cipher Negotiation        │                      │
│                   │ ◄──────────────────────────►│                      │
└────────┬──────────┘                              └──────────────────────┘
         │
         │  Stores Results
         ▼
┌───────────────────┐
│   MongoDB         │
│   (CBOM Database) │
└───────────────────┘
```

The product is a **new, self-contained system** and does not replace or integrate with any existing banking software. It operates externally as an assessment/audit tool.

### 2.2 Product Functions

The major functions of the QuantumShield Scanner are:

| ID | Function | Description |
|---|---|---|
| **PF-01** | Target Input Management | Accept single domains, IP addresses, bulk CSV uploads, or CIDR ranges as scan targets |
| **PF-02** | TLS Handshake Probing | Initiate TLS connections to targets across multiple protocol versions (TLS 1.0–1.3) and extract negotiated parameters |
| **PF-03** | Certificate Chain Extraction | Extract and parse the full X.509 certificate chain (leaf, intermediate, root), including key algorithm, key size, signature algorithm, validity period, issuer, and subject |
| **PF-04** | Cipher Suite Enumeration | Enumerate all supported cipher suites on the target and decompose each into key exchange, bulk encryption, and MAC components |
| **PF-05** | Protocol Version Detection | Detect all supported TLS versions on the target and flag deprecated versions (TLS 1.0, 1.1) |
| **PF-06** | VPN Endpoint Detection | Probe common VPN ports (UDP 443, UDP 500/4500, TCP 1194) and identify VPN type and its cipher configuration |
| **PF-07** | API Endpoint Scanning | Scan RESTful/SOAP API endpoints for their TLS configurations |
| **PF-08** | CBOM Generation | Compile all discovered cryptographic parameters into a structured Cryptographic Bill of Materials in JSON, CSV, and PDF formats |
| **PF-09** | Quantum-Safety Assessment | Classify each cryptographic element as quantum-safe or quantum-vulnerable based on NIST PQC standards |
| **PF-10** | Digital Labeling | Award a **"PQC Ready"** / **"Fully Quantum Safe"** digital certificate/label to assets using NIST-standardized PQC algorithms; flag non-compliant assets as **"Not PQC Ready"** |
| **PF-11** | Remediation Recommendations | Generate specific, actionable migration recommendations for each non-PQC-ready asset |
| **PF-12** | Dashboard & Visualization | Provide a real-time dashboard showing scan results, quantum-safety distribution, risk heatmaps, and trend analysis |
| **PF-13** | Scan History & Comparison | Store historical scan results and allow comparison between scans to track PQC migration progress |
| **PF-14** | Report Export | Export CBOM and assessment reports in JSON, CSV, and PDF formats |

### 2.3 User Classes and Characteristics

| User Class | Description | Technical Expertise | Frequency of Use |
|---|---|---|---|
| **Security Analyst** | Primary user who configures and executes scans, interprets results, and plans remediation | High — understands TLS, cryptography, and PQC concepts | Daily / Weekly |
| **CISO / Security Manager** | Reviews dashboard and reports for executive decision-making on PQC migration strategy | Medium — understands risk posture but may not configure scans | Weekly / Monthly |
| **IT Administrator** | Provides target asset lists, implements recommended changes on servers | High — manages server configurations but may not deeply understand PQC | As needed |
| **Compliance / Audit Officer** | Uses reports to verify regulatory compliance with NIST/RBI PQC directives | Low-Medium — needs clear, non-technical summaries | Quarterly / Audit cycles |
| **System Administrator (Admin)** | Manages user accounts, system configuration, and scheduled scans | High — full system administration skills | As needed |

### 2.4 Operating Environment

The operating environment for the **QuantumShield Scanner** is as listed below:

| Component | Specification |
|---|---|
| **Server System** | Cloud-hosted or on-premise Linux server (Ubuntu 22.04 LTS or later) |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 / CentOS Stream 9 (Server); Windows 10+/macOS 13+ (Client Browser) |
| **Database** | MongoDB 7.0+ (NoSQL — for flexible CBOM document storage) |
| **Platform** | Node.js 20 LTS (Backend Runtime) |
| **Technology** | React.js (Frontend), Express.js (Backend API), Node.js `tls`/`crypto` modules (Scanner Engine) |
| **API** | RESTful API architecture with JSON request/response format |
| **Web Server** | Nginx (Reverse Proxy) or Node.js built-in HTTP server |
| **Browser Support** | Google Chrome 120+, Mozilla Firefox 120+, Microsoft Edge 120+ (HTML5-compliant) |
| **Network** | Outbound internet access required for scanning public-facing targets; HTTPS (TLS 1.2+) for all internal communication |

### 2.5 Design and Implementation Constraints

#### 1. Technical Constraints (Deployment)

| Constraint | Description |
|---|---|
| **Network Configuration** | The application requires outbound internet access to reach public-facing target endpoints. Firewall rules must allow outbound connections on ports 443 (HTTPS), 80 (HTTP), 500/4500 (IPSec), 1194 (OpenVPN), and configurable custom ports. |
| **Hosting Environment** | The scanner itself should be deployed within the bank's secured intranet/DMZ, with controlled outbound access to public endpoints. The scanner dashboard is accessible only via intranet. |
| **Scan Rate Limiting** | The scanner must implement configurable rate limiting to avoid triggering IDS/IPS systems on target endpoints. Default: max 10 concurrent connections, 1-second delay between handshakes. |

#### 2. Security Constraints

| Constraint | Description |
|---|---|
| **Access Control** | Role-Based Access Control (RBAC) must be implemented. Only authorized Security Analysts and Administrators can initiate scans. Compliance Officers have read-only access to reports. |
| **Data Encryption** | All data transmitted between the client browser and the scanner server must use HTTPS (TLS 1.2 or higher). All stored CBOM data must be encrypted at rest using AES-256. |
| **Authentication** | Multi-factor authentication (MFA) must be supported for all user accounts. Session tokens must expire after 30 minutes of inactivity. |
| **Audit Logging** | All scan initiations, report generations, and user actions must be logged with user ID, timestamp, IP address, and action details. |

#### 3. Performance Constraints

| Constraint | Description |
|---|---|
| **Scan Throughput** | The system must be capable of scanning at least 100 endpoints per hour under normal operating conditions. |
| **Failover Mechanisms** | The application must implement graceful failure handling — if a target endpoint is unreachable or times out, the scan must continue with remaining targets and log the failure. |
| **Concurrent Users** | The dashboard must support at least 20 concurrent users without performance degradation. |

#### 4. Compliance Constraints

| Constraint | Description |
|---|---|
| **NIST PQC Standards** | All quantum-safety assessments must comply with NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), and FIPS 206 (FN-DSA) standards. |
| **Non-Disruptive Operation** | The scanner must operate in a **read-only, passive** manner. It must NOT disrupt, modify, or degrade live banking services in any way. |
| **Report Formats** | All reports must be generated in machine-readable formats: JSON, XML, and CSV. Human-readable PDF reports must also be available. |
| **Public-Facing Only** | The scanner must operate exclusively on public-facing (internet-accessible) applications. Internal/intranet assets are out of scope. |

#### 5. User Interface Constraints

| Constraint | Description |
|---|---|
| **User Experience Consistency** | The web interface must maintain consistent design language, navigation patterns, and terminology across all pages to minimize user confusion. |
| **Responsive Design** | The dashboard must be responsive and functional on screen sizes from 1024px (tablet landscape) to 2560px (4K monitor). |
| **Accessibility** | The interface must comply with WCAG 2.1 Level AA accessibility standards. |

### 2.6 Assumptions and Dependencies

#### Assumptions

| ID | Assumption |
|---|---|
| **A-01** | End users will access the application using HTML5-compliant browsers such as Google Chrome (v120+), Mozilla Firefox (v120+), or Microsoft Edge (v120+). |
| **A-02** | All target public-facing banking applications use TLS-based communication (HTTPS) for their public interfaces. |
| **A-03** | The scanner will have unrestricted outbound internet access to reach target endpoints on standard ports (443, 80, 500, 4500, 1194). |
| **A-04** | Target endpoints will respond to standard TLS `ClientHello` messages and complete the handshake process. |
| **A-05** | NIST PQC algorithms (ML-KEM, ML-DSA, SLH-DSA, FN-DSA) are standardized and their OIDs are registered in public certificate authorities for detection purposes. |
| **A-06** | Users operating the scanner have proper authorization to scan the target endpoints (i.e., scanning is performed on the bank's own infrastructure). |
| **A-07** | The server hosting the scanner has sufficient compute resources (minimum 4 vCPUs, 8 GB RAM, 50 GB storage). |

#### Dependencies

| ID | Dependency | Impact |
|---|---|---|
| **D-01** | **MongoDB Database** | The application is dependent on MongoDB for storing scan results, CBOM data, user accounts, and audit logs. Any downtime or performance degradation of MongoDB will directly impact application functionality. |
| **D-02** | **Node.js TLS/Crypto Modules** | The scanner engine depends on Node.js built-in `tls` and `crypto` modules for performing TLS handshakes and certificate parsing. Updates to Node.js may affect TLS behavior. |
| **D-03** | **NIST PQC Algorithm OID Registry** | Quantum-safety classification depends on an up-to-date mapping of NIST PQC algorithm OIDs. This registry must be maintained as new PQC algorithms are standardized. |
| **D-04** | **IANA Cipher Suite Registry** | Cipher suite decomposition depends on the IANA TLS Cipher Suite Registry for mapping cipher suite IDs to their components. |
| **D-05** | **Internet Connectivity** | Outbound internet access is required for scanning public-facing endpoints. Loss of connectivity will prevent scan execution. |
| **D-06** | **OpenSSL / LibreSSL Libraries** | Advanced TLS probing (especially for PQC cipher suite negotiation) may depend on OpenSSL 3.2+ or OQS-OpenSSL for PQC support. |

---

## 3. Specific Requirements

### 3.1 Functional Requirements

| Req ID | Requirement | Description | Priority |
|---|---|---|---|
| **FR-01** | Target Input | The system shall accept scan targets as: (a) single domain/IP, (b) comma-separated list, (c) CSV file upload, (d) CIDR range notation. | High |
| **FR-02** | Port Configuration | The system shall allow users to specify custom ports to scan (default: 443). | Medium |
| **FR-03** | TLS Handshake Execution | The system shall initiate TLS `ClientHello` to each target and capture the `ServerHello` response including selected cipher suite, TLS version, and server certificate. | High |
| **FR-04** | Multi-Version TLS Probing | The system shall probe each target with TLS 1.0, 1.1, 1.2, and 1.3 `ClientHello` messages to determine all supported protocol versions. | High |
| **FR-05** | Certificate Extraction | The system shall extract the complete X.509 certificate chain (leaf, intermediate, root) from each target. | High |
| **FR-06** | Certificate Parsing | The system shall parse each certificate for: Subject, Issuer, Validity (Not Before/Not After), Key Algorithm (RSA/ECDSA/EdDSA/ML-DSA), Key Size, Signature Algorithm, Serial Number, and SANs. | High |
| **FR-07** | Cipher Suite Enumeration | The system shall enumerate all cipher suites supported by the target by sending multiple `ClientHello` messages with varying cipher suite lists. | High |
| **FR-08** | Cipher Suite Decomposition | The system shall decompose each cipher suite ID into its components: Key Exchange Algorithm, Bulk Encryption Algorithm, MAC Algorithm, and PRF. | High |
| **FR-09** | Key Exchange Analysis | The system shall identify the key exchange algorithm (RSA, DHE, ECDHE, X25519, X448, ML-KEM/Kyber, Hybrid X25519+Kyber768) used in each cipher suite. | High |
| **FR-10** | Symmetric Cipher Analysis | The system shall identify the symmetric encryption algorithm (AES-128-CBC, AES-256-GCM, ChaCha20-Poly1305, 3DES, etc.) and key size. | High |
| **FR-11** | Hash/MAC Analysis | The system shall identify the hash algorithm (SHA-256, SHA-384, SHA-1, MD5) used in signatures, MACs, and PRFs. | High |
| **FR-12** | PQC Algorithm Detection | The system shall detect NIST-standardized PQC algorithms: ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205), FN-DSA (FIPS 206) via OID matching in certificates and cipher suite negotiation. | High |
| **FR-13** | Hybrid Key Exchange Detection | The system shall detect hybrid key exchange mechanisms (e.g., X25519+ML-KEM-768) and classify them appropriately. | High |
| **FR-14** | Quantum-Safety Classification | The system shall classify each cryptographic element into: **Quantum-Safe** (uses NIST PQC algorithms), **Hybrid** (uses classical + PQC), **Quantum-Vulnerable** (uses only classical algorithms susceptible to Shor's/Grover's algorithm). | High |
| **FR-15** | CBOM Generation | The system shall compile all discovered cryptographic parameters per endpoint into a structured Cryptographic Bill of Materials (CBOM) document. | High |
| **FR-16** | Digital Label Issuance | The system shall award a **"Post Quantum Cryptography (PQC) Ready"** or **"Fully Quantum Safe"** digital label/certificate to assets that exclusively use NIST-standardized PQC algorithms. | High |
| **FR-17** | Non-PQC Flagging | The system shall flag assets that do NOT use PQC algorithms as **"Not PQC Ready"** with specific vulnerability details. | High |
| **FR-18** | Remediation Recommendations | The system shall generate actionable, asset-specific recommendations for migrating from quantum-vulnerable to quantum-safe algorithms (e.g., "Replace ECDHE with ML-KEM-768 for key exchange"). | High |
| **FR-19** | VPN Endpoint Scanning | The system shall probe VPN endpoints (IPSec IKEv2 on UDP 500/4500, OpenVPN on TCP/UDP 1194, WireGuard on UDP 51820) and extract their cipher configurations. | Medium |
| **FR-20** | Report Export | The system shall export CBOM and assessment reports in JSON, CSV, XML, and PDF formats. | High |
| **FR-21** | Scan Scheduling | The system shall allow administrators to schedule recurring scans (daily, weekly, monthly) for continuous monitoring. | Medium |
| **FR-22** | Scan History | The system shall store all historical scan results and allow users to compare results across scans to track PQC migration progress. | Medium |
| **FR-23** | Dashboard Overview | The system shall provide a dashboard showing: total assets scanned, PQC-ready count, non-PQC-ready count, hybrid count, risk distribution charts, and recent scan activity. | High |
| **FR-24** | User Authentication | The system shall require user authentication (username/password + optional MFA) before granting access to any functionality. | High |
| **FR-25** | Role-Based Access Control | The system shall enforce RBAC: Admin (full access), Analyst (scan + view), Viewer (read-only reports). | High |

### 3.2 External Interface Requirements

#### 3.2.1 User Interfaces

| Interface | Description |
|---|---|
| **Login Page** | Secure login form with username, password, and optional MFA code. Branding consistent with the QuantumShield identity. |
| **Dashboard** | Main landing page after login. Displays real-time summary cards (Total Assets, PQC Ready, Not Ready, Hybrid), risk distribution pie chart, recent scan timeline, and quick-action buttons for new scans. |
| **Scan Configuration Page** | Form to input target endpoints (manual entry, CSV upload, CIDR range), select port range, configure scan options (rate limiting, timeout), and initiate scan. |
| **Scan Progress View** | Real-time progress indicator showing scan status per target (queued, scanning, completed, failed). |
| **CBOM Report View** | Detailed, tabular view of the generated CBOM for each scanned endpoint. Filterable by quantum-safety status, algorithm type, TLS version. |
| **Asset Detail Page** | Per-asset drill-down showing full certificate chain, all supported cipher suites, key exchange details, quantum-safety label, and specific remediation recommendations. |
| **Label/Certificate View** | Displays the awarded digital "PQC Ready" or "Fully Quantum Safe" label for qualifying assets. Downloadable as a digital certificate (PDF/JSON). |
| **Reports Page** | List of all generated reports with filters by date, scan ID, and status. Export buttons for JSON, CSV, XML, and PDF. |
| **Admin Panel** | User management (CRUD), system configuration, scan scheduling, and audit log viewer. |

The application shall provide a **web-based user interface** accessible via HTML5-compliant browsers (Google Chrome 120+, Firefox 120+, Microsoft Edge 120+). No desktop client or mobile application is required.

#### 3.2.2 Hardware Interfaces

| Interface | Description |
|---|---|
| **Network Interface** | The server must have a network interface with outbound internet access for reaching public-facing target endpoints. Minimum 100 Mbps bandwidth recommended. |
| **Server Hardware** | Minimum: 4 vCPUs, 8 GB RAM, 50 GB SSD storage. Recommended: 8 vCPUs, 16 GB RAM, 100 GB SSD storage for concurrent scanning of large asset inventories. |

No specialized hardware (e.g., HSMs, custom NICs, cryptographic accelerators) is required. The scanner uses standard TCP/IP networking via the operating system's network stack.

#### 3.2.3 Software / Communication Interfaces

| Interface | Description |
|---|---|
| **TLS Protocol (RFC 8446, RFC 5246)** | The scanner communicates with target endpoints using standard TLS protocol handshakes. It acts as a TLS client initiating connections. |
| **HTTP/HTTPS (RFC 7230-7235)** | API endpoints and web servers are probed over HTTP/HTTPS. The scanner's own web interface is served over HTTPS. |
| **MongoDB Wire Protocol** | The application communicates with MongoDB using the MongoDB Node.js driver over the MongoDB Wire Protocol (default port 27017). |
| **REST API** | The scanner exposes a RESTful API for programmatic access: `POST /api/scan` (initiate scan), `GET /api/results/:id` (fetch results), `GET /api/cbom/:id` (fetch CBOM), `GET /api/reports` (list reports). |
| **IPSec IKEv2 (RFC 7296)** | For VPN endpoint scanning, the system initiates IKEv2 `IKE_SA_INIT` exchanges to detect VPN cipher configurations. |
| **PDF Generation** | The system uses a PDF rendering library (e.g., Puppeteer/PDFKit) to generate printable reports and digital labels. |

### 3.3 System Features

#### SF-01: Cryptographic Discovery Engine
- Automated TLS handshake with multi-protocol probing
- Certificate chain extraction and parsing
- Cipher suite enumeration with full decomposition
- VPN endpoint cipher detection
- Concurrent scanning with configurable parallelism

#### SF-02: Quantum-Safety Assessment Engine
- Algorithm classification based on NIST PQC standards
- Quantum vulnerability scoring (Critical / High / Medium / Low)
- Hybrid mode detection (classical + PQC combined)
- Post-Quantum OID detection in X.509 certificates
- Automated label/certificate generation for PQC-ready assets

#### SF-03: CBOM Report Generator
- Structured CBOM document per endpoint and per organization
- Multi-format export (JSON, CSV, XML, PDF)
- Filterable and sortable inventory views
- Historical comparison and delta reports
- Executive summary for non-technical stakeholders

#### SF-04: Dashboard & Analytics
- Real-time scan monitoring and progress tracking
- Quantum-readiness distribution charts (pie, bar, trend)
- Risk heatmap across discovered assets
- PQC migration progress tracking over time
- Alert notifications for newly discovered vulnerabilities

#### SF-05: User & Access Management
- Authentication with username/password and optional MFA
- Role-Based Access Control (Admin, Analyst, Viewer)
- Session management with configurable timeout
- Comprehensive audit trail for all user actions

### 3.4 Non-functional Requirements

#### 3.4.1 Performance Requirements

| Req ID | Requirement |
|---|---|
| **NFR-P01** | The system shall complete a single-endpoint TLS scan (handshake + certificate extraction + cipher enumeration) within **30 seconds** under normal network conditions. |
| **NFR-P02** | The system shall support scanning of at least **100 endpoints per hour** with default configuration. |
| **NFR-P03** | The dashboard shall load within **3 seconds** for up to 10,000 stored CBOM records. |
| **NFR-P04** | CBOM report generation (JSON/CSV) shall complete within **5 seconds** for up to 500 endpoints. |
| **NFR-P05** | PDF report generation shall complete within **15 seconds** for a full assessment report. |
| **NFR-P06** | The system shall support at least **20 concurrent users** accessing the dashboard without performance degradation. |
| **NFR-P07** | API response time for data retrieval endpoints shall not exceed **2 seconds** (p95). |

#### 3.4.2 Software Quality Attributes

| Attribute | Description |
|---|---|
| **Reliability** | The system shall have 99.5% uptime during operational hours. Failed scans must be automatically retried up to 3 times before marking as failed. |
| **Accuracy** | Cryptographic parameter detection accuracy must be ≥99% for TLS 1.2 and TLS 1.3 cipher suites. PQC algorithm detection must have zero false positives (no asset incorrectly labeled as PQC-ready). |
| **Scalability** | The architecture must support horizontal scaling — additional scanner worker nodes can be added to increase scan throughput without modifying the core application. |
| **Maintainability** | The codebase shall follow modular architecture with clear separation of concerns (Scanner Engine, Assessment Engine, Report Generator, Web UI, API Layer). Adding new PQC algorithms shall require only updating the algorithm knowledge base, not modifying core logic. |
| **Usability** | A Security Analyst with basic TLS knowledge shall be able to configure and execute a scan within 5 minutes of first use without external documentation. |
| **Portability** | The application shall be containerizable (Docker) for deployment across different hosting environments without modification. |
| **Testability** | All core modules (Scanner, Assessor, CBOM Generator) shall have unit test coverage of ≥80%. Integration tests shall cover all API endpoints. |

#### 3.4.3 Other Non-functional Requirements

| Requirement | Description |
|---|---|
| **Logging** | All application events, errors, scan activities, and user actions must be logged with timestamps in structured format (JSON). Logs must be retained for a minimum of 90 days. |
| **Backup** | Database backups must be configured for daily automated execution. Point-in-time recovery must be supported. |
| **Localization** | The application shall support English language. UI text shall be externalized for future localization support. |
| **Documentation** | User manual, API documentation (Swagger/OpenAPI), and deployment guide must be provided with the deliverable. |

---

## 4. Technological Requirements

### 4.1 Technologies Used in Development of the Web Application

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React.js | 18.x | Single-Page Application (SPA) for scanner dashboard, scan configuration, and report visualization |
| **Frontend Styling** | Vanilla CSS + CSS Variables | CSS3 | Premium, modern UI with glassmorphism, dark mode, and micro-animations |
| **Frontend Charts** | Chart.js / Recharts | Latest | Data visualization for quantum-readiness distribution, scan trends, and risk heatmaps |
| **Backend Runtime** | Node.js | 20 LTS | Server-side runtime for API, scanner engine, and business logic |
| **Backend Framework** | Express.js | 4.x | RESTful API routing, middleware, and request handling |
| **Scanner Engine** | Node.js `tls`, `crypto`, `net` modules | Built-in | TLS handshake initiation, certificate parsing, cipher suite probing |
| **PQC Support** | OpenSSL 3.2+ / OQS-Provider | Latest | Post-Quantum cipher suite negotiation and OID detection |
| **PDF Generation** | PDFKit / Puppeteer | Latest | Generating printable CBOM reports and PQC-Ready digital labels |
| **Authentication** | JSON Web Tokens (JWT) | Latest | Stateless user authentication and session management |
| **Password Hashing** | bcrypt | Latest | Secure password storage with salted hashing |
| **API Documentation** | Swagger / OpenAPI 3.0 | 3.0 | Auto-generated API documentation |
| **Version Control** | Git + GitHub | Latest | Source code version control and collaboration |

### 4.2 I.D.E. (Integrated Development Environment)

| IDE | Purpose |
|---|---|
| **Visual Studio Code** | Primary IDE for frontend (React.js) and backend (Node.js/Express) development. Extensions: ESLint, Prettier, REST Client, MongoDB for VS Code. |
| **Postman** | API testing and documentation during development. |
| **MongoDB Compass** | Visual interface for inspecting and managing MongoDB collections during development. |
| **Chrome DevTools** | Frontend debugging, network inspection, and performance profiling. |

### 4.3 Database Management Software

| Component | Technology | Purpose |
|---|---|---|
| **Primary Database** | MongoDB 7.0+ | Document-based NoSQL storage for CBOM records, scan results, and flexible cryptographic parameter schemas. MongoDB's document model is ideal for CBOM data which has variable structure per asset type. |
| **ODM (Object-Document Mapper)** | Mongoose 8.x | Schema definition, validation, and query building for MongoDB from Node.js. |
| **Session Store** | MongoDB (via `connect-mongo`) | Persistent session storage for user authentication sessions. |
| **Caching (Optional)** | Redis 7.x | In-memory caching for frequently accessed dashboard data and scan status (optional enhancement for performance). |

**Database Schema Overview:**

| Collection | Key Fields | Purpose |
|---|---|---|
| `users` | `_id`, `username`, `email`, `passwordHash`, `role`, `mfaEnabled`, `createdAt` | User account management |
| `scans` | `_id`, `initiatedBy`, `targets[]`, `status`, `startedAt`, `completedAt`, `config` | Scan execution records |
| `cbom_records` | `_id`, `scanId`, `endpoint`, `certificates[]`, `cipherSuites[]`, `tlsVersions[]`, `keyExchange`, `quantumSafetyLabel`, `recommendations[]` | Cryptographic Bill of Materials per endpoint |
| `audit_logs` | `_id`, `userId`, `action`, `details`, `ipAddress`, `timestamp` | Audit trail for compliance |
| `labels` | `_id`, `cbomRecordId`, `labelType`, `issuedAt`, `validUntil`, `certificate` | Digital PQC-Ready labels/certificates |

---

## 5. Security Requirements

### 5.1 Compatibility with Current IT Setup

The QuantumShield Scanner is a **standalone application** and does not modify or interfere with any existing banking IT infrastructure. It operates as an external assessment tool that only reads publicly available TLS information from target endpoints. **Existing banking systems will not be affected** by the scanner's operation.

### 5.2 Audit Trails

All important events shall be captured in immutable audit logs with the following details:

| Field | Description |
|---|---|
| **User ID** | The authenticated user who performed the action |
| **Timestamp** | Date and time of the event (ISO 8601 format, UTC) |
| **Action** | Type of action (SCAN_INITIATED, SCAN_COMPLETED, REPORT_GENERATED, REPORT_EXPORTED, USER_LOGIN, USER_LOGOUT, CONFIG_CHANGED) |
| **Details** | Action-specific details (e.g., target endpoint list, report format, scan configuration) |
| **IP Address** | Source IP address of the user's session |
| **Result** | Success / Failure / Error with detailed error message if applicable |

All scan responses and cryptographic data extracted from targets are logged in the MongoDB database for historical reference and audit purposes.

### 5.3 Access Control

Access to information and computing facilities shall be controlled based on the principles of **segregation of duty** and **need-to-know**:

| Role | Permissions |
|---|---|
| **Admin** | Full system access — user management, scan scheduling, system configuration, all reports, audit log access |
| **Security Analyst** | Initiate scans, view scan results, generate and export reports, view CBOM data. Cannot manage users or system settings. |
| **Viewer / Compliance** | Read-only access to reports, CBOM data, and dashboard. Cannot initiate scans or modify any configuration. |

- Only **Admin** users shall be able to schedule automated/recurring scans.
- Only **Admin** users shall be able to create, modify, or delete user accounts.
- Password policy: Minimum 12 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character.
- Account lockout: After 5 failed login attempts, account is locked for 30 minutes.

### 5.4 Recoverability

| Scenario | Recovery Mechanism |
|---|---|
| **Application Failure** | The application is containerized (Docker) and deployed with auto-restart policies. Upon crash, the container runtime automatically restarts the application within 30 seconds. |
| **Database Failure** | MongoDB is configured with replica sets for high availability. Automated daily backups ensure recovery to the last 24-hour checkpoint. Point-in-time recovery is supported. |
| **Disaster Recovery** | In case of complete infrastructure failure, the application can be recovered from Docker images + MongoDB backup dumps. Recovery Time Objective (RTO): 4 hours. Recovery Point Objective (RPO): 24 hours. |
| **Scan Interruption** | If a scan is interrupted mid-execution (due to crash or network failure), the system shall detect the incomplete scan and allow the user to resume from the last successfully scanned target. |

### 5.5 Compliance

| Compliance Area | Requirement |
|---|---|
| **NIST PQC Standards** | All quantum-safety assessments must align with NIST FIPS 203, 204, 205, and 206 standards. Algorithm classifications must be updated as NIST publishes new standards. |
| **Data Protection** | All stored CBOM data and user credentials shall be encrypted at rest (AES-256). All data in transit shall be encrypted using TLS 1.2 or higher. |
| **RBI IT Framework** | The tool shall support compliance reporting aligned with RBI's Information Technology Framework for banks (where applicable). |
| **OWASP Top 10** | The web application shall be developed following OWASP Top 10 security best practices to prevent common web vulnerabilities (XSS, CSRF, SQL Injection, etc.). |

### 5.6 Security Vulnerabilities — External Connections

| Risk | Mitigation |
|---|---|
| **Man-in-the-Middle (MITM) during scanning** | The scanner performs TLS handshakes for assessment purposes only. No sensitive bank data is transmitted. Certificate pinning is not applicable as the scanner intentionally accepts all certificates for evaluation. |
| **Exposure of CBOM data** | CBOM reports contain sensitive cryptographic configuration details. Access is restricted by RBAC. Reports are stored encrypted at rest. Export is logged in the audit trail. |
| **Scanner as attack vector** | The scanner does not accept inbound connections from target systems. All connections are outbound-only, initiated by the scanner. No reverse shells, callbacks, or webhooks from targets. |
| **Dependency vulnerabilities** | All npm dependencies shall be regularly audited using `npm audit`. Snyk or Dependabot shall be configured for automated vulnerability scanning of dependencies. |

### 5.7 Operating Environment Security

| Control | Implementation |
|---|---|
| **TLS Version** | The scanner's own web interface and API shall enforce TLS 1.2 as the minimum supported version. TLS 1.3 is preferred. |
| **HTTP Security Headers** | The application shall set: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`. |
| **CORS Policy** | Cross-Origin Resource Sharing shall be restricted to the scanner's own domain. No wildcard CORS origins allowed. |
| **Container Security** | Docker images shall be based on minimal base images (Alpine/Distroless). Non-root user execution inside containers. |

### 5.8 Cost of Security Over Lifecycle

| Component | Estimated Consideration |
|---|---|
| **TLS Certificates (for scanner itself)** | Let's Encrypt (free) or organizational CA-issued certificates. Renewal automated via certbot. |
| **Dependency Auditing** | Automated via GitHub Dependabot / Snyk (free tier available). No additional cost. |
| **Security Training** | Development team should be familiar with OWASP Top 10 and secure coding practices. One-time training investment. |
| **PQC Knowledge Base Updates** | As NIST publishes new PQC standards, the algorithm classification database must be updated. Estimated: quarterly manual review by a security analyst (2-4 hours per quarter). |
| **Penetration Testing** | Recommended annually or after major version releases. Can be performed by internal security team or contracted externally. |

---

## Appendix A: Quantum-Safety Classification Reference

| Algorithm | Type | Quantum Status | NIST Standard | Notes |
|---|---|---|---|---|
| RSA-2048/4096 | Key Exchange / Signature | ❌ Vulnerable | — | Broken by Shor's algorithm |
| ECDHE (P-256/P-384) | Key Exchange | ❌ Vulnerable | — | Broken by Shor's algorithm |
| ECDSA | Signature | ❌ Vulnerable | — | Broken by Shor's algorithm |
| DHE | Key Exchange | ❌ Vulnerable | — | Broken by Shor's algorithm |
| EdDSA (Ed25519/Ed448) | Signature | ❌ Vulnerable | — | Broken by Shor's algorithm |
| X25519 / X448 | Key Exchange | ❌ Vulnerable | — | Broken by Shor's algorithm |
| AES-128 | Symmetric Cipher | ⚠️ Weakened | — | Reduced to 64-bit security by Grover's |
| AES-256 | Symmetric Cipher | ✅ Safe | — | Reduced to 128-bit by Grover's — still strong |
| ChaCha20-Poly1305 | AEAD | ✅ Safe | — | 256-bit key — safe against Grover's |
| SHA-256 / SHA-384 | Hash | ✅ Safe | — | Marginal impact from Grover's |
| SHA-1 / MD5 | Hash | ❌ Deprecated | — | Classically broken — not quantum-specific |
| **ML-KEM (Kyber)** | Key Encapsulation | ✅ Quantum-Safe | FIPS 203 | NIST standardized PQC |
| **ML-DSA (Dilithium)** | Digital Signature | ✅ Quantum-Safe | FIPS 204 | NIST standardized PQC |
| **SLH-DSA (SPHINCS+)** | Digital Signature | ✅ Quantum-Safe | FIPS 205 | NIST standardized PQC (hash-based) |
| **FN-DSA (FALCON)** | Digital Signature | ✅ Quantum-Safe | FIPS 206 | NIST standardized PQC (lattice-based) |
| X25519+ML-KEM-768 | Hybrid Key Exchange | 🔶 Hybrid | — | Transitional — classical + PQC combined |

---

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **CBOM** | Cryptographic Bill of Materials — an inventory of all cryptographic algorithms, protocols, and certificates used by a system |
| **CRQC** | Cryptanalytically Relevant Quantum Computer — a quantum computer capable of breaking current public-key cryptography |
| **HNDL** | Harvest Now, Decrypt Later — attack strategy where encrypted data is captured today for future quantum decryption |
| **ML-KEM** | Module-Lattice-Based Key-Encapsulation Mechanism (formerly Kyber) — NIST FIPS 203 |
| **ML-DSA** | Module-Lattice-Based Digital Signature Algorithm (formerly Dilithium) — NIST FIPS 204 |
| **SLH-DSA** | Stateless Hash-Based Digital Signature Algorithm (formerly SPHINCS+) — NIST FIPS 205 |
| **FN-DSA** | FFT (Fast Fourier Transform) over NTRU-Lattice-Based Digital Signature Algorithm (formerly FALCON) — NIST FIPS 206 |
| **PQC** | Post-Quantum Cryptography — cryptographic algorithms designed to resist quantum computer attacks |
| **TLS** | Transport Layer Security — cryptographic protocol for secure communication over networks |
| **OID** | Object Identifier — a unique numerical identifier used in X.509 certificates to identify algorithms |
| **RBAC** | Role-Based Access Control — access control model where permissions are assigned to roles |

---

*End of Software Requirements Specification Document*

**Document Prepared By:** \<Team Name\>  
**Date:** 10th March 2026  
**Version:** 1.0
