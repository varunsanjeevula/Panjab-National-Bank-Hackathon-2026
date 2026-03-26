// ── QuantumShield Chatbot Training Data ─────────────────────────
// ~1000+ phrase patterns mapped to intents for keyword matching
// Data-related intents still use live MongoDB queries

module.exports = [

  // ═══════════════════════════════════════════════════════════════
  // ABOUT THE PROJECT (~80 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'about_project', patterns: [
    'about project', 'about quantumshield', 'what is quantumshield', 'tell me about this project',
    'project overview', 'what does this app do', 'what does this tool do', 'what is this application',
    'what is this platform', 'what is this software', 'describe this project', 'explain this project',
    'what is this tool about', 'give me an overview', 'project summary', 'summarize the project',
    'introduction', 'what is this system', 'what does this system do', 'purpose of this tool',
    'purpose of this application', 'purpose of quantumshield', 'objective of this project',
    'goal of this project', 'what problem does this solve', 'what issue does this address',
    'tell me about quantumshield scanner', 'what is qs scanner', 'what is quantum shield',
    'brief about project', 'project description', 'project info', 'project details',
    'explain quantumshield', 'overview of quantumshield', 'what are you', 'who are you',
    'what is this website', 'what is this portal', 'what is this dashboard for',
    'what does quantumshield scanner do', 'how does quantumshield work',
    'what services does this provide', 'what functionality does this offer',
    'use of this', 'whats the use', 'what is the use', 'what is its use',
    'why is this used', 'what for', 'what is this for', 'what does it do',
    'tell me about it', 'explain this', 'describe it', 'what is it',
    'what does this do', 'whats this', 'what is all this', 'about this',
    'use of it', 'whats use of', 'whats use', 'purpose of it',
    'why this app', 'why this tool', 'why this project', 'need of this',
    'importance of this', 'significance of this', 'value of this',
  ]},

  { intent: 'why_pqc', patterns: [
    'why pqc', 'why post quantum', 'why quantum safe', 'need for pqc', 'importance of pqc',
    'why do we need', 'why quantum cryptography', 'why is pqc important', 'why migrate',
    'why should we care about quantum', 'quantum computing threat', 'quantum danger',
    'what is the quantum threat', 'why is rsa not safe', 'why change encryption',
    'why upgrade cryptography', 'why are current algorithms unsafe', 'harvest now decrypt later',
    'store now decrypt later', 'why is encryption at risk', 'future of encryption',
    'when will quantum computers break encryption', 'is my data safe from quantum',
    'can quantum computers break rsa', 'can quantum computers break encryption',
    'are quantum computers a threat', 'quantum risk', 'quantum vulnerability',
    'why not just use aes', 'why not just use rsa', 'what happens when quantum arrives',
    'why prepare for quantum', 'quantum readiness', 'crypto agility',
    'why is this project needed', 'what problem does pqc solve', 'motivation behind pqc',
  ]},

  { intent: 'target_users', patterns: [
    'who should use', 'who is this for', 'target audience', 'target users',
    'who benefits from this', 'who needs this', 'who uses quantumshield',
    'is this for banks', 'is this for enterprises', 'is this for government',
    'who are the users', 'intended audience', 'who can use this',
    'what organizations need this', 'which companies need this', 'who is it designed for',
    'what industries use this', 'what sectors need this', 'ideal users',
    'who is the customer', 'who would buy this', 'market for this product',
    'use cases', 'real world usage', 'practical applications',
    'how can banks use this', 'how can companies use this',
    'is this for small business', 'is this for startups', 'enterprise use',
  ]},

  { intent: 'tech_stack', patterns: [
    'what technology', 'tech stack', 'built with', 'what framework', 'technologies used',
    'what programming language', 'what language is this written in', 'frontend technology',
    'backend technology', 'database used', 'what database', 'what is the architecture',
    'system architecture', 'software architecture', 'technical details',
    'how is it built', 'development tools', 'what libraries', 'what packages',
    'react or angular', 'node or python', 'mongodb or postgres', 'what stack',
    'mern stack', 'is this react', 'is this node', 'is this mongodb',
    'what css framework', 'what ui library', 'what icons', 'what charts library',
    'how is frontend built', 'how is backend built', 'api framework',
    'is this express', 'deployment technology', 'hosting',
    'what version of react', 'what version of node', 'vite or webpack',
  ]},

  { intent: 'unique_features', patterns: [
    'what makes this unique', 'unique features', 'special features', 'standout features',
    'what sets this apart', 'differentiator', 'competitive advantage', 'usp',
    'why choose quantumshield', 'advantages', 'benefits', 'key features',
    'main features', 'top features', 'best features', 'highlight features',
    'what is special about this', 'why is this better', 'how is this different',
    'unique selling point', 'innovation', 'novel features',
    'what can this do that others cannot', 'comparison with other tools',
    'how does this compare', 'is there anything like this',
    'features in it', 'features of this', 'what are the features', 'featuresin',
    'features in this', 'features available', 'all features', 'list features',
    'show features', 'tell me features', 'features list', 'feature list',
    'what features', 'which features', 'features in this project',
    'features in this app', 'features of this tool', 'features it has',
  ]},

  { intent: 'security_features', patterns: [
    'security features', 'how secure is this', 'is this secure', 'security measures',
    'authentication', 'how does login work', 'jwt', 'token based auth',
    'role based access', 'rbac', 'user roles', 'access control',
    'rate limiting', 'brute force protection', 'helmet', 'security headers',
    'audit logging', 'audit trail', 'who did what', 'activity log',
    'data encryption', 'password hashing', 'bcrypt', 'data protection',
    'is my data safe', 'privacy', 'gdpr', 'data security',
    'how do you protect data', 'security architecture', 'security best practices',
    'integrity hashing', 'tamper detection',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD (~40 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_dashboard', patterns: [
    'dashboard guide', 'about dashboard', 'dashboard features', 'what is on dashboard',
    'dashboard overview', 'explain dashboard', 'dashboard help', 'how to use dashboard',
    'what does dashboard show', 'dashboard metrics', 'dashboard stats', 'dashboard cards',
    'what charts are on dashboard', 'dashboard components', 'dashboard layout',
    'what data is on dashboard', 'main page', 'home page', 'landing page',
    'overview page', 'summary page', 'donut chart', 'pie chart on dashboard',
    'trend chart', 'score trend', 'recent scans table', 'stat cards',
    'animated counters', 'quantum readiness chart',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // SCANNING (~80 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'how_to_scan', patterns: [
    'how to scan', 'how do i scan', 'how to run', 'start a scan', 'run a scan',
    'start scan', 'initiate scan', 'new scan', 'create scan', 'begin scan',
    'launch scan', 'perform scan', 'execute scan', 'trigger scan',
    'how scanning works', 'scan process', 'scanning process',
    'scan a website', 'scan a domain', 'scan a server', 'scan my server',
    'scan my website', 'scan my domain', 'scan an ip', 'scan a host',
    'scan configuration', 'scan settings', 'scan options', 'configure scan',
    'bulk scan', 'multiple targets', 'csv upload', 'upload targets',
    'scan port', 'default port', 'timeout setting', 'scan delay',
    'what happens during scan', 'scan steps', 'scan phases',
    'can i scan multiple', 'can i scan internal', 'scan localhost',
  ]},

  { intent: 'page_guide_scan', patterns: [
    'new scan guide', 'scan page guide', 'scan page features', 'about new scan page',
    'how to use new scan', 'explain scan page', 'scan page help',
    'scan configuration page', 'what can i configure', 'scan form',
  ]},

  { intent: 'scan_results_explained', patterns: [
    'what do scan results mean', 'explain scan results', 'understand results',
    'how to read results', 'interpret results', 'results explanation',
    'what do the colors mean', 'what does red mean', 'what does green mean',
    'color coding', 'score explanation', 'what is a good score',
    'what is a bad score', 'score range', 'score interpretation',
    'results breakdown', 'results detail', 'drill down results',
    'per host results', 'individual results', 'host details',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // SCAN DATA (live queries, existing intents)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'last_scan', patterns: [
    'last scan', 'latest scan', 'recent scan', 'when was last scan',
    'when did i scan', 'most recent scan', 'previous scan',
    'last completed scan', 'when was the last time', 'last scan date',
    'last scan time', 'last scan results', 'last scan target',
    'what was my last scan', 'show last scan', 'view last scan',
    'my latest scan', 'most recent results', 'last scan status',
  ]},

  { intent: 'scan_count', patterns: [
    'how many scan', 'total scan', 'number of scan', 'scan count',
    'scans completed', 'scans done', 'scans performed', 'scans run',
    'count scans', 'count of scans', 'all scans', 'total number of scans',
    'how many times scanned', 'number of assessments',
  ]},

  { intent: 'scan_status', patterns: [
    'failed scan', 'scan failed', 'any failures', 'running scan',
    'active scan', 'scan running', 'scan in progress', 'scan status',
    'is scan running', 'are any scans running', 'scan errors',
    'scan issues', 'incomplete scan', 'partial scan',
    'how many failed', 'success rate', 'completion rate',
    'suspicious scan', 'scan detected', 'scan alert', 'any issues',
    'any problems with scan', 'scan problem', 'scan warning',
    'anything detected', 'detected anything', 'scan findings',
    'scan results status', 'did scan find', 'what did scan find',
  ]},

  { intent: 'scan_duration', patterns: [
    'how long', 'scan duration', 'scan time', 'how much time',
    'time taken', 'how fast', 'scan speed', 'scanning speed',
    'how long does scan take', 'average scan time', 'scan performance',
    'scan timeout', 'why so slow', 'why taking long',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // SCAN HISTORY PAGE (~30 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_history', patterns: [
    'scan history guide', 'history page guide', 'about scan history',
    'scan history features', 'how to use scan history', 'explain scan history',
    'history page help', 'past scans', 'previous scans', 'scan log',
    'scan records', 'all past scans', 'view old scans', 'scan archive',
    'scan history page', 'what is scan history', 'history overview',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // CBOM (~50 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'glossary_cbom', patterns: [
    'what is cbom', 'explain cbom', 'cryptographic bill', 'cbom meaning',
    'cbom definition', 'cbom purpose', 'what does cbom stand for',
    'cbom full form', 'why cbom', 'cbom importance', 'cbom standard',
    'cyclonedx', 'owasp cyclonedx', 'crypto inventory', 'crypto assets list',
    'cryptographic inventory', 'list of algorithms', 'algorithm inventory',
    'cbom format', 'cbom generation', 'how is cbom generated',
    'what information does cbom contain', 'cbom components',
  ]},

  { intent: 'page_guide_cbom', patterns: [
    'cbom guide', 'cbom page guide', 'about cbom page', 'cbom features',
    'how to use cbom', 'explain cbom page', 'cbom dashboard',
    'cbom page help', 'cbom overview page', 'cryptographic dashboard',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // ASSET INVENTORY (~40 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_asset', patterns: [
    'asset inventory guide', 'asset page guide', 'about asset inventory',
    'asset features', 'how to use asset inventory', 'explain asset page',
    'asset page help', 'asset overview', 'what is asset inventory',
    'what assets are tracked', 'asset categories', 'asset types',
    'domain inventory', 'certificate inventory', 'ip inventory',
    'software inventory', 'asset discovery', 'discovered assets',
    'how are assets discovered', 'where do assets come from',
  ]},

  { intent: 'glossary_asset', patterns: [
    'what is asset', 'explain asset', 'asset inventory meaning',
    'what counts as an asset', 'types of assets', 'asset definition',
    'network asset', 'digital asset', 'cryptographic asset',
    'asset management', 'asset tracking',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // PQC SCORE & SECURITY (~60 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'pqc_score', patterns: [
    'pqc score', 'quantum score', 'readiness score', 'average score',
    'overall score', 'my score', 'what is my score', 'show score',
    'current score', 'score status', 'score summary', 'how am i doing',
    'security score', 'posture score', 'rating', 'my rating',
    'how safe am i', 'am i safe', 'am i protected', 'am i quantum safe',
    'security status', 'security posture', 'overall security',
    'how secure is my infrastructure', 'quantum readiness status',
  ]},

  { intent: 'vulnerable_count', patterns: [
    'vulnerable', 'critical asset', 'at risk', 'unsafe',
    'how many critical', 'dangerous', 'vulnerable assets',
    'critical vulnerabilities', 'high risk', 'risk count',
    'how many at risk', 'assets at risk', 'exposed assets',
    'insecure assets', 'weak assets', 'unprotected assets',
    'how many need fixing', 'how many need migration',
    'how many are not safe', 'unsafe count',
  ]},

  { intent: 'safe_count', patterns: [
    'safe asset', 'quantum safe', 'quantum ready', 'pqc ready',
    'how many safe', 'secure asset', 'protected assets',
    'how many are safe', 'safe count', 'safe percentage',
    'quantum safe count', 'compliant assets', 'good assets',
    'assets that pass', 'passing assets', 'healthy assets',
  ]},

  { intent: 'worst_host', patterns: [
    'worst host', 'weakest', 'lowest score', 'most vulnerable host',
    'riskiest', 'worst performing', 'most dangerous host',
    'which host is worst', 'weakest link', 'highest risk host',
    'most critical host', 'most exposed host',
  ]},

  { intent: 'best_host', patterns: [
    'best host', 'strongest', 'highest score', 'most secure host',
    'safest', 'best performing', 'most protected host',
    'which host is best', 'top performing', 'strongest host',
  ]},

  { intent: 'glossary_score', patterns: [
    'what is score', 'explain score', 'score meaning', 'scoring system',
    'how is score calculated', 'score formula', 'score methodology',
    'what does score mean', 'scoring criteria', 'score breakdown',
    'score ranges', 'score levels', 'score categories',
    'what is good score', 'what is bad score', 'ideal score',
    'how to improve score', 'increase score', 'better score',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // RISK HEATMAP (~30 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_heatmap', patterns: [
    'heatmap guide', 'heatmap page guide', 'about heatmap', 'heatmap features',
    'how to use heatmap', 'explain heatmap page', 'heatmap page help',
    'risk heatmap overview', 'risk visualization', 'risk map',
    'color coding heatmap', 'heatmap colors', 'heatmap grid',
    'visual risk assessment', 'risk overview', 'risk dashboard',
  ]},

  { intent: 'glossary_heatmap', patterns: [
    'what is heatmap', 'explain heatmap', 'risk heatmap meaning',
    'what do heatmap colors mean', 'heatmap definition',
    'how to read heatmap', 'interpret heatmap', 'heatmap legend',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // COMPLIANCE (~60 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'compliance_score', patterns: [
    'compliance score', 'compliant', 'compliance status', 'regulatory',
    'compliance percentage', 'how compliant', 'compliance check',
    'compliance level', 'compliance overview', 'compliance summary',
    'are we compliant', 'is my system compliant', 'compliance report',
    'regulatory status', 'regulation check', 'meet requirements',
  ]},

  { intent: 'rbi_status', patterns: [
    'rbi complian', 'rbi score', 'reserve bank', 'rbi requirements',
    'rbi guidelines', 'rbi standards', 'rbi mandate', 'rbi policy',
    'banking compliance', 'banking regulation', 'banking standards',
    'rbi circular', 'rbi directive', 'rbi framework',
  ]},

  { intent: 'nist_status', patterns: [
    'nist complian', 'nist score', 'nist pqc', 'fips compliance',
    'nist requirements', 'nist guidelines', 'nist standards',
    'nist framework', 'nist assessment', 'nist mandate',
    'us standards', 'american standards', 'international standards',
  ]},

  { intent: 'compliance_gaps', patterns: [
    'compliance gap', 'non compliant', 'failing requirement',
    'compliance issues', 'compliance failures', 'what is failing',
    'where are we failing', 'what needs fixing', 'compliance violations',
    'compliance deficiency', 'missing compliance', 'unmet requirements',
  ]},

  { intent: 'page_guide_compliance', patterns: [
    'compliance guide', 'compliance page guide', 'about compliance page',
    'compliance features', 'how to use compliance', 'explain compliance page',
    'compliance page help', 'compliance mapping guide', 'regulatory mapping',
    'compliance frameworks', 'which regulations', 'supported regulations',
  ]},

  { intent: 'glossary_compliance', patterns: [
    'what is compliance', 'explain compliance', 'regulatory compliance meaning',
    'compliance definition', 'why compliance matters', 'compliance importance',
    'compliance in banking', 'crypto compliance',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // CERTIFICATES (~40 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'cert_expiring', patterns: [
    'certificate expir', 'cert expir', 'ssl expir', 'expiring cert',
    'expired cert', 'certificate validity', 'cert validity',
    'when does cert expire', 'cert renewal', 'ssl renewal',
    'certificate status', 'cert health', 'expiry alert',
    'certificate alert', 'expiring ssl', 'invalid certificate',
    'certificate problem', 'cert issue',
  ]},

  { intent: 'cert_count', patterns: [
    'how many cert', 'total cert', 'ssl count', 'certificate count',
    'certificates found', 'discovered certificates', 'cert inventory',
    'ssl inventory', 'number of certificates',
  ]},

  { intent: 'glossary_certificate', patterns: [
    'what is certificate', 'explain certificate', 'ssl certificate meaning',
    'x509', 'x.509', 'what is ssl', 'what is tls certificate',
    'certificate authority', 'ca', 'self signed', 'certificate chain',
    'certificate fingerprint', 'certificate signing',
    'how do certificates work', 'purpose of certificates',
    'why are certificates important', 'certificate types',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // REMEDIATION (~40 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'pending_fixes', patterns: [
    'pending fix', 'pending remediation', 'not fixed', 'remaining fix',
    'what needs fixing', 'unfixed issues', 'open issues', 'pending tasks',
    'outstanding fixes', 'remaining work', 'what is left to fix',
    'how many left to fix', 'unresolved issues',
  ]},

  { intent: 'remediation_progress', patterns: [
    'remediation progress', 'fix progress', 'how much fixed',
    'completion percent', 'progress status', 'how far along',
    'migration progress', 'upgrade progress', 'fix status',
    'remediation status', 'what has been fixed', 'fixed count',
  ]},

  { intent: 'critical_actions', patterns: [
    'critical action', 'urgent action', 'immediate fix', 'priority action',
    'what is most urgent', 'top priority', 'most important fix',
    'critical vulnerability', 'emergency action', 'must fix now',
    'highest priority', 'first thing to fix',
  ]},

  { intent: 'page_guide_remediation', patterns: [
    'remediation guide', 'remediation page guide', 'about remediation',
    'remediation features', 'how to use remediation', 'explain remediation page',
    'remediation tracker guide', 'fix tracker', 'remediation workflow',
    'remediation statuses', 'remediation process',
  ]},

  { intent: 'glossary_remediation', patterns: [
    'what is remediation', 'explain remediation', 'remediation meaning',
    'remediation definition', 'fixing vulnerabilities meaning',
    'remediation in security', 'vulnerability remediation',
    'how to remediate', 'remediation steps',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // MIGRATION ROADMAP (~30 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_roadmap', patterns: [
    'roadmap guide', 'roadmap page guide', 'about roadmap',
    'roadmap features', 'how to use roadmap', 'explain roadmap page',
    'migration roadmap guide', 'migration plan', 'migration strategy',
    'migration timeline', 'migration phases', 'migration schedule',
    'what is the roadmap', 'show roadmap', 'view roadmap',
  ]},

  { intent: 'glossary_migration', patterns: [
    'what is migration', 'explain migration', 'migration roadmap meaning',
    'crypto migration', 'algorithm migration', 'pqc migration',
    'migration definition', 'migration process', 'how to migrate',
    'migration phases explained', 'migration plan meaning',
    'what does migration involve', 'migration timeline',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // REPORTS (~30 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'how_to_export', patterns: [
    'export report', 'download report', 'pdf report', 'csv export',
    'json export', 'generate report', 'create report', 'make report',
    'report download', 'get report', 'save report', 'print report',
    'export data', 'download data', 'export results', 'download results',
    'executive report', 'management report', 'summary report',
    'scheduled report', 'automated report', 'report format',
    'what formats available', 'report types', 'which report format',
  ]},

  { intent: 'page_guide_reports', patterns: [
    'reports guide', 'reports page guide', 'about reports',
    'reports features', 'how to use reports', 'explain reports page',
    'report types explained', 'report hub', 'report center',
    'on demand report', 'executive report explained',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULING (~25 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_schedules', patterns: [
    'scheduling guide', 'schedule page guide', 'about scheduling',
    'scheduling features', 'how to use scheduling', 'explain scheduling',
    'schedule manager guide', 'automated scanning', 'recurring scan',
    'cron scan', 'schedule scan', 'auto scan', 'periodic scan',
    'how to schedule', 'set up schedule', 'schedule configuration',
    'daily scan', 'weekly scan', 'monthly scan',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // SCAN COMPARISON (~20 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_compare', patterns: [
    'comparison guide', 'compare page guide', 'about comparison',
    'comparison features', 'how to compare', 'explain comparison page',
    'scan comparison guide', 'compare scans', 'side by side',
    'scan diff', 'score difference', 'improvement', 'degradation',
    'compare two scans', 'scan delta', 'before and after',
    'track improvement', 'track progress over time',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // CYBER RATING (~20 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_cyber_rating', patterns: [
    'cyber rating guide', 'cyber rating page guide', 'about cyber rating',
    'cyber rating features', 'how to use cyber rating', 'explain cyber rating',
    'cybersecurity rating', 'posture score', 'security rating',
    'overall rating', 'cyber score', 'cyber assessment',
    'category breakdown', 'industry benchmark',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // PQC POSTURE (~20 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_pqc_posture', patterns: [
    'pqc posture guide', 'posture page guide', 'about pqc posture',
    'posture features', 'how to use pqc posture', 'explain pqc posture',
    'posture of pqc guide', 'migration readiness', 'algorithm status',
    'which algorithms safe', 'which algorithms need replacement',
    'algorithm assessment', 'pqc compliance status',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // ADMIN PANEL (~20 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide_admin', patterns: [
    'admin guide', 'admin page guide', 'about admin panel',
    'admin features', 'how to use admin', 'explain admin panel',
    'admin panel guide', 'user management', 'manage users',
    'create user', 'add user', 'delete user', 'edit user',
    'audit log', 'who did what', 'activity history',
    'user roles explained', 'assign roles', 'role management',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // TERMINOLOGY — PQC ALGORITHMS (~60 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'glossary_pqc', patterns: [
    'what is pqc', 'what is post quantum', 'explain pqc', 'pqc meaning',
    'pqc definition', 'post quantum cryptography', 'pqc algorithms',
    'post quantum algorithms', 'quantum resistant', 'quantum proof',
    'pqc standards', 'pqc full form', 'what does pqc stand for',
    'lattice based', 'lattice cryptography', 'module lattice',
    'pqc in banking', 'pqc for finance', 'pqc readiness',
    'pqc transition', 'pqc adoption', 'pqc implementation',
  ]},

  { intent: 'glossary_fips203', patterns: [
    'what is fips 203', 'fips 203', 'ml-kem', 'ml kem', 'mlkem',
    'module lattice key', 'key encapsulation', 'kem',
    'quantum safe key exchange', 'post quantum key exchange',
    'fips203', 'what is ml-kem', 'explain ml-kem',
  ]},

  { intent: 'glossary_fips204', patterns: [
    'what is fips 204', 'fips 204', 'ml-dsa', 'ml dsa', 'mldsa',
    'module lattice digital signature', 'quantum safe signature',
    'post quantum signature', 'fips204', 'what is ml-dsa', 'explain ml-dsa',
    'dilithium', 'crystals dilithium',
  ]},

  { intent: 'glossary_fips205', patterns: [
    'what is fips 205', 'fips 205', 'slh-dsa', 'slh dsa', 'slhdsa',
    'stateless hash', 'hash based signature', 'sphincs',
    'fips205', 'what is slh-dsa', 'explain slh-dsa',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // TERMINOLOGY — CLASSICAL CRYPTO (~50 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'glossary_rsa', patterns: [
    'what is rsa', 'explain rsa', 'rsa algorithm', 'rsa encryption',
    'rsa key', 'rsa 2048', 'rsa 4096', 'rsa vulnerability',
    'is rsa safe', 'rsa quantum', 'rsa broken', 'rsa weak',
    'why rsa is not safe', 'rsa key size', 'rsa factoring',
    'shors algorithm rsa', 'shor algorithm',
  ]},

  { intent: 'glossary_ecc', patterns: [
    'what is ecc', 'explain ecc', 'elliptic curve', 'ecdh', 'ecdsa',
    'ecc vulnerability', 'is ecc safe', 'ecc quantum', 'curve25519',
    'p256', 'p384', 'ecc key', 'elliptic curve cryptography',
  ]},

  { intent: 'glossary_aes', patterns: [
    'what is aes', 'explain aes', 'aes encryption', 'aes 128', 'aes 256',
    'aes key', 'is aes safe', 'aes quantum', 'symmetric encryption',
    'block cipher', 'aes gcm', 'aes cbc', 'advanced encryption standard',
    'grovers algorithm aes', 'grover algorithm',
  ]},

  { intent: 'glossary_sha', patterns: [
    'what is sha', 'explain sha', 'secure hash', 'sha 256', 'sha 384',
    'sha 512', 'sha 1', 'sha1 deprecated', 'hashing algorithm',
    'hash function', 'is sha safe', 'sha quantum',
    'message digest', 'cryptographic hash',
  ]},

  { intent: 'glossary_tls', patterns: [
    'what is tls', 'explain tls', 'transport layer', 'tls 1.3', 'tls 1.2',
    'tls protocol', 'tls handshake', 'tls connection', 'ssl vs tls',
    'tls security', 'tls version', 'tls vulnerability',
    'https', 'secure connection', 'encrypted connection',
  ]},

  { intent: 'glossary_cipher', patterns: [
    'what is cipher', 'explain cipher', 'cipher suite meaning',
    'cipher suite definition', 'cipher suite components',
    'how cipher suite works', 'cipher suite example',
    'bulk encryption', 'cipher negotiation', 'cipher selection',
    'tls cipher', 'ssl cipher',
  ]},

  { intent: 'glossary_hybrid', patterns: [
    'what is hybrid', 'explain hybrid', 'hybrid crypto',
    'hybrid cryptography', 'hybrid approach', 'hybrid mode',
    'classical plus quantum', 'combined encryption',
    'dual algorithm', 'hybrid key exchange', 'hybrid tls',
    'why hybrid', 'hybrid benefits', 'hybrid transition',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // TERMINOLOGY — REGULATORY (~30 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'glossary_nist', patterns: [
    'what is nist', 'explain nist', 'nist meaning', 'nist full form',
    'national institute', 'nist standards', 'nist role',
    'nist competition', 'nist pqc standardization',
    'nist post quantum', 'nist algorithm selection',
  ]},

  { intent: 'glossary_rbi', patterns: [
    'what is rbi', 'explain rbi', 'rbi meaning', 'rbi full form',
    'reserve bank of india', 'rbi role', 'rbi crypto policy',
    'rbi mandate for banks', 'rbi cybersecurity',
    'rbi digital banking', 'rbi it guidelines',
  ]},

  { intent: 'glossary_sebi', patterns: [
    'what is sebi', 'explain sebi', 'sebi meaning', 'sebi full form',
    'securities exchange board', 'sebi role', 'sebi compliance',
    'sebi cybersecurity', 'sebi data protection',
    'sebi for markets', 'sebi regulations',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // TERMINOLOGY — SCANNING & GENERAL (~40 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'glossary_scan', patterns: [
    'what is scan', 'explain scan', 'how scan works', 'scanning process',
    'what happens in scan', 'scan meaning', 'scan definition',
    'tls probe', 'tls scan', 'cryptographic scan',
    'cryptographic assessment', 'vulnerability scan', 'security scan',
    'what does scanner do', 'scanner engine', 'how scanner works',
    'scan methodology', 'scan approach', 'assessment methodology',
  ]},

  { intent: 'glossary_quantum', patterns: [
    'what is quantum', 'quantum computing', 'quantum threat', 'quantum attack',
    'quantum computer', 'quantum supremacy', 'quantum advantage',
    'qubit', 'superposition', 'entanglement', 'quantum mechanics',
    'when quantum computers', 'quantum timeline', 'q-day',
    'quantum apocalypse', 'quantum doomsday', 'cryptographic apocalypse',
    'quantum computing explained', 'how quantum computers work',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN/ASSET DATA (live queries)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'domain_count', patterns: [
    'how many domain', 'total domain', 'domain count', 'hosts scanned',
    'domains scanned', 'number of domains', 'unique hosts',
    'how many hosts', 'total hosts', 'all domains', 'all hosts',
  ]},

  { intent: 'cipher_info', patterns: [
    'cipher suite used', 'ciphers used', 'common cipher', 'encryption algorithm',
    'most used cipher', 'popular cipher', 'cipher distribution',
    'algorithm usage', 'algorithm distribution', 'top ciphers',
    'cipher breakdown', 'which ciphers', 'cipher list',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // GREETING / HELP / GENERAL (~30 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'greeting', patterns: [
    'hello', 'hi there', 'hey', 'good morning', 'good afternoon',
    'good evening', 'hi', 'howdy', 'greetings', 'hola',
    'yo', 'sup', 'whats up', 'good day',
  ]},

  { intent: 'goodbye', patterns: [
    'bye', 'goodbye', 'thank you', 'thanks', 'see you', 'later',
    'thankyou', 'thx', 'cheers', 'good bye', 'see ya',
  ]},

  { intent: 'capabilities', patterns: [
    'what can you do', 'help me', 'what do you do', 'your capabilities',
    'what are your features', 'what can you help with', 'how can you help',
    'what questions can i ask', 'what topics do you know', 'show help',
    'help', 'menu', 'options', 'assist me', 'i need help',
    'guide me', 'what should i ask', 'list commands',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // PAGE GUIDE (generic)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'page_guide', patterns: [
    'page guide', 'about this page', 'what is this page', 'explain this page',
    'features of this page', 'guide me', 'page features', 'how to use this page',
    'page overview', 'page help', 'help with this page', 'page tour',
    'show me around', 'walkthrough', 'page walkthrough', 'page tutorial',
    'what can i do here', 'what is available here', 'this page',
    'current page', 'tell me about this page', 'page description',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // ROLES & ACCESS (~25 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'roles_explained', patterns: [
    'what roles', 'roles available', 'user roles', 'role types',
    'admin role', 'analyst role', 'viewer role', 'role permissions',
    'what can admin do', 'what can analyst do', 'what can viewer do',
    'role differences', 'role access', 'role based access',
    'who can scan', 'who can view', 'who can manage users',
    'access levels', 'permission levels', 'authorization',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // HOW-TO QUESTIONS (~40 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'how_to_login', patterns: [
    'how to login', 'how to sign in', 'login process', 'sign in',
    'login help', 'cant login', 'login issue', 'forgot password',
    'login credentials', 'where to login', 'login page',
    'authentication process', 'login flow',
  ]},

  { intent: 'how_to_create_user', patterns: [
    'how to create user', 'how to add user', 'new user', 'register user',
    'add team member', 'invite user', 'create account',
    'user registration', 'sign up new user', 'add analyst',
    'add viewer', 'onboard user', 'user onboarding',
  ]},

  { intent: 'how_to_schedule', patterns: [
    'how to schedule', 'schedule a scan', 'automate scan',
    'set up recurring', 'create schedule', 'add schedule',
    'automatic scan', 'timer scan', 'cron job',
    'schedule configuration', 'schedule setup',
  ]},

  { intent: 'how_to_interpret', patterns: [
    'how to interpret', 'how to read', 'how to understand',
    'what does this mean', 'meaning of results', 'understand data',
    'read the chart', 'read the graph', 'interpret chart',
    'data interpretation', 'analysis help', 'help me understand',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // DEPLOYMENT & INFRA (~20 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'deployment', patterns: [
    'how to deploy', 'deployment', 'deploy to production',
    'deploy to cloud', 'deploy to render', 'deploy to vercel',
    'hosting options', 'production deployment', 'go live',
    'deployment guide', 'deploy instructions', 'deployment steps',
    'server setup', 'production setup', 'cloud hosting',
    'docker', 'containerize', 'ci cd', 'continuous deployment',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // TROUBLESHOOTING (~25 patterns)
  // ═══════════════════════════════════════════════════════════════
  { intent: 'troubleshooting', patterns: [
    'not working', 'error', 'bug', 'issue', 'problem',
    'scan not working', 'page not loading', 'data not showing',
    'blank page', 'error message', 'something wrong',
    'broken', 'fix issue', 'help with error', 'debug',
    'why is it not working', 'what went wrong', 'troubleshoot',
    'connection error', 'timeout error', 'server error',
    'api error', '500 error', '404 error', 'failed to load',
  ]},

  // ═══════════════════════════════════════════════════════════════
  // ALGORITHM VULNERABILITY (~200+ patterns)
  // ═══════════════════════════════════════════════════════════════

  { intent: 'why_algo_vulnerable', patterns: [
    'why is rsa vulnerable', 'why is rsa quantum vulnerable', 'why is rsa not safe',
    'why is rsa not quantum safe', 'why is rsa broken', 'how can quantum break rsa',
    'why is ecdsa vulnerable', 'why is ecdsa not safe', 'why is ecdsa quantum vulnerable',
    'why is ecdh vulnerable', 'why is ecdhe vulnerable', 'why is ecc vulnerable',
    'how can quantum break ecc', 'why is ecc not quantum safe',
    'why is dh vulnerable', 'why is diffie hellman vulnerable', 'why is dh not safe',
    'why is diffie hellman not safe', 'why is diffie hellman not quantum safe',
    'why is dsa vulnerable', 'why is dsa not safe',
    'why is 3des vulnerable', 'why is triple des vulnerable', 'why is des vulnerable',
    'why is rc4 vulnerable', 'why is rc4 not safe', 'why is rc4 broken',
    'why is sha1 vulnerable', 'why is sha-1 vulnerable', 'why is sha1 not safe',
    'why is md5 vulnerable', 'why is md5 not safe', 'why is md5 broken',
    'why is aes 128 vulnerable', 'why is aes-128 weakened', 'is aes 128 safe',
    'is aes 128 quantum safe', 'aes 128 quantum', 'aes 128 grover',
    'why algorithm vulnerable', 'why is this algorithm vulnerable',
    'what makes an algorithm vulnerable', 'how quantum breaks algorithms',
    'how does quantum computing break cryptography', 'how quantum attacks work',
    'which algorithm can quantum break', 'what can shor break',
    'what can grover break', 'what algorithms are at risk',
    'is x25519 vulnerable', 'is x25519 quantum safe', 'x25519 quantum',
    'is chacha20 safe', 'is chacha20 quantum safe', 'chacha20 quantum',
    'is poly1305 safe', 'chacha20 poly1305 quantum',
  ]},

  { intent: 'pqc_ready_algorithms', patterns: [
    'pqc ready algorithms', 'quantum safe algorithms', 'which algorithms are safe',
    'which algorithms are quantum safe', 'list safe algorithms', 'list quantum safe algorithms',
    'what algorithms are pqc ready', 'what algorithms are quantum resistant',
    'pqc algorithms list', 'post quantum algorithms list', 'safe algorithm list',
    'quantum resistant algorithms', 'quantum proof algorithms',
    'which ciphers are quantum safe', 'which encryption is quantum safe',
    'what should i use instead', 'replacement algorithms', 'alternative algorithms',
    'what replaces rsa', 'what replaces ecdsa', 'what replaces ecdhe',
    'what replaces dh', 'what replaces diffie hellman',
    'nist approved algorithms', 'nist standardized algorithms',
    'recommended algorithms', 'best quantum safe algorithms',
    'which algorithms to migrate to', 'migration target algorithms',
    'safe algorithms for banking', 'quantum safe for banks',
    'ml-kem alternatives', 'ml-dsa alternatives',
    'lattice based algorithms', 'hash based algorithms',
    'tell me safe algorithms', 'show me safe algorithms',
    'give me pqc ready algorithms', 'algorithms that are quantum safe',
  ]},

  { intent: 'vulnerable_algorithms_list', patterns: [
    'vulnerable algorithms', 'which algorithms are vulnerable',
    'list vulnerable algorithms', 'quantum vulnerable algorithms',
    'what algorithms will quantum break', 'algorithms at risk',
    'unsafe algorithms', 'insecure algorithms', 'broken algorithms',
    'algorithms to replace', 'algorithms to migrate',
    'which algorithms need replacement', 'deprecated algorithms',
    'weak algorithms', 'compromised algorithms',
    'list of unsafe algorithms', 'classical algorithms at risk',
    'algorithms shor can break', 'algorithms grover weakens',
    'tell me vulnerable algorithms', 'show me vulnerable algorithms',
    'give me vulnerable algorithms', 'what algorithms are not safe',
  ]},

  { intent: 'shor_algorithm', patterns: [
    'shor algorithm', 'shors algorithm', "shor's algorithm", 'what is shor',
    'explain shor algorithm', 'how does shor work', 'shor attack',
    'shor factoring', 'shor quantum', 'peter shor', 'shor computation',
    'integer factoring quantum', 'quantum factoring', 'factoring attack',
    'shor break rsa', 'shor break ecc', 'shor polynomial time',
    'discrete logarithm quantum', 'elliptic curve discrete log quantum',
    'how shor breaks encryption', 'what does shor algorithm do',
  ]},

  { intent: 'grover_algorithm', patterns: [
    'grover algorithm', 'grovers algorithm', "grover's algorithm", 'what is grover',
    'explain grover algorithm', 'how does grover work', 'grover attack',
    'grover search', 'grover quantum', 'lov grover', 'grover speedup',
    'quadratic speedup', 'brute force quantum', 'quantum search',
    'grover aes', 'grover symmetric', 'grover key search',
    'how grover breaks encryption', 'does grover break aes',
    'grover impact on symmetric', 'grover halves key strength',
  ]},

  { intent: 'algo_rsa_vulnerability', patterns: [
    'rsa vulnerability explained', 'how quantum breaks rsa', 'rsa quantum attack',
    'rsa shor algorithm', 'rsa factoring attack', 'rsa key size quantum',
    'is rsa 2048 safe', 'is rsa 4096 safe', 'rsa 2048 quantum',
    'rsa 4096 quantum', 'will quantum break rsa', 'when will rsa break',
    'rsa migration', 'replace rsa', 'rsa to ml-kem', 'rsa to ml-dsa',
    'rsa replacement', 'rsa alternative', 'what to use instead of rsa',
  ]},

  { intent: 'algo_ecc_vulnerability', patterns: [
    'ecc vulnerability explained', 'how quantum breaks ecc', 'ecc quantum attack',
    'ecdsa shor algorithm', 'ecdhe quantum attack', 'elliptic curve quantum',
    'is ecdsa safe', 'is ecdhe safe', 'is p256 safe', 'is p384 safe',
    'is curve25519 safe from quantum', 'ed25519 quantum', 'eddsa quantum',
    'will quantum break ecc', 'ecc migration', 'replace ecc',
    'ecc replacement', 'ecc alternative', 'what to use instead of ecc',
    'ecdsa to ml-dsa', 'ecdhe to ml-kem', 'ecc to pqc',
  ]},

  { intent: 'algo_dh_vulnerability', patterns: [
    'diffie hellman vulnerability', 'dh vulnerability', 'dh quantum',
    'is diffie hellman safe', 'is dh safe', 'dh key exchange quantum',
    'discrete log quantum', 'diffie hellman shor', 'dh shor',
    'dh migration', 'replace diffie hellman', 'dh replacement',
    'dh to ml-kem', 'what replaces diffie hellman',
  ]},

  { intent: 'algo_3des_rc4_vulnerability', patterns: [
    '3des vulnerability', 'triple des vulnerability', '3des quantum',
    'is 3des safe', 'is triple des safe', '3des deprecated', '3des broken',
    'rc4 vulnerability', 'rc4 quantum', 'is rc4 safe', 'rc4 deprecated',
    'rc4 broken', 'rc4 bias attack', 'why not use rc4', 'why not use 3des',
    'des vulnerability', 'des quantum', 'is des safe', 'des broken',
    'weak ciphers', 'deprecated ciphers', 'broken ciphers',
    'what ciphers to avoid', 'insecure ciphers',
  ]},

  { intent: 'algo_sha1_md5_vulnerability', patterns: [
    'sha1 vulnerability', 'sha-1 vulnerability', 'sha1 collision',
    'is sha1 safe', 'is sha-1 safe', 'sha1 deprecated', 'sha1 broken',
    'md5 vulnerability', 'md5 collision', 'is md5 safe', 'md5 deprecated',
    'md5 broken', 'weak hash', 'deprecated hash', 'broken hash',
    'sha1 vs sha256', 'why not sha1', 'why not md5',
    'hash collision attack', 'birthday attack hash',
  ]},

  { intent: 'algo_aes_quantum', patterns: [
    'is aes quantum safe', 'aes quantum safety', 'aes grover impact',
    'aes 256 quantum', 'aes 256 safe', 'is aes 256 quantum safe',
    'aes 256 grover', 'symmetric cipher quantum', 'symmetric encryption quantum',
    'is symmetric encryption safe from quantum', 'aes key length quantum',
    'chacha20 quantum', 'is chacha20 quantum safe', 'chacha20 poly1305 quantum safe',
    'symmetric vs asymmetric quantum', 'which encryption survives quantum',
    'aes vs rsa quantum', 'will quantum break symmetric',
  ]},

  { intent: 'glossary_fips206', patterns: [
    'what is fips 206', 'fips 206', 'fn-dsa', 'fn dsa', 'fndsa',
    'falcon', 'falcon algorithm', 'falcon signature', 'compact signature',
    'fips206', 'what is fn-dsa', 'explain fn-dsa', 'what is falcon',
    'explain falcon', 'falcon vs dilithium',
  ]},

  { intent: 'algo_comparison', patterns: [
    'compare algorithms', 'algorithm comparison', 'ml-kem vs rsa',
    'ml-dsa vs ecdsa', 'rsa vs ecc', 'aes vs rsa quantum',
    'classical vs quantum safe', 'old vs new algorithms',
    'compare pqc algorithms', 'ml-kem vs ml-dsa',
    'dilithium vs falcon', 'dilithium vs sphincs',
    'which pqc algorithm is best', 'best pqc algorithm',
    'lattice vs hash based', 'key size comparison pqc',
    'performance comparison pqc', 'pqc algorithm tradeoffs',
  ]},
];
