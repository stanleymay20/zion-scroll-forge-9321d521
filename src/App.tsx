import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./contexts/AuthContext";
import { InstitutionProvider } from "./contexts/InstitutionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorHandlingProvider } from "./contexts/ErrorHandlingContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useRealtimeSubscriptions } from "@/hooks/useRealtime";
import { MainLayout } from "./components/layout/MainLayout";
import { PublicLayout } from "./components/layout/PublicLayout";
import { MobileAppInstallPrompt } from "@/components/mobile";
import { PWAInstallPrompt, OfflineIndicator, PWAUpdatePrompt } from "@/components/pwa";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import OAuthCallback from "./pages/auth/OAuthCallback";
import { ComingSoonPage } from "./components/layout/PageTemplate";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const EnhancedDashboard = lazy(() => import("@/pages/EnhancedDashboard"));
const ForgeDashboard = lazy(() => import("@/pages/ForgeDashboard"));
const ScrollSpecs = lazy(() => import("@/pages/ScrollSpecs"));
const Agents = lazy(() => import("@/pages/Agents"));
const ForgeSessions = lazy(() => import("@/pages/ForgeSessions"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseLearn = lazy(() => import("./pages/CourseLearn"));
const CourseLearningPage = lazy(() => import("./pages/CourseLearningPage"));
const ModuleDetail = lazy(() => import("./pages/ModuleDetail"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const AITutors = lazy(() => import("./pages/AITutors"));
const AITutorChat = lazy(() => import("./pages/AITutorChat"));
const AITutorOfficeHours = lazy(() => import("./pages/AITutorOfficeHours"));
const AITutorAnalytics = lazy(() => import("./pages/AITutorAnalytics"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const AvatarCustomization = lazy(() => import("./pages/AvatarCustomization"));
const ContentGeneration = lazy(() => import("./pages/ContentGeneration"));
const Community = lazy(() => import("./pages/Community"));
const UserProfilePage = lazy(async () => ({
  default: (await import("./components/community")).UserProfilePage,
}));
const Assessments = lazy(() => import("./pages/Assessments"));
const ScrollCoin = lazy(() => import("./pages/ScrollCoin"));
const Wallet = lazy(() => import("./pages/Wallet"));
const SpiritualFormation = lazy(() => import("./pages/SpiritualFormation"));
const PrayerRequests = lazy(() => import("./pages/PrayerRequests"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Transcript = lazy(() => import("./pages/Transcript"));
const StudyGroups = lazy(() => import("./pages/StudyGroups"));
const StudyGroupChat = lazy(() => import("./pages/StudyGroupChat"));
const Achievements = lazy(() => import("./pages/Achievements"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LaunchOps = lazy(() => import("./pages/LaunchOps"));
const Apply = lazy(() => import("./pages/Apply"));
const FacultyDashboard = lazy(() => import("./pages/FacultyDashboard"));
const Gradebook = lazy(() => import("./pages/Gradebook"));
const FacultyGradebookIndex = lazy(() => import("./pages/FacultyGradebookIndex"));
const AlumniPortal = lazy(() => import("./pages/AlumniPortal"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const FacultyGallery = lazy(() => import("./pages/FacultyGallery"));
const FacultyDetail = lazy(() => import("./pages/FacultyDetail"));
const FacultyComparison = lazy(() => import("./pages/FacultyComparison"));
const GenerationHistory = lazy(() => import("./pages/admin/GenerationHistory"));
const ContentGenerationAdmin = lazy(() => import("./pages/ContentGenerationAdmin"));
const IvyParityAdmin = lazy(() => import("./pages/admin/IvyParityAdmin"));
const CoursePreviewsAdmin = lazy(() => import("./pages/admin/CoursePreviewsAdmin"));
const TransferRequestsAdmin = lazy(() => import("./pages/admin/TransferRequestsAdmin"));
const AcademicIntegrityAlerts = lazy(() => import("./pages/admin/AcademicIntegrityAlerts"));
const CurriculumDepthAdmin = lazy(() => import("./pages/admin/CurriculumDepthAdmin"));
const CurriculumReviewsQueue = lazy(() => import("./pages/faculty/CurriculumReviewsQueue"));
const RegistrarStandingDashboard = lazy(() => import("./pages/registrar/RegistrarStandingDashboard"));
const AccreditationReadinessAdmin = lazy(() => import("./pages/admin/AccreditationReadinessAdmin"));
const IntegrityCasesAdmin = lazy(() => import("./pages/admin/IntegrityCasesAdmin"));
const StudentIntegrityCenter = lazy(() => import("./pages/StudentIntegrityCenter"));
const GovernanceTransparency = lazy(() => import("./pages/GovernanceTransparency"));
const AccreditationStatus = lazy(() => import("./pages/AccreditationStatus"));
const ProgramVerification = lazy(() => import("./pages/ProgramVerification"));
const CatalogTruth = lazy(() => import("./pages/CatalogTruth"));
const PublicClaimsAdmin = lazy(() => import("./pages/admin/PublicClaimsAdmin"));
const Outcomes = lazy(() => import("./pages/Outcomes"));
const EmploymentMethodology = lazy(() => import("./pages/EmploymentMethodology"));
const ResearchImpact = lazy(() => import("./pages/ResearchImpact"));
const GraduateSuccess = lazy(() => import("./pages/GraduateSuccess"));
const OutcomesAdmin = lazy(() => import("./pages/admin/OutcomesAdmin"));
const StudentThesisCenter = lazy(() => import("./pages/StudentThesisCenter"));
const ThesisCommitteePortal = lazy(() => import("./pages/ThesisCommitteePortal"));
const PublicDefenseCalendar = lazy(() => import("./pages/PublicDefenseCalendar"));
const ThesisGovernanceAdmin = lazy(() => import("./pages/admin/ThesisGovernanceAdmin"));
const StudentPracticumCenter = lazy(() => import("./pages/StudentPracticumCenter"));
const SupervisorPortal = lazy(() => import("./pages/SupervisorPortal"));
const PracticumAdmin = lazy(() => import("./pages/admin/PracticumAdmin"));
const FacultyCredentialsCenter = lazy(() => import("./pages/FacultyCredentialsCenter"));
const FacultyGovernanceAdmin = lazy(() => import("./pages/admin/FacultyGovernanceAdmin"));
const StudentTranscript = lazy(() => import("./pages/StudentTranscript"));
const TranscriptVerification = lazy(() => import("./pages/TranscriptVerification"));
const AcademicCalendarAdmin = lazy(() => import("./pages/admin/AcademicCalendarAdmin"));
const LearningProfileOnboarding = lazy(() => import("./pages/LearningProfileOnboarding"));
const PersonalizedDashboard = lazy(() => import("./pages/PersonalizedDashboard"));
const LearningGoals = lazy(() => import("./pages/LearningGoals"));
const SkillsAssessment = lazy(() => import("./pages/SkillsAssessment"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrayerJournal = lazy(() => import("./pages/PrayerJournal"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const DegreePrograms = lazy(() => import("./pages/DegreePrograms"));
const DegreeProgramDetail = lazy(() => import("./pages/DegreeProgramDetail"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));
const ScrollGoldWallet = lazy(() => import("./pages/ScrollGoldWallet"));
const ScrollGoldLeaderboard = lazy(() => import("./pages/ScrollGoldLeaderboard"));
const AITutorsCatalog = lazy(() => import("./pages/AITutorsCatalog"));
const TutorSession = lazy(() => import("./pages/TutorSession"));
const AITutorInterface = lazy(() => import("./pages/AITutorInterface"));
const VirtualLabsPage = lazy(() => import("./pages/VirtualLabsPage"));
const XRClassroomsPage = lazy(() => import("./pages/XRClassroomsPage"));
const AdmissionsReview = lazy(() => import("./pages/AdmissionsReview"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const CourseAnalyticsPage = lazy(() => import("./pages/CourseAnalyticsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const GenerationMonitor = lazy(() => import("./pages/GenerationMonitor"));
const InstitutionsAdmin = lazy(() => import("./pages/InstitutionsAdmin"));
const SystemStatus = lazy(() => import("./pages/SystemStatus"));
const InstitutionOnboarding = lazy(() => import("./pages/InstitutionOnboarding"));
const FacultyAnalytics = lazy(() => import("./pages/FacultyAnalytics"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const FacultyAdmin = lazy(() => import("./pages/FacultyAdmin"));
const CommunityFeed = lazy(() => import("./pages/CommunityFeed"));
const DailyDevotion = lazy(() => import("./pages/DailyDevotion"));
const ScriptureMemory = lazy(() => import("./pages/ScriptureMemory"));
const Testimonies = lazy(() => import("./pages/Testimonies"));
const FellowshipRooms = lazy(() => import("./pages/FellowshipRooms"));
const SpiritualMentor = lazy(() => import("./pages/SpiritualMentor"));
const RedemptionStore = lazy(() => import("./pages/RedemptionStore"));
const AssignmentUpload = lazy(() => import("./pages/AssignmentUpload"));
const DegreeAudit = lazy(() => import("./pages/DegreeAudit"));
const ScholarshipsPage = lazy(() => import("./pages/ScholarshipsPage"));
const RealTimeMessaging = lazy(() => import("./pages/RealTimeMessaging"));
const ScrollBadgeGallery = lazy(async () => ({
  default: (await import("./pages/ScrollBadgeGallery")).ScrollBadgeGallery,
}));
const PublicBadgeProfile = lazy(async () => ({
  default: (await import("./pages/PublicBadgeProfile")).PublicBadgeProfile,
}));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const MobileFeaturesDemo = lazy(() => import("./pages/MobileFeaturesDemo"));
const CourseCatalog = lazy(() => import("./pages/CourseCatalog"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
const QuizTaking = lazy(() => import("./pages/QuizTaking"));
const AcademicCalendar = lazy(() => import("./pages/AcademicCalendar"));
const ScrollLibrary = lazy(() => import("./pages/ScrollLibrary"));
const ScrollLibraryBookReader = lazy(() => import("./pages/ScrollLibraryBookReader"));
const AcademicTermAdmin = lazy(() => import("./pages/AcademicTermAdmin"));
const StudentGraduation = lazy(() => import("./pages/StudentGraduation"));
const SUYASAdmin = lazy(() => import("./pages/SUYASAdmin"));
const TrustCenter = lazy(() => import("./pages/TrustCenter"));
const AcademicTrust = lazy(() => import("./pages/AcademicTrust"));
const FacultyRegistry = lazy(() => import("./pages/FacultyRegistry"));
const IvyParity = lazy(() => import("./pages/IvyParity"));
const CapstoneTracks = lazy(() => import("./pages/CapstoneTracks"));
const ResearchPublications = lazy(() => import("./pages/ResearchPublications"));
const OralDefenses = lazy(() => import("./pages/OralDefenses"));
const PrimarySources = lazy(() => import("./pages/PrimarySources"));
const CatalogExpansion = lazy(() => import("./pages/CatalogExpansion"));
const AcademicIntegrity = lazy(() => import("./pages/AcademicIntegrity"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const FacultyDirectory = lazy(() => import("./pages/FacultyDirectory"));
const OutcomesDashboard = lazy(() => import("./pages/OutcomesDashboard"));
const FoundingWall = lazy(() => import("./pages/FoundingWall"));
const VerifyCredential = lazy(() => import("./pages/VerifyCredential"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify"));
const Orientation = lazy(() => import("./pages/Orientation"));
const Matriculation = lazy(() => import("./pages/Matriculation"));
const AcademicCatalog = lazy(() => import("./pages/AcademicCatalog"));
const CoursePreview = lazy(() => import("./pages/CoursePreview"));
const StudentIdentity = lazy(() => import("./pages/StudentIdentity"));
const ActivationProgress = lazy(() => import("./pages/admin/ActivationProgress"));

// Route guards (eager — small, used everywhere)
import {
  RoleRoute,
  CourseAccessRoute,
  StudentStatusRoute,
} from "./components/routing/Guards";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-primary">Loading ScrollUniversity...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Loading ScrollUniversity...</p>
      <p className="text-xs text-muted-foreground mt-2">✝️ Jesus Christ is Lord</p>
    </div>
  </div>
);

// Realtime subscriptions wrapper
const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  useRealtimeSubscriptions();
  return <>{children}</>;
};

const PublicAppShell = ({ children }: { children: React.ReactNode }) => (
  <ErrorHandlingProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MobileViewportConfig />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ErrorHandlingProvider>
);

const ProtectedAppProviders = ({ children }: { children: React.ReactNode }) => (
  <InstitutionProvider>
    <RealtimeProvider>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <MobileAppInstallPrompt />
      {children}
    </RealtimeProvider>
  </InstitutionProvider>
);

// Mobile viewport configuration
const MobileViewportConfig = () => {
  useEffect(() => {
    // Set viewport meta tag for mobile devices
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
      );
    }

    // Prevent zoom on input focus (iOS)
    const style = document.createElement('style');
    style.textContent = `
      @media screen and (max-width: 768px) {
        input, textarea, select {
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <PublicAppShell>
        <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Index />} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            
            {/* Public Badge Profile */}
            <Route path="/badges/public/:userId" element={<PublicBadgeProfile />} />
            
            {/* Public Browsing Routes (no auth required) — all catalog aliases redirect to /catalog */}
            <Route path="/courses" element={<Navigate to="/catalog" replace />} />
            <Route path="/course-catalog" element={<Navigate to="/catalog" replace />} />
            <Route path="/courses-catalog" element={<Navigate to="/catalog" replace />} />
            <Route path="/comprehensive-courses" element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<PublicLayout />}>
              <Route index element={<AcademicCatalog />} />
            </Route>
            <Route path="/course/:courseId/preview" element={<CoursePreview />} />
            <Route path="/faculties" element={<PublicLayout />}>
              <Route index element={<FacultyGallery />} />
            </Route>
            <Route path="/faculties/:facultyId" element={<PublicLayout />}>
              <Route index element={<FacultyDetail />} />
            </Route>
            <Route path="/degrees" element={<PublicLayout />}>
              <Route index element={<DegreePrograms />} />
            </Route>
            <Route path="/degree-programs" element={<PublicLayout />}>
              <Route index element={<DegreePrograms />} />
            </Route>
            <Route path="/degrees/:id" element={<PublicLayout />}>
              <Route index element={<DegreeProgramDetail />} />
            </Route>
            <Route path="/degree-programs/:id" element={<PublicLayout />}>
              <Route index element={<DegreeProgramDetail />} />
            </Route>
            <Route path="/trust" element={<PublicLayout />}>
              <Route index element={<TrustCenter />} />
            </Route>
            <Route path="/governance" element={<PublicLayout />}>
              <Route index element={<GovernanceTransparency />} />
            </Route>
            <Route path="/accreditation-status" element={<PublicLayout />}>
              <Route index element={<AccreditationStatus />} />
            </Route>
            <Route path="/program-verification/:id" element={<PublicLayout />}>
              <Route index element={<ProgramVerification />} />
            </Route>
            <Route path="/catalog-truth" element={<PublicLayout />}>
              <Route index element={<CatalogTruth />} />
            </Route>
            <Route path="/outcomes" element={<PublicLayout />}>
              <Route index element={<Outcomes />} />
            </Route>
            <Route path="/employment-methodology" element={<PublicLayout />}>
              <Route index element={<EmploymentMethodology />} />
            </Route>
            <Route path="/research-impact" element={<PublicLayout />}>
              <Route index element={<ResearchImpact />} />
            </Route>
            <Route path="/public-defenses" element={<PublicLayout />}>
              <Route index element={<PublicDefenseCalendar />} />
            </Route>
            <Route path="/graduate-success" element={<PublicLayout />}>
              <Route index element={<GraduateSuccess />} />
            </Route>
            <Route path="/academic-trust" element={<PublicLayout />}>
              <Route index element={<AcademicTrust />} />
            </Route>
            <Route path="/faculty-registry" element={<PublicLayout />}>
              <Route index element={<FacultyRegistry />} />
            </Route>
            <Route path="/ivy-parity" element={<PublicLayout />}>
              <Route index element={<IvyParity />} />
            </Route>
            <Route path="/capstone-tracks" element={<PublicLayout />}>
              <Route index element={<CapstoneTracks />} />
            </Route>
            <Route path="/research-publications" element={<PublicLayout />}>
              <Route index element={<ResearchPublications />} />
            </Route>
            <Route path="/oral-defenses" element={<PublicLayout />}>
              <Route index element={<OralDefenses />} />
            </Route>
            <Route path="/primary-sources" element={<PublicLayout />}>
              <Route index element={<PrimarySources />} />
            </Route>
            <Route path="/catalog-expansion" element={<PublicLayout />}>
              <Route index element={<CatalogExpansion />} />
            </Route>
            <Route path="/academic-integrity" element={<PublicLayout />}>
              <Route index element={<AcademicIntegrity />} />
            </Route>
            <Route path="/faculty-directory" element={<PublicLayout />}>
              <Route index element={<FacultyDirectory />} />
            </Route>
            <Route path="/outcomes" element={<PublicLayout />}>
              <Route index element={<OutcomesDashboard />} />
            </Route>
            <Route path="/founding-wall" element={<PublicLayout />}>
              <Route index element={<FoundingWall />} />
            </Route>
            <Route path="/verify" element={<PublicLayout />}>
              <Route index element={<VerifyCredential />} />
            </Route>
            <Route path="/verify/:certNumber" element={<CertificateVerify />} />
            
            {/* Legal Pages */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            
            {/* Authentication Routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/login" element={<Navigate to="/auth" replace />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />

            {/* Protected Routes with Main Layout */}
            <Route
              path="/"
              element={
                <ProtectedAppProviders>
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                </ProtectedAppProviders>
              }
            >
              <Route path="dashboard" element={<EnhancedDashboard />} />
              <Route path="specs" element={<ScrollSpecs />} />
              <Route path="specs/new" element={<ScrollSpecs />} />
              <Route path="specs/templates" element={<ScrollSpecs />} />
              <Route path="specs/versions" element={<ScrollSpecs />} />
              <Route path="specs/dependencies" element={<ScrollSpecs />} />
              <Route path="agents" element={<Agents />} />
              <Route path="agents/new" element={<Agents />} />
              <Route path="agents/training" element={<Agents />} />
              <Route path="agents/performance" element={<Agents />} />
              <Route path="agents/deployment" element={<Agents />} />
              <Route path="sessions" element={<ForgeSessions />} />
              <Route path="sessions/new" element={<ForgeSessions />} />
              <Route path="sessions/collab" element={<ForgeSessions />} />
              <Route path="sessions/history" element={<ForgeSessions />} />
              <Route path="workspace" element={<ForgeSessions />} />
              <Route path="activity" element={<ForgeDashboard />} />
              <Route path="status" element={<ForgeDashboard />} />
              <Route path="university/courses" element={<Dashboard />} />
              <Route path="university/faculty" element={<Dashboard />} />
              <Route path="university/students" element={<Dashboard />} />
              <Route path="university/curriculum" element={<Dashboard />} />
              <Route path="settings/api" element={<SettingsPage />} />
              <Route path="settings/integrations" element={<SettingsPage />} />
              <Route path="settings/users" element={<SettingsPage />} />
              <Route path="courses/:courseId" element={<CourseDetail />} />
              <Route path="courses/:courseId/learn" element={<CourseAccessRoute accessLevel="enrolled"><CourseLearningPage /></CourseAccessRoute>} />
              <Route path="courses/:courseId/learn-old" element={<CourseAccessRoute accessLevel="enrolled"><CourseLearn /></CourseAccessRoute>} />
              
              {/* Admissions Routes removed - not implemented */}
              <Route path="courses/:courseId/modules/:moduleId" element={<CourseAccessRoute accessLevel="enrolled"><ModuleDetail /></CourseAccessRoute>} />
              <Route path="quiz/:quizId" element={<CourseAccessRoute accessLevel="enrolled"><QuizPage /></CourseAccessRoute>} />
              <Route path="ai-tutors" element={<AITutors />} />
              <Route path="ai-tutors/:tutorId" element={<AITutorChat />} />
              <Route path="ai-tutors/:tutorId/profile" element={<TutorProfile />} />
              <Route path="ai-tutors/office-hours" element={<AITutorOfficeHours />} />
              <Route path="ai-tutors/analytics" element={<AITutorAnalytics />} />
              <Route path="avatar-customization" element={<AvatarCustomization />} />
              <Route path="content-generation" element={<ContentGeneration />} />
              <Route path="community" element={<Community />} />
              <Route path="community/users/:userId" element={<UserProfilePage />} />
              <Route path="scrollcoin" element={<ScrollCoin />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="spiritual-formation" element={<SpiritualFormation />} />
              <Route path="prayer-requests" element={<PrayerRequests />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="transcript" element={<StudentStatusRoute allowedStatuses={["enrolled","active","graduated","alumni"]}><Transcript /></StudentStatusRoute>} />
              <Route path="study-groups" element={<StudyGroups />} />
              <Route path="study-groups/:groupId" element={<StudyGroupChat />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="admin" element={<RoleRoute allowedRoles={["admin","superadmin"]}><AdminDashboard /></RoleRoute>} />
              <Route path="admin/generation-history" element={<RoleRoute allowedRoles={["admin","superadmin"]}><GenerationHistory /></RoleRoute>} />
              <Route path="admin/content-generation" element={<RoleRoute allowedRoles={["admin","superadmin"]}><ContentGenerationAdmin /></RoleRoute>} />
              <Route path="admin/institutions" element={<RoleRoute allowedRoles={["admin","superadmin"]}><InstitutionsAdmin /></RoleRoute>} />
              <Route path="admin/ivy-parity" element={<RoleRoute allowedRoles={["admin","superadmin"]}><IvyParityAdmin /></RoleRoute>} />
              <Route path="admin/course-previews" element={<RoleRoute allowedRoles={["admin","superadmin"]}><CoursePreviewsAdmin /></RoleRoute>} />
              <Route path="admin/transfers" element={<RoleRoute allowedRoles={["admin","superadmin","registrar","faculty"]}><TransferRequestsAdmin /></RoleRoute>} />
              <Route path="admin/super" element={<RoleRoute allowedRoles={["superadmin"]}><SuperAdmin /></RoleRoute>} />
              <Route path="admin/integrity-alerts" element={<RoleRoute allowedRoles={["admin","superadmin","registrar"]}><AcademicIntegrityAlerts /></RoleRoute>} />
              <Route path="admin/curriculum-depth" element={<RoleRoute allowedRoles={["admin","superadmin","faculty","registrar"]}><CurriculumDepthAdmin /></RoleRoute>} />
              <Route path="faculty/curriculum-reviews" element={<RoleRoute allowedRoles={["admin","superadmin","faculty"]}><CurriculumReviewsQueue /></RoleRoute>} />
              <Route path="registrar/standing" element={<RoleRoute allowedRoles={["admin","superadmin","registrar"]}><RegistrarStandingDashboard /></RoleRoute>} />
              <Route path="admin/accreditation-readiness" element={<RoleRoute allowedRoles={["admin","superadmin","registrar","faculty"]}><AccreditationReadinessAdmin /></RoleRoute>} />
              <Route path="admin/integrity-cases" element={<RoleRoute allowedRoles={["admin","superadmin","registrar","faculty"]}><IntegrityCasesAdmin /></RoleRoute>} />
              <Route path="admin/public-claims" element={<RoleRoute allowedRoles={["admin","superadmin","registrar"]}><PublicClaimsAdmin /></RoleRoute>} />
              <Route path="admin/outcomes" element={<RoleRoute allowedRoles={["admin","superadmin","registrar"]}><OutcomesAdmin /></RoleRoute>} />
              <Route path="admin/thesis-governance" element={<RoleRoute allowedRoles={["admin","superadmin","registrar"]}><ThesisGovernanceAdmin /></RoleRoute>} />
              <Route path="faculty/committee" element={<RoleRoute allowedRoles={["faculty","admin","superadmin","registrar"]}><ThesisCommitteePortal /></RoleRoute>} />
              <Route path="thesis" element={<StudentThesisCenter />} />
              <Route path="practicum" element={<StudentPracticumCenter />} />
              <Route path="supervisor" element={<SupervisorPortal />} />
              <Route path="admin/practicum" element={<RoleRoute allowedRoles={["admin","superadmin","registrar","faculty"]}><PracticumAdmin /></RoleRoute>} />
              <Route path="faculty/credentials" element={<RoleRoute allowedRoles={["faculty","admin","superadmin","registrar"]}><FacultyCredentialsCenter /></RoleRoute>} />
              <Route path="admin/faculty-governance" element={<RoleRoute allowedRoles={["admin","superadmin","registrar"]}><FacultyGovernanceAdmin /></RoleRoute>} />
              <Route path="transcript" element={<StudentTranscript />} />
              <Route path="admin/academic-calendar" element={<RoleRoute allowedRoles={["admin","superadmin","registrar"]}><AcademicCalendarAdmin /></RoleRoute>} />
              <Route path="integrity-center" element={<StudentIntegrityCenter />} />
              <Route path="admin/launch-ops" element={<RoleRoute allowedRoles={["admin","superadmin"]}><LaunchOps /></RoleRoute>} />
              <Route path="apply" element={<Apply />} />
              <Route path="courses-detail/:courseId" element={<CourseDetailPage />} />
              <Route path="my-courses" element={<StudentStatusRoute allowedStatuses={["enrolled","active","graduated","alumni"]}><MyCourses /></StudentStatusRoute>} />
              <Route path="quiz-taking/:quizId" element={<CourseAccessRoute accessLevel="enrolled"><QuizTaking /></CourseAccessRoute>} />
              <Route path="faculty" element={<RoleRoute allowedRoles={["faculty","admin","superadmin"]}><FacultyDashboard /></RoleRoute>} />
              <Route path="faculty/admin" element={<RoleRoute allowedRoles={["faculty","admin","superadmin"]}><FacultyAdmin /></RoleRoute>} />
              <Route path="faculty/gradebook" element={<RoleRoute allowedRoles={["faculty","admin","superadmin"]}><FacultyGradebookIndex /></RoleRoute>} />
              <Route path="faculty/gradebook/:courseId" element={<RoleRoute allowedRoles={["faculty","admin","superadmin"]}><Gradebook /></RoleRoute>} />
              <Route path="admin/admissions" element={<RoleRoute allowedRoles={["admin","superadmin"]}><AdmissionsReview /></RoleRoute>} />
              <Route path="alumni" element={<AlumniPortal />} />
              
              {/* Community & Social */}
              <Route path="community-feed" element={<CommunityFeed />} />
              <Route path="messaging" element={<RealTimeMessaging />} />
              <Route path="fellowship-rooms" element={<FellowshipRooms />} />
              <Route path="spiritual-mentor" element={<SpiritualMentor />} />
              
              {/* Spiritual Formation */}
              <Route path="daily-devotion" element={<DailyDevotion />} />
              <Route path="scripture-memory" element={<ScriptureMemory />} />
              <Route path="testimonies" element={<Testimonies />} />
              
              {/* Learning */}
              <Route path="assignment-upload" element={<StudentStatusRoute allowedStatuses={["enrolled","active"]}><AssignmentUpload /></StudentStatusRoute>} />
              <Route path="degree-audit" element={<StudentStatusRoute allowedStatuses={["enrolled","active","graduated","alumni"]}><DegreeAudit /></StudentStatusRoute>} />
              <Route path="scholarships" element={<ScholarshipsPage />} />
              
              {/* ScrollCoin Economy */}
              <Route path="redemption-store" element={<RedemptionStore />} />
            
            {/* Dynamic pages */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/:userId" element={<StudentProfile />} />
            <Route path="xr-classrooms" element={<XRClassroomsPage />} />
            <Route path="virtual-labs" element={<VirtualLabsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="prayer-journal" element={<PrayerJournal />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="billing" element={<BillingDashboard />} />
            <Route path="scrollcoin-wallet" element={<ScrollGoldWallet />} />
            <Route path="scrollcoin-leaderboard" element={<ScrollGoldLeaderboard />} />
            <Route path="scrollgold-wallet" element={<ScrollGoldWallet />} />
            <Route path="scrollgold-leaderboard" element={<ScrollGoldLeaderboard />} />
            <Route path="ai-tutors-catalog" element={<AITutorsCatalog />} />
            <Route path="ai-tutor-interface" element={<AITutorInterface />} />
            <Route path="ai-tutors/:id" element={<TutorSession />} />
            <Route path="tutor-session/:id" element={<TutorSession />} />
            <Route path="admissions-review" element={<RoleRoute allowedRoles={["admin","superadmin"]}><AdmissionsReview /></RoleRoute>} />
            <Route path="analytics/dashboard" element={<RoleRoute allowedRoles={["admin","superadmin","faculty"]}><AnalyticsDashboard /></RoleRoute>} />
            <Route path="analytics/courses/:courseId" element={<RoleRoute allowedRoles={["admin","superadmin","faculty"]}><CourseAnalyticsPage /></RoleRoute>} />
            <Route path="generation-monitor" element={<RoleRoute allowedRoles={["admin","superadmin"]}><GenerationMonitor /></RoleRoute>} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="notifications/settings" element={<NotificationSettings />} />
            <Route path="system-status" element={<RoleRoute allowedRoles={["admin","superadmin"]}><SystemStatus /></RoleRoute>} />
            <Route path="institution-onboarding" element={<RoleRoute allowedRoles={["admin","superadmin"]}><InstitutionOnboarding /></RoleRoute>} />
            <Route path="faculty-analytics" element={<RoleRoute allowedRoles={["faculty","admin","superadmin"]}><FacultyAnalytics /></RoleRoute>} />
            
            {/* All other routes use coming soon pages */}
            <Route path="assessments" element={<Assessments />} />
            <Route path="divine-scorecard" element={<ComingSoonPage title="Divine Scorecard" />} />
            <Route path="prophetic-checkins" element={<ComingSoonPage title="Prophetic Check-ins" />} />
            <Route path="calling-discernment" element={<ComingSoonPage title="Calling Discernment" />} />
            <Route path="forums" element={<ComingSoonPage title="Discussion Forums" />} />
            <Route path="mentorship" element={<ComingSoonPage title="Mentorship" />} />
            <Route path="projects" element={<ComingSoonPage title="Collaborative Projects" />} />
            <Route path="marketplace" element={<ComingSoonPage title="Marketplace" />} />
            <Route path="badges" element={<ScrollBadgeGallery />} />
            <Route path="my-badges" element={<ScrollBadgeGallery />} />
              <Route path="faculties/compare" element={<FacultyComparison />} />
              <Route path="learning-profile" element={<LearningProfileOnboarding />} />
              <Route path="personalized-dashboard" element={<PersonalizedDashboard />} />
              <Route path="learning-goals" element={<LearningGoals />} />
              <Route path="skills-assessment" element={<SkillsAssessment />} />
              <Route path="career-pathways" element={<ComingSoonPage title="Career Pathways" />} />
            <Route path="job-board" element={<ComingSoonPage title="Job Board" />} />
            <Route path="research" element={<ComingSoonPage title="Research Hub" />} />
            <Route path="help" element={<ComingSoonPage title="Help Center" />} />
            <Route path="mobile-demo" element={<MobileFeaturesDemo />} />
            <Route path="academic-calendar" element={<AcademicCalendar />} />
            <Route path="scroll-library" element={<ScrollLibrary />} />
            <Route path="scroll-library/book/:bookId" element={<ScrollLibraryBookReader />} />
              <Route path="graduation" element={<StudentStatusRoute allowedStatuses={["active","graduated","alumni"]}><StudentGraduation /></StudentStatusRoute>} />
              <Route path="orientation" element={<StudentStatusRoute allowedStatuses={["admitted","enrolled","active"]}><Orientation /></StudentStatusRoute>} />
              <Route path="matriculation" element={<StudentStatusRoute allowedStatuses={["admitted","enrolled","active"]}><Matriculation /></StudentStatusRoute>} />
              <Route path="student-identity" element={<StudentStatusRoute allowedStatuses={["admitted","enrolled","active","graduated","alumni"]}><StudentIdentity /></StudentStatusRoute>} />
            <Route path="admin/academic-terms" element={<RoleRoute allowedRoles={["admin","superadmin"]}><AcademicTermAdmin /></RoleRoute>} />
            <Route path="admin/suyas" element={<RoleRoute allowedRoles={["admin","superadmin"]}><SUYASAdmin /></RoleRoute>} />
            <Route path="admin/activation" element={<RoleRoute allowedRoles={["admin","superadmin"]}><ActivationProgress /></RoleRoute>} />
          </Route>
          
          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PublicAppShell>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
