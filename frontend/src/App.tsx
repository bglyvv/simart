import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PanelChooserPage from './pages/PanelChooserPage';
import AdminMessagesPage from './pages/AdminMessagesPage';
import { RequireFamily, RequireParentAuth, RequireAdminAuth, RequirePartnerAuth, RequireNotFocusLocked, RootRedirect } from './routes/Guards';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SignupPage from './pages/SignupPage';
import AddChildPage from './pages/AddChildPage';
import FamilyGatePage from './pages/FamilyGatePage';
import FamilyPage from './pages/FamilyPage';
import ChildProfilePage from './pages/ChildProfilePage';
import HomePage from './pages/HomePage';
import HabitsPage from './pages/HabitsPage';
import AnimationsPage from './pages/AnimationsPage';
import FocusModePage from './pages/FocusModePage';
import SocialPage from './pages/SocialPage';
import LeaguesPage from './pages/LeaguesPage';
import GoalsPage from './pages/GoalsPage';
import NotificationsPage from './pages/NotificationsPage';
import GamesPage from './pages/GamesPage';
import ParentDashboardPage from './pages/ParentDashboardPage';
import SettingsPage from './pages/SettingsPage';
import WalletPage from './pages/WalletPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminHabitsPage from './pages/AdminHabitsPage';
import AdminAccountsPage from './pages/AdminAccountsPage';
import AdminRewardProposalsPage from './pages/AdminRewardProposalsPage';
import AdminBooksPage from './pages/AdminBooksPage';
import PartnerLoginPage from './pages/PartnerLoginPage';
import PartnerDashboardPage from './pages/PartnerDashboardPage';

export default function App() {
  return (
    // DESIGN_SYSTEM.md's accessibility pass (Phase 9): a single app-wide
    // switch for every framer-motion `motion.*`/`AnimatePresence` usage,
    // instead of auditing each of the ~15 files that animate — "user" makes
    // framer-motion itself honor the OS `prefers-reduced-motion` setting,
    // transforms/layout animations collapse to instant while opacity fades
    // still play.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton theme="light" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/haqqinda" element={<AboutPage />} />
          <Route path="/elaqe" element={<ContactPage />} />
          <Route path="/daxil-ol" element={<PanelChooserPage />} />
          <Route path="/giris" element={<LoginPage />} />
          <Route path="/sifre-unutdum" element={<ForgotPasswordPage />} />
          <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
          <Route path="/qeydiyyat" element={<SignupPage />} />
          <Route path="/usaq-elave-et" element={<AddChildPage />} />
          <Route path="/aile-qapisi" element={<FamilyGatePage />} />

          <Route path="/ana-sehife" element={<RequireFamily><HomePage /></RequireFamily>} />
          <Route path="/ailə-üzvləri" element={<RequireFamily><FamilyPage /></RequireFamily>} />
          <Route path="/uşaq-profili/:localId" element={<RequireFamily><ChildProfilePage /></RequireFamily>} />
          <Route path="/vərdişlər" element={<RequireFamily><HabitsPage /></RequireFamily>} />
          <Route
            path="/animasiya"
            element={
              <RequireFamily>
                <RequireNotFocusLocked>
                  <AnimationsPage />
                </RequireNotFocusLocked>
              </RequireFamily>
            }
          />
          <Route path="/focus-mode" element={<RequireFamily><FocusModePage /></RequireFamily>} />
          <Route path="/sosial" element={<RequireFamily><SocialPage /></RequireFamily>} />
          <Route path="/liqalar" element={<RequireFamily><LeaguesPage /></RequireFamily>} />
          <Route path="/məqsədlər" element={<RequireFamily><GoalsPage /></RequireFamily>} />
          <Route path="/oyunlar" element={<RequireFamily><GamesPage /></RequireFamily>} />
          <Route path="/cüzdan" element={<RequireFamily><WalletPage /></RequireFamily>} />
          <Route path="/bildirişlər" element={<RequireFamily><NotificationsPage /></RequireFamily>} />

          <Route path="/analitika" element={<RequireParentAuth><ParentDashboardPage /></RequireParentAuth>} />
          <Route path="/tənzimləmələr" element={<RequireFamily><SettingsPage /></RequireFamily>} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<RequireAdminAuth><AdminDashboardPage /></RequireAdminAuth>} />
          <Route path="/admin/habits" element={<RequireAdminAuth><AdminHabitsPage /></RequireAdminAuth>} />
          <Route path="/admin/accounts" element={<RequireAdminAuth><AdminAccountsPage /></RequireAdminAuth>} />
          <Route path="/admin/proposals" element={<RequireAdminAuth><AdminRewardProposalsPage /></RequireAdminAuth>} />
          <Route path="/admin/books" element={<RequireAdminAuth><AdminBooksPage /></RequireAdminAuth>} />
          <Route path="/admin/messages" element={<RequireAdminAuth><AdminMessagesPage /></RequireAdminAuth>} />

          <Route path="/partners/login" element={<PartnerLoginPage />} />
          <Route path="/partners" element={<RequirePartnerAuth><PartnerDashboardPage /></RequirePartnerAuth>} />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
