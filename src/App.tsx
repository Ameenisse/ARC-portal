import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { QuizPage } from './pages/public/QuizPage';
import { QuizResultsPage } from './pages/public/QuizResultsPage';
import { AboutPage } from './pages/public/AboutPage';
import { EventsPage } from './pages/public/EventsPage';
import { LoginPage } from './pages/public/LoginPage';

// Portal Module Pages
import { DashboardPage } from './pages/portal/DashboardPage';
import { BudgetPage } from './pages/portal/BudgetPage';
import { ContentMgmtPage } from './pages/portal/ContentMgmtPage';
import { RamazanQuizMgmtPage } from './pages/portal/RamazanQuizMgmtPage';
import { UsersMgmtPage } from './pages/portal/UsersMgmtPage';
import { AuditLogsPage } from './pages/portal/AuditLogsPage';
import { ClubRulesMgmtPage } from './pages/portal/ClubRulesMgmtPage';
import { SettingsPage } from './pages/portal/SettingsPage';
import { ProfilePage } from './pages/portal/ProfilePage';
import { MessagesPage } from './pages/portal/MessagesPage';
import { MembersMgmtPage } from './pages/portal/MembersMgmtPage';
import { EventsMeetingsMgmtPage } from './pages/portal/EventsMeetingsMgmtPage';

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/quiz/results" element={<QuizResultsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/about-us" element={<AboutPage />} />
              <Route path="/team" element={<AboutPage />} />
              <Route path="/contact" element={<AboutPage />} />
              <Route path="/events" element={<EventsPage />} />

              {/* Hidden Login Page */}
              <Route path="/login" element={<LoginPage />} />

              {/* Portal Protected Routes & Grouped Modules */}
              <Route path="/portal" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              
              {/* Members Module */}
              <Route path="/portal/members" element={<ProtectedRoute><MembersMgmtPage /></ProtectedRoute>} />

              {/* Events & Meetings Module */}
              <Route path="/portal/events-meetings" element={<ProtectedRoute><EventsMeetingsMgmtPage /></ProtectedRoute>} />

              {/* Budget & Finance Module */}
              <Route path="/portal/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
              <Route path="/portal/budget/income" element={<Navigate to="/portal/budget?tab=income" replace />} />
              <Route path="/portal/budget/expenses" element={<Navigate to="/portal/budget?tab=expenses" replace />} />
              <Route path="/portal/budget/allocations" element={<Navigate to="/portal/budget?tab=allocations" replace />} />
              <Route path="/portal/budget/fund-manager" element={<Navigate to="/portal/budget?tab=fund_manager" replace />} />
              <Route path="/portal/budget/contributions" element={<Navigate to="/portal/budget?tab=fund_manager" replace />} />
              <Route path="/portal/budget/accounts" element={<Navigate to="/portal/budget?tab=accounts" replace />} />
              <Route path="/portal/budget/settings" element={<Navigate to="/portal/budget?tab=settings" replace />} />
              <Route path="/portal/budget/reports" element={<Navigate to="/portal/budget?tab=reports" replace />} />

              {/* Ramazan Quiz Module */}
              <Route path="/portal/ramazan-quiz" element={<ProtectedRoute><RamazanQuizMgmtPage /></ProtectedRoute>} />
              <Route path="/portal/quiz-participants" element={<Navigate to="/portal/ramazan-quiz?tab=participants" replace />} />
              <Route path="/portal/quiz-winners" element={<Navigate to="/portal/ramazan-quiz?tab=winners" replace />} />

              {/* Public Site Module */}
              <Route path="/portal/public-site" element={<ProtectedRoute><ContentMgmtPage /></ProtectedRoute>} />
              <Route path="/portal/content" element={<ProtectedRoute><ContentMgmtPage /></ProtectedRoute>} />
              <Route path="/portal/events" element={<Navigate to="/portal/public-site?tab=events" replace />} />
              <Route path="/portal/slideshow" element={<Navigate to="/portal/public-site?tab=slideshow" replace />} />
              <Route path="/portal/vision-mission" element={<Navigate to="/portal/public-site?tab=vision_mission" replace />} />
              <Route path="/portal/exco-team" element={<Navigate to="/portal/public-site?tab=exco_team" replace />} />
              <Route path="/portal/social-media" element={<Navigate to="/portal/public-site?tab=social_media" replace />} />
              <Route path="/portal/contact" element={<Navigate to="/portal/public-site?tab=contact" replace />} />

              {/* User Management Module */}
              <Route path="/portal/users" element={<ProtectedRoute><UsersMgmtPage /></ProtectedRoute>} />
              <Route path="/portal/roles-permissions" element={<Navigate to="/portal/users?tab=roles" replace />} />

              {/* General Settings & System Logs */}
              <Route path="/portal/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/portal/inbox" element={<Navigate to="/portal/messages" replace />} />
              <Route path="/portal/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
              <Route path="/portal/club-rules" element={<ProtectedRoute><ClubRulesMgmtPage /></ProtectedRoute>} />
              <Route path="/portal/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/portal/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
