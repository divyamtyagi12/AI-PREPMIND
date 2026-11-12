import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { COMING_SOON_ITEMS } from '@/lib/navigation';
import ComingSoon from '@/pages/ComingSoon';
import Dashboard from '@/pages/Dashboard';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Onboarding from '@/pages/Onboarding';
import Register from '@/pages/Register';
import { ProtectedRoute, PublicOnlyRoute } from './guards';
import { AdminRoute } from './AdminRoute';

// Lazy-loaded Profile & Settings
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));

// Phase 2 Student Content & Practice Pages
const CategoryDetail = lazy(() => import('@/pages/CategoryDetail'));
const SubjectDetail = lazy(() => import('@/pages/SubjectDetail'));
const TopicDetail = lazy(() => import('@/pages/TopicDetail'));
const PracticeQuestion = lazy(() => import('@/pages/PracticeQuestion'));
const PracticeHistory = lazy(() => import('@/pages/PracticeHistory'));
const DsaProblemBrowser = lazy(() => import('@/pages/DsaProblemBrowser'));

// Phase 3 Student Assessment & Skill Profile Pages
const AssessmentList = lazy(() => import('@/pages/assessments/AssessmentList'));
const AssessmentIntro = lazy(() => import('@/pages/assessments/AssessmentIntro'));
const AssessmentRunner = lazy(() => import('@/pages/assessments/AssessmentRunner'));
const AssessmentResults = lazy(() => import('@/pages/assessments/AssessmentResults'));
const AssessmentReview = lazy(() => import('@/pages/assessments/AssessmentReview'));
const AssessmentHistory = lazy(() => import('@/pages/assessments/AssessmentHistory'));
const SkillProfile = lazy(() => import('@/pages/assessments/SkillProfile'));

// Phase 4 Adaptive Learning, BKT Mastery & Recommendations Pages
const AdaptivePracticeHome = lazy(() => import('@/pages/adaptive/AdaptivePracticeHome'));
const AdaptivePracticeSetup = lazy(() => import('@/pages/adaptive/AdaptivePracticeSetup'));
const AdaptivePracticeRunner = lazy(() => import('@/pages/adaptive/AdaptivePracticeRunner'));
const AdaptivePracticeResults = lazy(() => import('@/pages/adaptive/AdaptivePracticeResults'));
const MasteryDashboard = lazy(() => import('@/pages/adaptive/MasteryDashboard'));
const TopicMasteryDetails = lazy(() => import('@/pages/adaptive/TopicMasteryDetails'));
const LearningRecommendations = lazy(() => import('@/pages/adaptive/LearningRecommendations'));

// Phase 5 Personalized Learning Roadmap Pages
const RoadmapSetup = lazy(() => import('@/pages/roadmap/RoadmapSetup'));
const RoadmapDashboard = lazy(() => import('@/pages/roadmap/RoadmapDashboard'));
const RoadmapCalendar = lazy(() => import('@/pages/roadmap/RoadmapCalendar'));
const DailyStudyPlan = lazy(() => import('@/pages/roadmap/DailyStudyPlan'));
const WeeklyStudyPlan = lazy(() => import('@/pages/roadmap/WeeklyStudyPlan'));
const RoadmapMilestones = lazy(() => import('@/pages/roadmap/RoadmapMilestones'));
const RoadmapSettings = lazy(() => import('@/pages/roadmap/RoadmapSettings'));

// Phase 6 AI Tutor Pages
const AITutor = lazy(() => import('@/pages/tutor/AITutor'));
const AdminAITutor = lazy(() => import('@/pages/admin/AdminAITutor'));

// Phase 7 Online Coding Platform Pages (Monaco Editor loaded only on CodingWorkspace)
const CodingProblems = lazy(() => import('@/pages/coding/CodingProblems'));
const CodingWorkspace = lazy(() => import('@/pages/coding/CodingWorkspace'));
const CodingSubmissions = lazy(() => import('@/pages/coding/CodingSubmissions'));
const CodingAnalytics = lazy(() => import('@/pages/coding/CodingAnalytics'));

// Phase 8 AI Mock Interview Pages
const InterviewSetup = lazy(() => import('@/pages/interview/InterviewSetup'));
const InterviewSession = lazy(() => import('@/pages/interview/InterviewSession'));
const InterviewResults = lazy(() => import('@/pages/interview/InterviewResults'));
const InterviewHistory = lazy(() => import('@/pages/interview/InterviewHistory'));

// Phase 9 Unified Progress Analytics & Admin Coding
const ProgressAnalytics = lazy(() => import('@/pages/ProgressAnalytics'));
const AdminCodingProblems = lazy(() => import('@/pages/admin/AdminCodingProblems'));

// Phase 2, 3 & 5 Admin Pages
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'));
const AdminQuestionList = lazy(() => import('@/pages/admin/AdminQuestionList'));
const AdminQuestionForm = lazy(() => import('@/pages/admin/AdminQuestionForm'));
const AdminTopics = lazy(() => import('@/pages/admin/AdminTopics'));
const AiQuestionGenerator = lazy(() => import('@/pages/admin/AiQuestionGenerator'));
const QuestionReviewQueue = lazy(() => import('@/pages/admin/QuestionReviewQueue'));
const BulkQuestionImporter = lazy(() => import('@/pages/admin/BulkQuestionImporter'));
const AdminAssessmentList = lazy(() => import('@/pages/admin/AdminAssessmentList'));
const AdminAssessmentForm = lazy(() => import('@/pages/admin/AdminAssessmentForm'));
const AdminAssessmentResults = lazy(() => import('@/pages/admin/AdminAssessmentResults'));
const AdminAssessmentAnalytics = lazy(() => import('@/pages/admin/AdminAssessmentAnalytics'));
const RoadmapConfigManager = lazy(() => import('@/pages/admin/RoadmapConfigManager'));

function RouteLoadingFallback() {
  return (
    <div
      className="flex items-center justify-center min-h-[320px] text-sm text-slate-400"
      role="status"
      aria-live="polite"
    >
      Loading module...
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute requireOnboarding={false} />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        {/* Authenticated Student Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Phase 2: Category, Subject, Topic & Practice */}
            <Route path="/dsa" element={<DsaProblemBrowser />} />
            <Route path="/categories/:slug" element={<CategoryDetail />} />
            <Route path="/subjects/:id" element={<SubjectDetail />} />
            <Route path="/topics/:id" element={<TopicDetail />} />
            <Route path="/practice/:id" element={<PracticeQuestion />} />
            <Route path="/practice/history" element={<PracticeHistory />} />

            {/* Phase 3: Timed Assessments, Runner, Results, Review, History & Skill Profile */}
            <Route path="/assessments" element={<AssessmentList />} />
            <Route path="/assessments/history" element={<AssessmentHistory />} />
            <Route path="/assessments/:templateId" element={<AssessmentIntro />} />
            <Route path="/assessment-sessions/:sessionId" element={<AssessmentRunner />} />
            <Route path="/assessment-sessions/:sessionId/result" element={<AssessmentResults />} />
            <Route path="/assessment-sessions/:sessionId/review" element={<AssessmentReview />} />
            <Route path="/skill-profile" element={<SkillProfile />} />

            {/* Phase 4: Adaptive Practice, Bayesian Mastery & Recommendations */}
            <Route path="/adaptive" element={<AdaptivePracticeHome />} />
            <Route path="/adaptive/setup" element={<AdaptivePracticeSetup />} />
            <Route path="/adaptive/sessions/:sessionId" element={<AdaptivePracticeRunner />} />
            <Route path="/adaptive/sessions/:sessionId/results" element={<AdaptivePracticeResults />} />
            <Route path="/mastery" element={<MasteryDashboard />} />
            <Route path="/mastery/:topicId" element={<TopicMasteryDetails />} />
            <Route path="/recommendations" element={<LearningRecommendations />} />

            {/* Phase 5: Personalized Learning Roadmaps, Scheduling & Tasks */}
            <Route path="/roadmap" element={<RoadmapDashboard />} />
            <Route path="/roadmap/setup" element={<RoadmapSetup />} />
            <Route path="/roadmap/calendar" element={<RoadmapCalendar />} />
            <Route path="/roadmap/daily" element={<DailyStudyPlan />} />
            <Route path="/roadmap/weekly" element={<WeeklyStudyPlan />} />
            <Route path="/roadmap/milestones" element={<RoadmapMilestones />} />
            <Route path="/roadmap/settings" element={<RoadmapSettings />} />

            {/* Phase 6 AI Tutor Route */}
            <Route path="/ai-tutor" element={<AITutor />} />

            {/* Phase 7 Online Coding Platform Routes */}
            <Route path="/coding" element={<CodingProblems />} />
            <Route path="/coding/analytics" element={<CodingAnalytics />} />
            <Route path="/coding/submissions" element={<CodingSubmissions />} />
            <Route path="/coding/:id" element={<CodingWorkspace />} />

            {/* Phase 8 AI Mock Interview Routes */}
            <Route path="/interviews" element={<InterviewHistory />} />
            <Route path="/interviews/setup" element={<InterviewSetup />} />
            <Route path="/interviews/:sessionId" element={<InterviewSession />} />
            <Route path="/interviews/:sessionId/results" element={<InterviewResults />} />

            {/* Phase 9 Unified Progress Analytics */}
            <Route path="/analytics" element={<ProgressAnalytics />} />

            {/* Admin Management Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/questions" element={<AdminQuestionList />} />
              <Route path="/admin/questions/new" element={<AdminQuestionForm />} />
              <Route path="/admin/questions/:id/edit" element={<AdminQuestionForm />} />
              <Route path="/admin/coding" element={<AdminCodingProblems />} />
              <Route path="/admin/topics" element={<AdminTopics />} />
              <Route path="/admin/generate" element={<AiQuestionGenerator />} />
              <Route path="/admin/review" element={<QuestionReviewQueue />} />
              <Route path="/admin/import" element={<BulkQuestionImporter />} />
              <Route path="/admin/assessments" element={<AdminAssessmentList />} />
              <Route path="/admin/assessments/new" element={<AdminAssessmentForm />} />
              <Route path="/admin/assessments/:id/edit" element={<AdminAssessmentForm />} />
              <Route path="/admin/assessment-results" element={<AdminAssessmentResults />} />
              <Route path="/admin/assessment-analytics" element={<AdminAssessmentAnalytics />} />
              <Route path="/admin/roadmap-config" element={<RoadmapConfigManager />} />
              <Route path="/admin/tutor-config" element={<AdminAITutor />} />
            </Route>

            {/* Coming Soon Placeholders for Future Phases */}
            {COMING_SOON_ITEMS.map((item) => (
              <Route key={item.to} path={item.to} element={<ComingSoon item={item} />} />
            ))}
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
