import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import TopicDetail from '../pages/TopicDetail';
import PracticeQuestion from '../pages/PracticeQuestion';
import DsaProblemBrowser from '../pages/DsaProblemBrowser';
import QuestionReviewQueue from '../pages/admin/QuestionReviewQueue';
import AiQuestionGenerator from '../pages/admin/AiQuestionGenerator';
import AssessmentList from '../pages/assessments/AssessmentList';
import AssessmentRunner from '../pages/assessments/AssessmentRunner';
import AssessmentHistory from '../pages/assessments/AssessmentHistory';
import { AuthContext } from '../context/AuthContext';
import * as userServiceModule from '../services/userService';
import * as contentServiceModule from '../services/contentService';

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('Login & Registration Form Validation', () => {
  it('validates required fields on Login', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ login: vi.fn(), user: null, loading: false }}>
          <Login />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /log in/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('validates registration form mismatch and short password', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ register: vi.fn(), user: null, loading: false }}>
          <Register />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    await user.type(nameInput, 'Divyam');
    await user.type(emailInput, 'divyam@example.com');
    await user.type(passInput, 'Short1');
    await user.type(confirmInput, 'Mismatch123');
    await user.click(submitBtn);

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });
});

describe('Dashboard Component Empty States & Real Statistics', () => {
  it('displays real student information and genuine empty states without fake numbers', async () => {
    const mockUser = {
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      targetRole: 'Software Development Engineer',
      preparationLevel: 'Intermediate',
      preferredLanguage: 'Java',
      preparationGoals: ['DSA', 'Core CS'],
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(contentServiceModule.practiceService, 'getStats').mockResolvedValue({
      totalAttempts: 0,
      uniqueQuestionsAttempted: 0,
      objectiveAccuracy: null,
      byCategory: [],
      recentActivity: [],
    });

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <Dashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/preparing for software development engineer/i)).toBeInTheDocument();

    // Check genuine empty states
    expect(
      await screen.findByText(/start practicing questions to unlock recommendations/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your practice accuracy will appear after your first mcq submission/i)
    ).toBeInTheDocument();

    // Verify goals display
    expect(screen.getByText('Java')).toBeInTheDocument();
  });
});

describe('Profile Editing', () => {
  it('loads profile and allows editing name and academic details', async () => {
    const mockUser = {
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      college: 'IIT Delhi',
      degree: 'B.Tech / B.E.',
      branch: 'Computer Science',
      graduationYear: 2026,
      targetRole: 'Software Development Engineer',
      preparationLevel: 'Intermediate',
      preferredLanguage: 'Java',
      preparationGoals: ['DSA'],
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(userServiceModule.userService, 'getProfile').mockResolvedValue(mockUser);
    vi.spyOn(userServiceModule.userService, 'updateProfile').mockResolvedValue({
      ...mockUser,
      name: 'Rohan Updated',
    });

    const setUserMock = vi.fn();

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser, setUser: setUserMock }}>
          <Profile />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Rohan Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('IIT Delhi')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Rohan Sharma');
    const user = userEvent.setup();
    await user.clear(nameInput);
    await user.type(nameInput, 'Rohan Updated');

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(userServiceModule.userService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Rohan Updated' })
      );
    });
  });
});

describe('Phase 2 Practice Interface Component', () => {
  it('renders question without exposing correct answer before submission, then handles submission', async () => {
    const mockQuestion = {
      id: 'q_123',
      title: 'Time Complexity of Binary Search',
      description: 'What is the worst-case time complexity of binary search on a sorted array?',
      type: 'single_choice',
      difficulty: 'Easy',
      version: 1,
      options: [
        { id: 'opt_a', text: 'O(log n)' },
        { id: 'opt_b', text: 'O(n)' },
      ],
      hints: ['Think of halving search space'],
      tags: ['binary-search'],
    };

    vi.spyOn(contentServiceModule.contentService, 'getQuestionById').mockResolvedValue(mockQuestion);
    vi.spyOn(contentServiceModule.practiceService, 'submitAttempt').mockResolvedValue({
      attempt: { isCorrect: true },
      feedback: {
        isCorrect: true,
        evaluationStatus: 'evaluated',
        correctAnswer: 'opt_a',
        explanation: 'Each step divides the search space in half.',
      },
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PracticeQuestion />
      </MemoryRouter>
    );

    // Question content displays
    expect(await screen.findByText('Time Complexity of Binary Search')).toBeInTheDocument();
    expect(screen.getByText('O(log n)')).toBeInTheDocument();
    expect(screen.getByText('O(n)')).toBeInTheDocument();

    // Verify correct answer is NOT displayed before submission
    expect(screen.queryByText(/correct answer!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/each step divides/i)).not.toBeInTheDocument();

    // Student selects option A and submits
    const optionA = screen.getByRole('radio', { name: /o\(log n\)/i });
    await user.click(optionA);

    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    await user.click(submitBtn);

    // Feedback displays
    expect(await screen.findByText(/correct answer!/i)).toBeInTheDocument();
    expect(screen.getByText(/each step divides the search space in half/i)).toBeInTheDocument();
  });
});

describe('DSA Problem Browser Component (LeetCode & CodeChef)', () => {
  it('renders external problems, platform badges, and links to original problem with status updates', async () => {
    vi.spyOn(contentServiceModule.contentService, 'getCategories').mockResolvedValue([
      { id: 'cat_dsa', name: 'DSA', slug: 'dsa' },
    ]);
    vi.spyOn(contentServiceModule.contentService, 'getTopics').mockResolvedValue([
      { id: 'top_arrays', name: 'Arrays & Hashing' },
    ]);

    const mockProblem = {
      id: 'ext_1',
      title: 'Two Sum',
      slug: 'two-sum',
      sourcePlatform: 'leetcode',
      externalProblemId: 'leetcode-1',
      sourceUrl: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy',
      tags: ['Array', 'Hash Table'],
      acceptanceRate: 54.2,
      isPremiumOnly: false,
    };

    vi.spyOn(contentServiceModule.externalProblemService, 'getProblems').mockResolvedValue({
      problems: [mockProblem],
      pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });
    vi.spyOn(contentServiceModule.externalProblemService, 'getMyProgress').mockResolvedValue([
      { externalProblemId: 'ext_1', status: 'Not Started' },
    ]);
    vi.spyOn(contentServiceModule.externalProblemService, 'updateProgress').mockResolvedValue({
      externalProblemId: 'ext_1',
      status: 'Solved',
    });

    render(
      <MemoryRouter>
        <DsaProblemBrowser />
      </MemoryRouter>
    );

    // Verify header and problem title
    expect(await screen.findByText('DSA Problem Practice & Tracking')).toBeInTheDocument();
    expect(await screen.findByText('Two Sum')).toBeInTheDocument();

    // Verify platform badge and solve link
    expect(screen.getAllByText('LeetCode').length).toBeGreaterThan(0);
    const solveLink = screen.getByRole('link', { name: /solve on leetcode/i });
    expect(solveLink).toHaveAttribute('href', 'https://leetcode.com/problems/two-sum/');
    expect(solveLink).toHaveAttribute('target', '_blank');
  });
});

describe('Question Review Queue Component', () => {
  it('renders questions in review queue and allows admin to approve', async () => {
    const mockDraftQuestion = {
      id: 'q_draft_1',
      title: 'Explain ACID Properties in DBMS',
      type: 'short_answer',
      difficulty: 'Medium',
      contentOrigin: 'ai_generated',
      reviewStatus: 'pending_review',
      status: 'Draft',
      topicId: { name: 'Transactions' },
    };

    vi.spyOn(contentServiceModule.adminService, 'getReviewQueue').mockResolvedValue({
      questions: [mockDraftQuestion],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    vi.spyOn(contentServiceModule.adminService, 'reviewQuestion').mockResolvedValue({
      id: 'q_draft_1',
      status: 'Published',
      reviewStatus: 'approved',
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuestionReviewQueue />
      </MemoryRouter>
    );

    expect(await screen.findByText('Question Review Queue')).toBeInTheDocument();
    expect(await screen.findByText('Explain ACID Properties in DBMS')).toBeInTheDocument();
    expect(screen.getAllByText(/ai generated/i).length).toBeGreaterThan(0);

    // Click Approve
    const approveBtn = screen.getByRole('button', { name: /approve & publish/i });
    await user.click(approveBtn);

    expect(contentServiceModule.adminService.reviewQuestion).toHaveBeenCalledWith(
      'q_draft_1',
      expect.objectContaining({ action: 'approve' })
    );
  });
});

describe('AI Question Generator Component', () => {
  it('renders topic taxonomy options and triggers generation API call', async () => {
    vi.spyOn(contentServiceModule.contentService, 'getCategories').mockResolvedValue([
      { id: 'cat_core', name: 'Core Computer Science', slug: 'core-cs' },
    ]);
    vi.spyOn(contentServiceModule.contentService, 'getSubjects').mockResolvedValue([
      { id: 'sub_os', name: 'Operating Systems', slug: 'operating-systems' },
    ]);
    vi.spyOn(contentServiceModule.contentService, 'getTopics').mockResolvedValue([
      { id: 'top_sched', name: 'CPU Scheduling', slug: 'cpu-scheduling' },
    ]);
    vi.spyOn(contentServiceModule.adminService, 'generateQuestions').mockResolvedValue({
      jobId: 'job_123',
      status: 'completed',
      generatedCount: 3,
      reviewQueueCount: 3,
      questions: [],
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AiQuestionGenerator />
      </MemoryRouter>
    );

    expect(await screen.findByText('AI Question Generator')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /operating systems/i })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /cpu scheduling/i })).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /generate questions/i });
    await waitFor(() => {
      expect(generateBtn).not.toBeDisabled();
    });

    await user.click(generateBtn);

    await waitFor(() => {
      expect(contentServiceModule.adminService.generateQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat_core',
          subjectId: 'sub_os',
          topicId: 'top_sched',
          referencePlatform: 'geeksforgeeks',
        })
      );
    });
  });
});

describe('Phase 3: Assessment List, Runner, Timer, Autosave & History', () => {
  it('renders available assessments and diagnostic banner', async () => {
    vi.spyOn(contentServiceModule.assessmentService, 'getAssessments').mockResolvedValue([
      {
        id: 'tpl_diag_1',
        title: 'Full Placement Diagnostic Assessment',
        description: 'Comprehensive baseline diagnostic across DSA, Core CS, and Aptitude.',
        type: 'full_diagnostic',
        durationMinutes: 25,
        totalQuestions: 10,
        difficultyDistribution: { Easy: 4, Medium: 4, Hard: 2 },
        scoring: { correct: 4, incorrect: -1, unanswered: 0 },
        studentStatus: {
          activeSessionId: null,
          attemptsUsed: 0,
          maxAttempts: 5,
          canStart: true,
          latestResult: null,
        },
      },
    ]);

    render(
      <MemoryRouter>
        <AssessmentList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Placement Assessments')).toBeInTheDocument();
    expect(
      (await screen.findAllByText('Full Placement Diagnostic Assessment')).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/start diagnostic/i)).toBeInTheDocument();
  });

  it('renders AssessmentRunner with countdown timer, navigator, autosave, and submission dialog', async () => {
    const futureExpiry = new Date(Date.now() + 15 * 60_000).toISOString();
    vi.spyOn(contentServiceModule.assessmentService, 'getSession').mockResolvedValue({
      serverTime: new Date().toISOString(),
      session: {
        id: 'sess_1',
        templateTitle: 'Core CS Assessment',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        expiresAt: futureExpiry,
        answers: [],
        questionSnapshots: [
          {
            questionId: 'q_1',
            title: 'FCFS Scheduling',
            description: 'Which algorithm is non-preemptive?',
            type: 'single_choice',
            difficulty: 'Easy',
            topicName: 'CPU Scheduling',
            options: [
              { id: 'a', text: 'FCFS' },
              { id: 'b', text: 'Round Robin' },
            ],
          },
          {
            questionId: 'q_2',
            title: 'ACID Properties',
            description: 'What does A stand for?',
            type: 'single_choice',
            difficulty: 'Medium',
            topicName: 'Transactions',
            options: [
              { id: 'a', text: 'Atomicity' },
              { id: 'b', text: 'Availability' },
            ],
          },
        ],
      },
    });

    vi.spyOn(contentServiceModule.assessmentService, 'saveAnswers').mockResolvedValue({
      savedAt: new Date().toISOString(),
      answers: [{ questionId: 'q_1', selectedAnswer: 'a', revision: 1 }],
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AssessmentRunner />
      </MemoryRouter>
    );

    expect(await screen.findByText('Core CS Assessment')).toBeInTheDocument();
    expect(await screen.findByText('FCFS Scheduling')).toBeInTheDocument();
    expect(screen.getByLabelText('Remaining time')).toBeInTheDocument();

    // Select option A and verify autosave
    const optRadio = screen.getByRole('radio', { name: /fcfs/i });
    await user.click(optRadio);

    await waitFor(() => {
      expect(contentServiceModule.assessmentService.saveAnswers).toHaveBeenCalled();
    });

    // Navigate to Question 2 via Question Navigator
    const q2Btn = screen.getByRole('button', { name: /go to question 2/i });
    await user.click(q2Btn);
    expect(await screen.findByText('ACID Properties')).toBeInTheDocument();

    // Open Submission Confirmation modal
    const submitBtn = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitBtn);
    expect(await screen.findByText('Confirm Assessment Submission')).toBeInTheDocument();
  });

  it('renders AssessmentHistory with completed attempts and summary stats', async () => {
    vi.spyOn(contentServiceModule.assessmentService, 'getHistory').mockResolvedValue({
      history: [
        {
          id: 'res_1',
          sessionId: 'sess_1',
          templateTitle: 'Full Placement Diagnostic Assessment',
          templateType: 'full_diagnostic',
          rawScore: 32,
          maximumScore: 40,
          scorePercentage: 80,
          timeTakenSeconds: 720,
          completionTrigger: 'manual_submit',
          completedAt: new Date().toISOString(),
        },
      ],
      summary: {
        totalCompleted: 1,
        latestScorePercentage: 80,
        averageScorePercentage: 80,
        topicsAssessed: 6,
        diagnosticStatus: 'Completed',
      },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <AssessmentHistory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Assessment History')).toBeInTheDocument();
    expect(
      await screen.findByText('Full Placement Diagnostic Assessment')
    ).toBeInTheDocument();
    expect(screen.getByText('32 / 40')).toBeInTheDocument();
  });
});

describe('Phase 4: Adaptive Practice Components', () => {
  it('renders DifficultyBadge with proper styling across Easy, Medium, and Hard', async () => {
    const { DifficultyBadge } = await import('../components/adaptive/DifficultyBadge');

    const { rerender } = render(<DifficultyBadge difficulty="Easy" />);
    expect(screen.getByText('Easy')).toBeInTheDocument();

    rerender(<DifficultyBadge difficulty="Medium" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();

    rerender(<DifficultyBadge difficulty="Hard" />);
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('renders MasteryCard with probability, band, and confidence badge', async () => {
    const { MasteryCard } = await import('../components/adaptive/MasteryCard');

    render(
      <MemoryRouter>
        <MasteryCard
          topic={{
            topicId: 'top_1',
            topicName: 'Dynamic Programming',
            categoryName: 'DSA',
            masteryProbability: 0.78,
            masteryClassification: 'Strong',
            evidenceLevel: 'Sufficient Evidence',
            observationsProcessed: 6,
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Dynamic Programming')).toBeInTheDocument();
    expect(screen.getByText('DSA')).toBeInTheDocument();
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText(/Sufficient Evidence/i)).toBeInTheDocument();
  });

  it('renders RecommendationCard with priority badge and action link', async () => {
    const { RecommendationCard } = await import('../components/adaptive/RecommendationCard');

    render(
      <MemoryRouter>
        <RecommendationCard
          recommendation={{
            topicId: 'top_1',
            topicName: 'Binary Trees',
            subjectName: 'Data Structures',
            currentMastery: 0.35,
            priority: 'high',
            reason: 'Mastery is low (35%) with sufficient evidence',
            suggestedAction: 'Start Practice',
            relatedRoute: '/adaptive/setup',
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Binary Trees')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText(/Mastery: 35%/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start practice/i })).toBeInTheDocument();
  });

  it('renders AdaptiveSessionProgress showing step counter and percentage', async () => {
    const { AdaptiveSessionProgress } = await import(
      '../components/adaptive/AdaptiveSessionProgress'
    );

    render(
      <AdaptiveSessionProgress
        currentQuestionIndex={3}
        maxQuestions={5}
        answeredCount={2}
        correctCount={2}
      />
    );

    expect(screen.getByText(/Question 3 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 2/i)).toBeInTheDocument();
  });
});

describe('Phase 5: Personalized Learning Roadmap Components', () => {
  it('renders RoadmapProgressCard with title, days remaining, and progress percentage', async () => {
    const { RoadmapProgressCard } = await import('../components/roadmap/RoadmapProgressCard');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);

    render(
      <RoadmapProgressCard
        roadmap={{
          title: 'Software Development Engineer Placement Roadmap',
          preparationGoal: 'Software Development Engineer',
          targetDate: futureDate.toISOString(),
          progressPercentage: 42,
          totalEstimatedMinutes: 1800,
          completedMinutes: 756,
          isProvisional: false,
          status: 'active',
        }}
        todayTasksCount={3}
        pendingCount={12}
      />
    );

    expect(screen.getByText('Software Development Engineer Placement Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Software Development Engineer')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText(/3 scheduled/i)).toBeInTheDocument();
  });

  it('renders StudyTaskCard with task type badge, estimated minutes, and action button', async () => {
    const { StudyTaskCard } = await import('../components/roadmap/StudyTaskCard');

    render(
      <MemoryRouter>
        <StudyTaskCard
          task={{
            id: 'task_1',
            title: 'Learn Binary Search Fundamentals',
            description: 'Understand low/high pointers and invariant conditions',
            taskType: 'learn',
            difficulty: 'Easy',
            estimatedMinutes: 25,
            status: 'pending',
            topicId: { name: 'Binary Search' },
            linkedRoute: '/practice',
          }}
          onComplete={vi.fn()}
          onSkip={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Learn Binary Search Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Concept Study')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('Binary Search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start/i })).toBeInTheDocument();
  });

  it('renders MilestoneCard with title, criteria, and target date', async () => {
    const { MilestoneCard } = await import('../components/roadmap/MilestoneCard');

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 20);

    render(
      <MilestoneCard
        milestone={{
          title: 'Foundation DSA Milestone',
          description: 'Complete basic array and string patterns',
          targetDate: targetDate.toISOString(),
          completionCriteria: 'Finish 10 practice problems in linear structures',
          status: 'pending',
        }}
      />
    );

    expect(screen.getByText('Foundation DSA Milestone')).toBeInTheDocument();
    expect(screen.getByText('UPCOMING')).toBeInTheDocument();
    expect(screen.getByText(/Finish 10 practice problems/i)).toBeInTheDocument();
  });

  it('renders RoadmapFeasibilityAlert when workload exceeds capacity', async () => {
    const { RoadmapFeasibilityAlert } = await import('../components/roadmap/RoadmapFeasibilityAlert');

    render(
      <RoadmapFeasibilityAlert
        feasibility={{
          isFeasible: false,
          availableMinutes: 1200,
          requiredMinutes: 2400,
          shortfallMinutes: 1200,
          suggestedDeadlineExtensionDays: 14,
          suggestedDailyIncreaseMinutes: 40,
          warningMessage: 'Workload exceeds available study time warning',
        }}
      />
    );

    expect(screen.getByText(/Workload Exceeds Capacity Warning/i)).toBeInTheDocument();
    expect(screen.getByText(/Workload exceeds available study time warning/i)).toBeInTheDocument();
    expect(screen.getByText(/\+14 days/i)).toBeInTheDocument();
  });
});

describe('Phase 6: AI Tutor UI Components', () => {
  it('renders TutorSidebar with daily quota and conversation list', async () => {
    const TutorSidebar = (await import('../components/tutor/TutorSidebar')).default;

    const mockConversations = [
      { id: 'conv-1', title: 'Binary Search Basics', contextType: 'topic' },
      { id: 'conv-2', title: 'Two Pointer Hint', contextType: 'practice' },
    ];

    render(
      <TutorSidebar
        conversations={mockConversations}
        currentId="conv-1"
        onSelect={vi.fn()}
        onNewChat={vi.fn()}
        onDelete={vi.fn()}
        quota={{ usedToday: 5, dailyLimit: 30, remaining: 25 }}
      />
    );

    expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    expect(screen.getByText('5 / 30')).toBeInTheDocument();
    expect(screen.getByText('25 questions remaining today')).toBeInTheDocument();
    expect(screen.getByText('Binary Search Basics')).toBeInTheDocument();
    expect(screen.getByText('Two Pointer Hint')).toBeInTheDocument();
  });

  it('renders TutorMessage correctly for model role with code formatting', async () => {
    const TutorMessage = (await import('../components/tutor/TutorMessage')).default;

    const message = {
      id: 'msg-1',
      role: 'model',
      content: 'Here is how to calculate mid without overflow:\n```cpp\nint mid = low + (high - low) / 2;\n```\nAlways test boundaries.',
      mode: 'explain',
    };

    render(<TutorMessage message={message} />);

    expect(screen.getByText('PrepMind Tutor')).toBeInTheDocument();
    expect(screen.getByText(/EXPLAIN/i)).toBeInTheDocument();
    expect(screen.getByText(/Always test boundaries/i)).toBeInTheDocument();
    expect(screen.getByText('cpp')).toBeInTheDocument();
    expect(screen.getByText(/int mid = low \+ \(high - low\) \/ 2;/i)).toBeInTheDocument();
  });

  it('renders TutorModeSelector and allows switching pedagogical modes', async () => {
    const TutorModeSelector = (await import('../components/tutor/TutorModeSelector')).default;
    const user = userEvent.setup();
    const handleSelectMode = vi.fn();

    render(
      <TutorModeSelector
        currentMode="explain"
        onSelectMode={handleSelectMode}
        hintLevel={1}
        onSetHintLevel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /explain/i })).toBeInTheDocument();
    const hintBtn = screen.getByRole('button', { name: /hint/i });
    expect(hintBtn).toBeInTheDocument();

    await user.click(hintBtn);
    expect(handleSelectMode).toHaveBeenCalledWith('hint');
  });
});

describe('Phase 7: Coding Platform UI Components', () => {
  it('renders LanguageSelector and triggers selection event', async () => {
    const LanguageSelector = (await import('../components/coding/LanguageSelector')).default;
    const user = userEvent.setup();
    const handleSelectLanguage = vi.fn();

    render(
      <LanguageSelector
        language="python"
        onSelectLanguage={handleSelectLanguage}
      />
    );

    expect(screen.getByText(/Language:/i)).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('python');

    await user.selectOptions(select, 'cpp');
    expect(handleSelectLanguage).toHaveBeenCalledWith('cpp');
  });

  it('renders SubmissionStatusBadge across different evaluation verdicts', async () => {
    const SubmissionStatusBadge = (await import('../components/coding/SubmissionStatusBadge')).default;

    const { rerender } = render(
      <SubmissionStatusBadge verdict="accepted" passedCount={5} totalCount={5} />
    );
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('(5/5)')).toBeInTheDocument();

    rerender(
      <SubmissionStatusBadge verdict="wrong_answer" passedCount={3} totalCount={5} />
    );
    expect(screen.getByText('Wrong Answer')).toBeInTheDocument();
    expect(screen.getByText('(3/5)')).toBeInTheDocument();

    rerender(<SubmissionStatusBadge verdict="compilation_error" />);
    expect(screen.getByText('Compilation Error')).toBeInTheDocument();
  });

  it('renders ProblemDescription with difficulty, tags, and examples', async () => {
    const ProblemDescription = (await import('../components/coding/ProblemDescription')).default;

    const mockProblem = {
      title: 'Two Sum Integer Problem',
      difficulty: 'Easy',
      topicIds: [{ _id: '1', name: 'Arrays' }],
      description: 'Given an array of integers, return indices.',
      examples: [
        { input: '[2,7,11,15], 9', output: '[0,1]', explanation: '2 + 7 = 9' },
      ],
      constraints: ['2 <= nums.length <= 10^4'],
      timeLimitMs: 2000,
    };

    render(<ProblemDescription problem={mockProblem} />);

    expect(screen.getByText('Two Sum Integer Problem')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Arrays')).toBeInTheDocument();
    expect(screen.getByText('Given an array of integers, return indices.')).toBeInTheDocument();
    expect(screen.getByText('[2,7,11,15], 9')).toBeInTheDocument();
    expect(screen.getByText(/Time Limit: 2000ms/i)).toBeInTheDocument();
  });
});

describe('Phase 8: AI Mock Interview UI Components', () => {
  it('renders InterviewQuestionCard with question details and competencies', async () => {
    const InterviewQuestionCard = (await import('../components/interview/InterviewQuestionCard')).default;

    const mockQuestion = {
      questionText: 'Explain the difference between SQL and NoSQL databases.',
      questionType: 'technical',
      expectedCompetencies: ['Schema Design', 'ACID Transactions'],
    };

    render(
      <InterviewQuestionCard
        question={mockQuestion}
        currentOrder={1}
        totalQuestions={5}
        isFollowUp={false}
      />
    );

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Explain the difference between SQL and NoSQL databases.')).toBeInTheDocument();
    expect(screen.getByText('Schema Design')).toBeInTheDocument();
    expect(screen.getByText('ACID Transactions')).toBeInTheDocument();
  });

  it('renders InterviewQuestionCard with follow-up badge when adaptive follow-up is active', async () => {
    const InterviewQuestionCard = (await import('../components/interview/InterviewQuestionCard')).default;

    const mockFollowUp = {
      questionText: 'What are the write penalties associated with indexes?',
      questionType: 'technical',
      expectedCompetencies: ['Write amplification'],
    };

    render(
      <InterviewQuestionCard
        question={mockFollowUp}
        currentOrder={2}
        totalQuestions={5}
        isFollowUp={true}
      />
    );

    expect(screen.getByText('Adaptive Follow-Up')).toBeInTheDocument();
    expect(screen.getByText('What are the write penalties associated with indexes?')).toBeInTheDocument();
  });

  it('renders VoiceAnswerRecorder and informs when voice is unsupported/fallback', async () => {
    const VoiceAnswerRecorder = (await import('../components/interview/VoiceAnswerRecorder')).default;

    render(<VoiceAnswerRecorder onTranscriptUpdate={vi.fn()} />);

    // In JSDOM headless test environment, window.SpeechRecognition is undefined
    expect(
      screen.getByText(/Voice recognition unavailable in this browser/i)
    ).toBeInTheDocument();
  });
});

describe('Phase 9: Platform Completeness & Unified Progress Analytics', () => {
  it('verifies all student navigation items are ready with zero Coming Soon placeholders', async () => {
    const { NAV_ITEMS, COMING_SOON_ITEMS, ADMIN_NAV_ITEMS } = await import('../lib/navigation');

    expect(COMING_SOON_ITEMS).toHaveLength(0);
    expect(NAV_ITEMS.every((item) => item.ready === true)).toBe(true);
    expect(ADMIN_NAV_ITEMS.some((item) => item.to === '/admin/coding')).toBe(true);
  });

  it('renders ProgressAnalytics unified readiness dashboard after loading', async () => {
    const ProgressAnalytics = (await import('../pages/ProgressAnalytics')).default;

    render(
      <MemoryRouter>
        <ProgressAnalytics />
      </MemoryRouter>
    );

    const heading = await screen.findByText(/Placement Readiness & Progress Analytics/i);
    expect(heading).toBeInTheDocument();
    expect(screen.getAllByText(/Readiness Index/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('readiness-index-value')).toBeInTheDocument();
    expect(screen.getByText(/Bayesian Mastery Curves/i)).toBeInTheDocument();
  });

  it('computes Placement Readiness Index accurately with missing data, zero-division safety, and deduplication', async () => {
    const { calculatePlacementReadiness, READINESS_WEIGHTS } = await import('../lib/readinessIndex');

    // 1. Verify weights sum to 1.0 (100%)
    const totalWeight = Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);

    // 2. Verify empty / null inputs do not divide by zero or return NaN
    const emptyResult = calculatePlacementReadiness({
      masteryOverview: null,
      skillProfileData: { skills: [] },
      codingAnalytics: null,
      interviewAnalytics: null,
      activeRoadmap: null,
      codingBenchmark: 0, // Edge case: 0 benchmark should fallback safely without NaN
    });
    expect(emptyResult.overallReadinessIndex).toBe(0);
    expect(emptyResult.activeReadinessAverage).toBe(0);
    expect(emptyResult.activePillarsCount).toBe(0);

    // 3. Verify deduplication of repeated topicId in skillProfile and weighted calculation
    const populatedResult = calculatePlacementReadiness({
      masteryOverview: {
        summary: { averageMastery: 0.8, assessedTopicsCount: 5, proficientTopicsCount: 4 },
      },
      skillProfileData: {
        skills: [
          { topicId: 't1', accuracy: 50 },
          { topicId: 't1', accuracy: 90 }, // Latest for t1 should overwrite duplicate t1
          { topicId: 't2', accuracy: 70 },
        ],
      },
      codingAnalytics: { totalSolved: 5, totalAttempted: 25 }, // 5 / 10 benchmark = 50%
      interviewAnalytics: { averageScore: 85, totalInterviews: 2 },
      activeRoadmap: { id: 'rm1', progressPercentage: 60, preparationGoal: 'SDE' },
      codingBenchmark: 10,
    });

    // BKT: 80 * 0.35 = 28
    // Assessments: ((90 + 70) / 2 = 80) * 0.25 = 20
    // Interviews: 85 * 0.20 = 17
    // Coding: 50 * 0.10 = 5
    // Roadmap: 60 * 0.10 = 6
    // Total = 28 + 20 + 17 + 5 + 6 = 76
    expect(populatedResult.pillars.assessments.topicsAssessed).toBe(2);
    expect(populatedResult.pillars.assessments.score).toBe(80);
    expect(populatedResult.overallReadinessIndex).toBe(76);
    expect(populatedResult.activePillarsCount).toBe(5);

    // 4. Verify Data Completeness indicator and Insufficient Evidence threshold (< 2 pillars)
    expect(emptyResult.dataCompleteness.percentage).toBe(0);
    expect(emptyResult.dataCompleteness.status).toBe('Insufficient Evidence');
    expect(emptyResult.dataCompleteness.isSufficient).toBe(false);

    // Partial Evidence (e.g. only 2 pillars active)
    const partialResult = calculatePlacementReadiness({
      masteryOverview: { summary: { averageMastery: 0.7, assessedTopicsCount: 2 } },
      skillProfileData: { skills: [{ topicId: 't1', accuracy: 80 }] },
      codingAnalytics: null,
      interviewAnalytics: null,
      activeRoadmap: null,
    });
    expect(partialResult.dataCompleteness.percentage).toBe(40);
    expect(partialResult.dataCompleteness.status).toBe('Partial Evidence');
    expect(partialResult.dataCompleteness.isSufficient).toBe(true);

    // Robust Evidence (all 5 pillars active)
    expect(populatedResult.dataCompleteness.percentage).toBe(100);
    expect(populatedResult.dataCompleteness.status).toBe('Robust Evidence');
    expect(populatedResult.dataCompleteness.isSufficient).toBe(true);
    expect(populatedResult.dataCompleteness.checklist).toHaveLength(5);
    expect(populatedResult.dataCompleteness.checklist.every((c) => c.hasEvidence)).toBe(true);
  });
});






