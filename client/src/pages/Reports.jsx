import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, Zap, Briefcase } from 'lucide-react';
import ScheduleReporting from './ScheduleReporting';
import OnDemandReporting from './OnDemandReporting';
import ExecutivesReporting from './ExecutivesReporting';

const TABS = [
  { key: 'schedule', label: 'Schedule Reporting', icon: <CalendarClock size={16} />, description: 'Automated recurring reports' },
  { key: 'ondemand', label: 'On Demand Reporting', icon: <Zap size={16} />, description: 'Export reports instantly' },
  { key: 'executives', label: 'Executives Reporting', icon: <Briefcase size={16} />, description: 'High-level insights & KPIs' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Schedule, generate, and review PQC assessment reports</p>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ marginBottom: 24, padding: '6px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === tab.key ? '#2563eb' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              }}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}>
          {activeTab === 'schedule' && <ScheduleReporting />}
          {activeTab === 'ondemand' && <OnDemandReporting />}
          {activeTab === 'executives' && <ExecutivesReporting />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
