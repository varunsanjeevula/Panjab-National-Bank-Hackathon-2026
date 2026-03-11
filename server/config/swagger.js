const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'QuantumShield Scanner API',
    version: '1.0.0',
    description: 'Post-Quantum Cryptography Assessment Scanner — REST API Documentation. Built for PNB Hackathon 2026.',
    contact: {
      name: 'QuantumShield Team',
      email: 'varun@quantumshield.dev'
    },
    license: {
      name: 'MIT'
    }
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Development' },
    { url: '/api', description: 'Relative (Deployed)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'analyst', 'viewer'] }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'Admin@2026' }
        }
      },
      ScanRequest: {
        type: 'object',
        required: ['targets'],
        properties: {
          targets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                host: { type: 'string', example: 'google.com' },
                port: { type: 'integer', example: 443 }
              }
            }
          },
          config: {
            type: 'object',
            properties: {
              scanVpn: { type: 'boolean', default: false }
            }
          }
        }
      },
      CbomRecord: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          host: { type: 'string' },
          port: { type: 'integer' },
          status: { type: 'string' },
          tlsVersions: { type: 'object' },
          certificate: { type: 'object' },
          cipherSuites: { type: 'array', items: { type: 'object' } },
          quantumAssessment: { type: 'object' },
          recommendations: { type: 'array', items: { type: 'object' } },
          integrityHash: { type: 'string' }
        }
      },
      ScheduleRequest: {
        type: 'object',
        required: ['name', 'targets'],
        properties: {
          name: { type: 'string', example: 'Weekly TLS Audit' },
          targets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                host: { type: 'string' },
                port: { type: 'integer', default: 443 }
              }
            }
          },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'custom'] },
          time: { type: 'string', example: '02:00' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with username and password',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/LoginRequest' } } } },
        responses: {
          '200': { description: 'JWT token + user data' },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user (password policy enforced)',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: {
            username: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 8 }, role: { type: 'string' }
          } } } }
        },
        responses: { '201': { description: 'User created' }, '400': { description: 'Validation error' } }
      }
    },
    '/api/auth/me': {
      get: { tags: ['Authentication'], summary: 'Get current user profile', responses: { '200': { description: 'User profile' } } }
    },
    '/api/scan': {
      post: {
        tags: ['Scanning'],
        summary: 'Start a new TLS/PQC scan',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ScanRequest' } } } },
        responses: { '201': { description: 'Scan initiated' } }
      },
      get: {
        tags: ['Scanning'],
        summary: 'List all scans (admins see all, users see own)',
        responses: { '200': { description: 'Array of scans' } }
      }
    },
    '/api/scan/{id}': {
      get: {
        tags: ['Scanning'],
        summary: 'Get scan details + CBOM records',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Scan with CBOM records' } }
      }
    },
    '/api/scan/compare/{id1}/{id2}': {
      get: {
        tags: ['Scanning'],
        summary: 'Compare two scans side-by-side',
        parameters: [
          { name: 'id1', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id2', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Comparison result' } }
      }
    },
    '/api/cbom/{scanId}': {
      get: { tags: ['CBOM'], summary: 'Get CBOM records for a scan', parameters: [{ name: 'scanId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Array of CBOM records' } } }
    },
    '/api/cbom/record/{id}': {
      get: { tags: ['CBOM'], summary: 'Get single CBOM record', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'CBOM record' } } }
    },
    '/api/cbom/stats/overview': {
      get: { tags: ['CBOM'], summary: 'Get CBOM statistics overview', responses: { '200': { description: 'Stats object' } } }
    },
    '/api/reports/list': {
      get: { tags: ['Reports'], summary: 'List all scans for reports', responses: { '200': { description: 'Array of scans' } } }
    },
    '/api/reports/{scanId}/json': {
      get: { tags: ['Reports'], summary: 'Export scan as JSON', parameters: [{ name: 'scanId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'JSON file download' } } }
    },
    '/api/reports/{scanId}/csv': {
      get: { tags: ['Reports'], summary: 'Export scan as CSV', parameters: [{ name: 'scanId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'CSV file download' } } }
    },
    '/api/reports/{scanId}/pdf': {
      get: { tags: ['Reports'], summary: 'Export CBOM report as PDF', parameters: [{ name: 'scanId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'PDF file download' } } }
    },
    '/api/reports/label/{cbomId}': {
      get: { tags: ['Reports'], summary: 'Download PQC digital label/certificate', parameters: [{ name: 'cbomId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'PQC label PDF' } } }
    },
    '/api/schedules': {
      get: { tags: ['Scheduling'], summary: 'List scheduled scans', responses: { '200': { description: 'Array of schedules' } } },
      post: {
        tags: ['Scheduling'],
        summary: 'Create a scheduled scan',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ScheduleRequest' } } } },
        responses: { '201': { description: 'Schedule created' } }
      }
    },
    '/api/schedules/{id}': {
      put: { tags: ['Scheduling'], summary: 'Update a schedule', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated schedule' } } },
      delete: { tags: ['Scheduling'], summary: 'Delete a schedule', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Schedule deleted' } } }
    },
    '/api/schedules/{id}/run': {
      post: { tags: ['Scheduling'], summary: 'Manually trigger a scheduled scan', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Scan triggered' } } }
    },
    '/api/vpn-scan': {
      post: {
        tags: ['VPN Scanning'],
        summary: 'Scan a host for VPN endpoints (IPSec, OpenVPN, WireGuard, etc.)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { host: { type: 'string', example: 'vpn.example.com' } } } } } },
        responses: { '200': { description: 'VPN scan results' } }
      }
    },
    '/api/admin/users': {
      get: { tags: ['Admin'], summary: 'List all users (admin only)', responses: { '200': { description: 'Array of users' } } },
      post: { tags: ['Admin'], summary: 'Create a user (admin only)', responses: { '201': { description: 'User created' } } }
    },
    '/api/admin/users/{id}': {
      put: { tags: ['Admin'], summary: 'Update a user (admin only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User updated' } } },
      delete: { tags: ['Admin'], summary: 'Delete a user (admin only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User deleted' } } }
    },
    '/api/admin/audit-logs': {
      get: { tags: ['Admin'], summary: 'Get audit logs (admin only)', responses: { '200': { description: 'Array of audit log entries' } } }
    },
    '/api/health': {
      get: { tags: ['System'], summary: 'Health check', security: [], responses: { '200': { description: 'Service status' } } }
    }
  }
};

const specs = swaggerJsdoc({ definition: swaggerDefinition, apis: [] });

module.exports = specs;
