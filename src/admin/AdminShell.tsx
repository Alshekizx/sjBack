import { useState } from 'react';
import { useAuth } from './AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './pages/Dashboard';
import CoursesManager from './pages/CoursesManager';
import StudentsManager from './pages/StudentsManager';
import PaymentsManager from './pages/PaymentsManager';
import MediaManager from './pages/MediaManager';
import CaseLawManager from './pages/CaseLawManager';
import NotificationsManager from './pages/NotificationsManager';
import SupportManager from './pages/SupportManager';
import Analytics from './pages/Analytics';
import AuditLog from './pages/AuditLog';
import AdminUsers from './pages/AdminUsers';
import PagesManager from './pages/PagesManager';
import CollectionManager from './pages/CollectionManager';

export default function AdminShell() {
  const { hasPermission } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={setActivePage} />;
      case 'academic-levels': return <CollectionManager key={activePage} title="Academic Levels & Pricing" collection="academic-levels" description="Publish the levels and prices shown on the student website. Prices are in naira." />;
      case 'courses': return <CoursesManager />;
      case 'lessons': return <CollectionManager key={activePage} title="Lessons & Topics" collection="lessons" description="Create and maintain course lessons and topics." />;
      case 'videos': return <CollectionManager key={activePage} title="Tutorial Videos" collection="lessons" description="Add or edit a course lesson, paste its YouTube link or select an uploaded video, then set its status to published. These are the same lessons shown under Lessons & Topics." />;
      case 'resources': return <CollectionManager key={activePage} title="Resources & PDFs" collection="resources" description="Add study materials. Upload files in Media Library, then choose them here." />;
      case 'case-law': return <CaseLawManager />;
      case 'mcq': return <CollectionManager key={activePage} title="MCQ Questions" collection="mcq" description="Build and maintain the multiple-choice question bank." />;
      case 'essays': return <CollectionManager key={activePage} title="Essay Questions" collection="essays" description="Create and maintain essay and problem questions." />;
      case 'exams': return <CollectionManager key={activePage} title="Mock Exams" collection="exams" description="Build and schedule mock examinations." />;
      case 'pages-list': return <PagesManager />;
      case 'pages-editor': return <PagesManager />;
      case 'media': return <MediaManager />;
      case 'students-list': return <StudentsManager />;
      case 'students-activity': return <CollectionManager key={activePage} title="Student Activity" collection="student-activity" description="Recorded learning, progress, and examination events." />;
      case 'payments': return <PaymentsManager />;
      case 'notifications': return <NotificationsManager />;
      case 'support': return <SupportManager />;
      case 'analytics': return <Analytics />;
      case 'audit': return <AuditLog />;
      case 'admin-users': return <AdminUsers />;
      default: return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f1117' }}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide-in */}
      <div
        className={`
          fixed lg:relative z-50 lg:z-auto h-full transition-transform duration-300
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          activePage={activePage}
          onNavigate={(page) => { setActivePage(page); setMobileSidebarOpen(false); }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onNavigate={setActivePage} activePage={activePage} onMenuToggle={() => setMobileSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto" style={{ background: '#0f1117' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon, desc }: { title: string; icon: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24" style={{ color: '#6b7280' }}>
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-lg font-semibold mb-2" style={{ color: '#e2e8f0' }}>{title}</div>
      <div className="text-sm text-center max-w-xs">{desc}</div>
      <div className="mt-4 text-xs px-4 py-2 rounded-full" style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#6366f1' }}>
        Coming in next iteration
      </div>
    </div>
  );
}
