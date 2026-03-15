<p align="center">
  <img src="https://img.shields.io/badge/Quantum-Shield-blueviolet?style=for-the-badge&logo=atom&logoColor=white" alt="QuantumShield" />
</p>

<h1 align="center">🛡️ QuantumShield Scanner</h1>

<p align="center">
  <strong>Post-Quantum Cryptography Readiness Assessment for Banking Infrastructure</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center">
  <em>Scans TLS endpoints, generates Cryptographic Bills of Materials (CBOM), and evaluates quantum-safety against NIST FIPS 203–206 standards.</em>
</p>

---

> **🔑 Demo Credentials**
>
> | Role | Username | Password | Access Level |
> |---|---|---|---|
> | **Admin** | `varun` | `12345678` | Full access — all features + Admin Panel (user management, audit logs) |
> | **Analyst** | `zoro` | `Analyst@123` | Can initiate scans, view results, manage schedules, and export reports |
> | **Viewer** | `sanji` | `Viewer@123` | Read-only — can view dashboards, scan results, and reports but cannot initiate scans or manage schedules |

---

## 📋 Table of Contents

- [Overview](#-overview)
- [The Quantum Threat](#-the-quantum-threat)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [NIST PQC Standards](#-nist-pqc-standards)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🔭 Overview

**QuantumShield** is an enterprise-grade scanner purpose-built for the banking sector. It connects to any public-facing TLS endpoint, performs a complete cryptographic audit, and produces a **Cryptographic Bill of Materials (CBOM)** with quantum-safety classifications.

> *"QuantumShield tells banks if their encryption will survive quantum computers — and exactly what to do if it won't."*

Unlike general-purpose TLS scanners (e.g., Qualys SSL Labs), QuantumShield goes further by:
- 🔬 Decomposing every cipher suite into its atomic components
- 🏷️ Issuing **PQC-Readiness Labels** per asset (Fully Quantum Safe / Hybrid / Not PQC Ready)
- 📊 Providing **specific NIST FIPS 203–206 migration recommendations**
- 📦 Auto-generating **CBOM reports** in JSON, CSV, and PDF formats

---

## ⚠️ The Quantum Threat

Quantum computers running **Shor's algorithm** will break all classical asymmetric cryptography (RSA, ECDHE, ECDSA) in hours. The **"Harvest Now, Decrypt Later" (HNDL)** attack is already underway — adversaries intercept encrypted data today, storing it until quantum computers can decrypt it.

```
TODAY (2026)                              FUTURE (2030–2035)
┌───────────────────────────┐             ┌───────────────────────────┐
│  Attacker intercepts      │             │  Quantum computer breaks  │
│  encrypted banking data   │── stores ──►│  RSA / ECDHE / ECDSA      │
│  (unreadable… for now)    │   for years │  and decrypts everything  │
└───────────────────────────┘             └───────────────────────────┘
```

**QuantumShield identifies which of your assets are vulnerable — before it's too late.**

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **🔍 TLS Deep Scan** | Probes TLS 1.0–1.3, enumerates cipher suites, extracts full certificate chains |
| **📦 CBOM Generation** | Automatic Cryptographic Bill of Materials for every scanned endpoint |
| **🏷️ PQC Labeling** | Quantum-safety classification: *Fully Quantum Safe*, *Hybrid*, *Not PQC Ready* |
| **📊 Executive Dashboard** | Visual analytics with charts showing PQC posture across all assets |
| **🌐 Network Scanning** | Intranet scanning via CIDR notation with host discovery |
| **🔓 Cleartext Detection** | Detects unencrypted services (HTTP, FTP, Telnet) on exposed ports |
| **🔐 VPN Endpoint Probing** | Scans VPN gateways for cryptographic configuration |
| **📅 Scheduled Scans** | Cron-based automated scan scheduling |
| **📈 Cyber Rating** | Composite security rating across all scanned infrastructure |
| **📄 Report Export** | Export reports in JSON, CSV, and PDF formats |
| **🔑 RBAC & JWT Auth** | Role-based access control with secure JWT authentication |
| **📋 Audit Logging** | Complete audit trail of all scan activities |
| **🤖 AI Assistant** | RAG-based chatbot for guided PQC assessment |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          QuantumShield Scanner                           │
│                                                                          │
│   ┌────────────┐    ┌────────────────┐    ┌────────────────┐   ┌──────┐ │
│   │   React     │    │   Express.js   │    │   Scanner      │   │Mongo │ │
│   │   Frontend  │◄──►│   REST API     │◄──►│   Engine       │◄─►│  DB  │ │
│   │   (Vite)    │    │   + Swagger    │    │   (TLS Probe)  │   │      │ │
│   └────────────┘    └────────────────┘    └────────────────┘   └──────┘ │
│        │                    │                      │                      │
│        ▼                    ▼                      ▼                      │
│   User Dashboard       Auth / RBAC          Target Endpoints             │
│   Charts & Reports     Rate Limiting        TLS Handshakes               │
│   CBOM Viewer          Helmet Security      Certificate Parsing          │
│                        Audit Logging        Quantum Classification       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Scan Flow

1. **User inputs target** (domain, IP, or CSV batch upload)
2. **TLS Probe** performs handshakes across TLS 1.0–1.3
3. **Certificate chain** is extracted (key algorithm, key size, signature algorithm)
4. **Cipher suites** are enumerated and decomposed into components
5. **Quantum Classifier** evaluates each component against NIST PQC standards
6. **CBOM is generated** with PQC-readiness labels and migration recommendations
7. **Results are stored** in MongoDB and displayed on the dashboard

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Recharts | Interactive dashboard, charts, CBOM viewer |
| **Backend** | Express 5, Node.js 20 | REST API, authentication, middleware |
| **Database** | MongoDB (Mongoose) | Flexible document storage for CBOM data |
| **Scanner** | Node.js `tls` / `crypto` / `node-forge` | TLS handshake probing, certificate parsing |
| **Auth** | JWT, bcryptjs | Secure authentication with hashed passwords |
| **Security** | Helmet, express-rate-limit, CORS | Request protection and hardening |
| **Reports** | PDFKit, json2csv | Export scan results in multiple formats |
| **Scheduling** | node-cron | Automated recurring scans |
| **API Docs** | Swagger (swagger-jsdoc) | Auto-generated OpenAPI documentation |
| **Deployment** | Docker, Render, Vercel | Multi-stage Docker build, cloud-ready |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **MongoDB** (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/varunsanjeevula/Panjab-National-Bank-Hackathon-2026.git
cd Panjab-National-Bank-Hackathon-2026
```

### 2. Install Dependencies

```bash
# Install all dependencies (server + client)
npm run install:all
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/quantumshield
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### 4. Run in Development Mode

```bash
# Terminal 1 — Start the backend
npm run dev:server

# Terminal 2 — Start the frontend
npm run dev:client
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:5000`.

### 5. Default Admin Credentials

Use the following credentials to log in as an administrator:

| Field | Value |
|---|---|
| **Username** | `varun` |
| **Password** | `12345678` |

> ⚠️ **Note:** Change the default credentials in production environments.

### 6. Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
quantumshield-scanner/
├── client/                    # React Frontend (Vite)
│   └── src/
│       ├── App.jsx            # Root component with routing
│       ├── main.jsx           # Entry point
│       ├── index.css          # Global styles & design system
│       ├── context/           # Auth context provider
│       ├── services/          # API service layer
│       └── pages/
│           ├── Dashboard.jsx          # Summary cards & charts
│           ├── ScanConfig.jsx         # Scan target configuration
│           ├── ScanResults.jsx        # Scan result viewer
│           ├── ScanHistory.jsx        # Historical scan records
│           ├── CbomDashboard.jsx      # CBOM analysis dashboard
│           ├── AssetInventory.jsx     # Cryptographic asset inventory
│           ├── AssetDetail.jsx        # Detailed asset view
│           ├── PqcPosture.jsx         # PQC posture assessment
│           ├── CyberRating.jsx        # Composite cyber rating
│           ├── ExecutivesReporting.jsx # Executive summary reports
│           ├── OnDemandReporting.jsx   # On-demand report generation
│           ├── ScheduleReporting.jsx   # Scheduled report configuration
│           ├── ScheduleManager.jsx    # Scan schedule management
│           ├── AdminPanel.jsx         # User & role administration
│           ├── Login.jsx              # Authentication page
│           └── Reports.jsx            # Report hub
│
├── server/                    # Express.js Backend
│   ├── server.js              # Express app entry point
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/             # Auth & RBAC middleware
│   ├── models/
│   │   ├── User.js            # User schema (JWT auth)
│   │   ├── Scan.js            # Scan record schema
│   │   ├── CbomRecord.js      # CBOM document schema
│   │   ├── ScheduledScan.js   # Scheduled scan schema
│   │   └── AuditLog.js        # Audit trail schema
│   ├── routes/
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── scan.js            # Scan CRUD operations
│   │   ├── cbom.js            # CBOM retrieval
│   │   ├── reports.js         # Report generation & export
│   │   ├── schedule.js        # Scan scheduling
│   │   ├── assetInventory.js  # Asset inventory endpoints
│   │   └── admin.js           # Admin management
│   └── utils/                 # Shared utilities
│
├── scanner/                   # Scanner Engine
│   ├── index.js               # Scanner orchestrator
│   ├── tlsProbe.js            # TLS handshake & certificate extraction
│   ├── cipherSuiteData.js     # Cipher suite decomposition database
│   ├── quantumClassifier.js   # Quantum-safety classification engine
│   ├── cbomGenerator.js       # CBOM document generator
│   ├── recommendations.js     # PQC migration recommendation engine
│   └── vpnProbe.js            # VPN endpoint scanner
│
├── api/                       # API entry point
│   └── index.js
│
├── Dockerfile                 # Multi-stage Docker build
├── render.yaml                # Render deployment config
├── vercel.json                # Vercel deployment config
├── SRS.md                     # Software Requirements Specification
├── ROADMAP.md                 # Technical roadmap & knowledge base
├── cryptographic-asset-inventory.md  # Cryptographic asset reference
└── package.json               # Root package scripts
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate and receive JWT |
| `POST` | `/api/scan` | Initiate a new TLS scan |
| `GET` | `/api/scan/:id` | Get scan results by ID |
| `GET` | `/api/scan/history` | List all past scans |
| `GET` | `/api/cbom/:id` | Retrieve CBOM for a scan |
| `GET` | `/api/reports/:id` | Generate report (JSON/CSV/PDF) |
| `POST` | `/api/schedule` | Create a scheduled scan |
| `GET` | `/api/assets` | List all inventoried assets |
| `GET` | `/api/assets/:id` | Get detailed asset info |
| `GET` | `/api/admin/users` | List all users (admin only) |

> Full interactive API documentation is available at `/api-docs` (Swagger UI) when the server is running.

---

## 🧬 NIST PQC Standards

QuantumShield classifies assets against the four NIST Post-Quantum Cryptography standards:

| Standard | Algorithm | Replaces | Purpose |
|---|---|---|---|
| **FIPS 203** | ML-KEM (Kyber) | ECDHE, RSA key exchange | Key Encapsulation |
| **FIPS 204** | ML-DSA (Dilithium) | RSA, ECDSA signatures | Digital Signatures |
| **FIPS 205** | SLH-DSA (SPHINCS+) | RSA, ECDSA signatures | Hash-Based Signatures |
| **FIPS 206** | FN-DSA (FALCON) | RSA, ECDSA signatures | Compact Signatures |

### Classification Labels

| Label | Meaning |
|---|---|
| ✅ **Fully Quantum Safe** | All cryptographic components use PQC algorithms |
| 🔶 **Hybrid Mode** | Mix of classical and PQC algorithms |
| ❌ **Not PQC Ready** | Only classical algorithms (RSA, ECDHE, ECDSA) |

---

## 🐳 Deployment

### Docker

```bash
# Build the image
docker build -t quantumshield .

# Run the container
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb+srv://... \
  -e JWT_SECRET=your_secret \
  quantumshield
```

### Render

The project includes a `render.yaml` for one-click deployment to [Render](https://render.com).

### Vercel

The frontend can be deployed to Vercel with the included `vercel.json` configuration.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for the <strong>PNB Hackathon 2026</strong>
  <br/>
  <em>Defending banking infrastructure against the quantum threat.</em>
</p>
