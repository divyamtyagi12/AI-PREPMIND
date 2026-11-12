import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { COMING_SOON_ITEMS } from '@/lib/navigation';
import ComingSoon from '@/pages/ComingSoon';
import Dashboard from '@/pages/Dashboard';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Onboarding from '@/pages/Onboarding';
import Profile from '@/pages/Profile';
import Register from '@/pages/Register';
import Settings from '@/pages/Settings';

// Phase 2 Student Content & Practice Pages
import CategoryDetail from '@/pages/CategoryDetail';
import SubjectDetail from '@/pages/SubjectDetail';
import TopicDetail from '@/pages/TopicDetail';
import PracticeQuestion from '@/pages/PracticeQuestion';
import PracticeHistory from '@/pages/PracticeHistory';
import DsaProblemBrowser from '@/pages/DsaProblemBrowser';

// Phase 3 Student Assessment & Skill Profile Pages
import AssessmentList from '@/pages/assessments/AssessmentList';
import AssessmentIntro from '@/pages/assessments/AssessmentIntro';
import AssessmentRunner from '@/pages/assessments/AssessmentRunner';
import AssessmentResults from '@/pages/assessments/AssessmentResults';
import AssessmentReview from '@/pages/assessments/AssessmentReview';
import AssessmentHistory from '@/pages/assessments/AssessmentHistory';
import SkillProfile from '@/pages/assessments/SkillProfile';

// Phase 4 Adaptive Learning, BKT Mastery & Recommendations Pages
import AdaptivePracticeHome from '@/pages/adaptive/AdaptivePracticeHome';
import AdaptivePracticeSetup from '@/pages/adaptive/AdaptivePracticeSetup';
import AdaptivePracticeRunner from '@/pages/adaptive/AdaptivePracticeRunner';
import AdaptivePracticeResults from '@/pages/adaptive/AdaptivePracticeResults';
import MasteryDashboard from '@/pages/adaptive/MasteryDashboard';
import TopicMasteryDetails from '@/pages/adaptive/TopicMasteryDetails';
import LearningRecommendations from '@/pages/adaptive/LearningRecommendations';

// Phase 2 & 3 Admin Pages
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminQuestionList from '@/pages/admin/AdminQuestionList';
import AdminQuestionForm from '@/pages/admin/AdminQuestionForm';
import AdminTopics from '@/pages/admin/AdminTopics';
import AiQuestionGenerator from '@/pages/admin/AiQuestionGenerator';
import QuestionReviewQueue from '@/pages/admin/QuestionReviewQueue';
import BulkQuestionImporter from '@/pages/admin/BulkQuestionImporter';
import AdminAssessmentList from '@/pages/admin/AdminAssessmentList';
import AdminAssessmentForm from '@/pages/admin/AdminAssessmentForm';
import AdminAssessmentResults from '@/pages/admin/AdminAssessmentResults';
import AdminAssessmentAnalytics from '@/pages/admin/AdminAssessmentAnalytics';

import { ProtectedRoute, PublicOnlyRoute } from './guards';
import { AdminRoute } from './AdminRoute';

export function AppRoutes() {
  return (
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

          {/* Admin Management Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/questions" element={<AdminQuestionList />} />
            <Route path="/admin/questions/new" element={<AdminQuestionForm />} />
            <Route path="/admin/questions/:id/edit" element={<AdminQuestionForm />} />
            <Route path="/admin/topics" element={<AdminTopics />} />
            <Route path="/admin/generate" element={<AiQuestionGenerator />} />
            <Route path="/admin/review" element={<QuestionReviewQueue />} />
            <Route path="/admin/import" element={<BulkQuestionImporter />} />
            <Route path="/admin/assessments" element={<AdminAssessmentList />} />
            <Route path="/admin/assessments/new" element={<AdminAssessmentForm />} />
            <Route path="/admin/assessments/:id/edit" element={<AdminAssessmentForm />} />
            <Route path="/admin/assessment-results" element={<AdminAssessmentResults />} />
            <Route path="/admin/assessment-analytics" element={<AdminAssessmentAnalytics />} />
          </Route>

          {/* Coming Soon Placeholders for Future Phases */}
          {COMING_SOON_ITEMS.map((item) => (
            <Route key={item.to} path={item.to} element={<ComingSoon item={item} />} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
