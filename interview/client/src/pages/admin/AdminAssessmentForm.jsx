import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/common/FormField';
import { FormAlert } from '@/components/common/States';
import { adminService, contentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AdminAssessmentForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'full_diagnostic',
    categoryIds: [],
    topicIds: [],
    durationMinutes: 20,
    totalQuestions: 5,
    difficultyDistribution: { Easy: 2, Medium: 2, Hard: 1 },
    scoring: { correct: 4, incorrect: -1, unanswered: 0 },
    maxAttempts: '',
    cooldownHours: 0,
    shuffleQuestions: true,
    shuffleOptions: false,
    reviewReleasePolicy: 'immediate',
    status: 'Published',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([contentService.getCategories(), contentService.getTopics()])
      .then(([cats, tops]) => {
        setCategories(cats || []);
        setTopics(tops || []);
      })
      .catch(console.error);

    if (isEditing) {
      adminService
        .getAssessmentById(id)
        .then((tpl) => {
          setForm({
            title: tpl.title || '',
            description: tpl.description || '',
            type: tpl.type || 'full_diagnostic',
            categoryIds: (tpl.categoryIds || []).map((c) => c.id || c._id || c),
            topicIds: (tpl.topicIds || []).map((t) => t.id || t._id || t),
            durationMinutes: tpl.durationMinutes || 20,
            totalQuestions: tpl.totalQuestions || 5,
            difficultyDistribution: tpl.difficultyDistribution || { Easy: 2, Medium: 2, Hard: 1 },
            scoring: tpl.scoring || { correct: 4, incorrect: -1, unanswered: 0 },
            maxAttempts: tpl.maxAttempts ?? '',
            cooldownHours: tpl.cooldownHours ?? 0,
            shuffleQuestions: tpl.shuffleQuestions ?? true,
            shuffleOptions: tpl.shuffleOptions ?? false,
            reviewReleasePolicy: tpl.reviewReleasePolicy || 'immediate',
            status: tpl.status || 'Draft',
          });
        })
        .catch((err) => setError(parseApiError(err).message));
    }
  }, [id, isEditing]);

  const distSum =
    Number(form.difficultyDistribution.Easy || 0) +
    Number(form.difficultyDistribution.Medium || 0) +
    Number(form.difficultyDistribution.Hard || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (distSum !== Number(form.totalQuestions)) {
      setError(
        `Difficulty distribution sum (${distSum}) must equal Total Questions (${form.totalQuestions}).`,
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        totalQuestions: Number(form.totalQuestions),
        difficultyDistribution: {
          Easy: Number(form.difficultyDistribution.Easy || 0),
          Medium: Number(form.difficultyDistribution.Medium || 0),
          Hard: Number(form.difficultyDistribution.Hard || 0),
        },
        scoring: {
          correct: Number(form.scoring.correct),
          incorrect: Number(form.scoring.incorrect),
          unanswered: Number(form.scoring.unanswered),
        },
        maxAttempts: form.maxAttempts === '' ? null : Number(form.maxAttempts),
        cooldownHours: Number(form.cooldownHours || 0),
      };

      if (isEditing) {
        await adminService.updateAssessment(id, payload);
        toast.success('Assessment template updated');
      } else {
        await adminService.createAssessment(payload);
        toast.success('Assessment template created');
      }
      navigate('/admin/assessments');
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayId = (field, targetId) => {
    setForm((prev) => {
      const list = prev[field] || [];
      const next = list.includes(targetId)
        ? list.filter((x) => x !== targetId)
        : [...list, targetId];
      return { ...prev, [field]: next };
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/assessments">
          <ArrowLeft className="mr-1.5 size-4" /> Back to Assessment Templates
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Assessment Template' : 'Create Assessment Template'}</CardTitle>
          <CardDescription>
            Configure timing, difficulty breakdown, and scoring rules. Question availability in MongoDB is verified before saving.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormAlert message={error} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Assessment Title" htmlFor="tpl-title">
                <Input
                  id="tpl-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Full Placement Diagnostic"
                  required
                />
              </FormField>

              <FormField label="Assessment Type" htmlFor="tpl-type">
                <Select
                  id="tpl-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="full_diagnostic">Full Placement Diagnostic</option>
                  <option value="dsa">DSA Assessment</option>
                  <option value="core_cs">Core CS Assessment</option>
                  <option value="aptitude">Aptitude Assessment</option>
                  <option value="subject">Subject Assessment</option>
                  <option value="topic">Topic Assessment</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Description" htmlFor="tpl-desc">
              <textarea
                id="tpl-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs"
                placeholder="Describe what topics and concepts this assessment evaluates..."
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Duration (Minutes)" htmlFor="tpl-duration">
                <Input
                  id="tpl-duration"
                  type="number"
                  min={1}
                  max={360}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Total Questions" htmlFor="tpl-total">
                <Input
                  id="tpl-total"
                  type="number"
                  min={1}
                  max={200}
                  value={form.totalQuestions}
                  onChange={(e) => setForm({ ...form, totalQuestions: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Publication Status" htmlFor="tpl-status">
                <Select
                  id="tpl-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </Select>
              </FormField>
            </div>

            {/* Difficulty Distribution */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Difficulty Distribution</h3>
                <span
                  className={`text-xs font-medium ${
                    distSum === Number(form.totalQuestions) ? 'text-success' : 'text-destructive'
                  }`}
                >
                  Sum: {distSum} / {form.totalQuestions}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Easy Count" htmlFor="dist-easy">
                  <Input
                    id="dist-easy"
                    type="number"
                    min={0}
                    value={form.difficultyDistribution.Easy}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        difficultyDistribution: {
                          ...form.difficultyDistribution,
                          Easy: e.target.value,
                        },
                      })
                    }
                  />
                </FormField>

                <FormField label="Medium Count" htmlFor="dist-med">
                  <Input
                    id="dist-med"
                    type="number"
                    min={0}
                    value={form.difficultyDistribution.Medium}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        difficultyDistribution: {
                          ...form.difficultyDistribution,
                          Medium: e.target.value,
                        },
                      })
                    }
                  />
                </FormField>

                <FormField label="Hard Count" htmlFor="dist-hard">
                  <Input
                    id="dist-hard"
                    type="number"
                    min={0}
                    value={form.difficultyDistribution.Hard}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        difficultyDistribution: {
                          ...form.difficultyDistribution,
                          Hard: e.target.value,
                        },
                      })
                    }
                  />
                </FormField>
              </div>
            </div>

            {/* Scoring Rules */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Scoring Configuration</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Marks for Correct (+)" htmlFor="score-correct">
                  <Input
                    id="score-correct"
                    type="number"
                    step="0.5"
                    value={form.scoring.correct}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scoring: { ...form.scoring, correct: e.target.value },
                      })
                    }
                  />
                </FormField>

                <FormField label="Marks for Incorrect (≤0)" htmlFor="score-incorrect">
                  <Input
                    id="score-incorrect"
                    type="number"
                    step="0.25"
                    max={0}
                    value={form.scoring.incorrect}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scoring: { ...form.scoring, incorrect: e.target.value },
                      })
                    }
                  />
                </FormField>

                <FormField label="Marks for Unanswered" htmlFor="score-unanswered">
                  <Input
                    id="score-unanswered"
                    type="number"
                    step="0.25"
                    value={form.scoring.unanswered}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scoring: { ...form.scoring, unanswered: e.target.value },
                      })
                    }
                  />
                </FormField>
              </div>
            </div>

            {/* Attempt Limits, Cooldown & Release Policy */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Max Attempts (Blank = Unlimited)" htmlFor="tpl-attempts">
                <Input
                  id="tpl-attempts"
                  type="number"
                  min={1}
                  value={form.maxAttempts}
                  onChange={(e) => setForm({ ...form, maxAttempts: e.target.value })}
                  placeholder="Unlimited"
                />
              </FormField>

              <FormField label="Cooldown Hours" htmlFor="tpl-cooldown">
                <Input
                  id="tpl-cooldown"
                  type="number"
                  min={0}
                  value={form.cooldownHours}
                  onChange={(e) => setForm({ ...form, cooldownHours: e.target.value })}
                />
              </FormField>

              <FormField label="Answer Review Policy" htmlFor="tpl-policy">
                <Select
                  id="tpl-policy"
                  value={form.reviewReleasePolicy}
                  onChange={(e) => setForm({ ...form, reviewReleasePolicy: e.target.value })}
                >
                  <option value="immediate">Immediate after submission</option>
                  <option value="after_expiry">After timer window expires</option>
                  <option value="never">Never release answer keys</option>
                </Select>
              </FormField>
            </div>

            {/* Category & Topic Scope */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Category & Topic Scope (Optional Filters)</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const cid = cat.id || cat._id;
                  const active = form.categoryIds.includes(cid);
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => toggleArrayId('categoryIds', cid)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {topics.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Restrict to specific topics (leave unselected to cover all active topics in scope):
                  </p>
                  <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto p-1">
                    {topics.map((top) => {
                      const tid = top.id || top._id;
                      const active = form.topicIds.includes(tid);
                      return (
                        <button
                          key={tid}
                          type="button"
                          onClick={() => toggleArrayId('topicIds', tid)}
                          className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                            active
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {top.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" asChild>
                <Link to="/admin/assessments">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-1.5 size-4" />
                {saving
                  ? 'Validating & Saving...'
                  : isEditing
                    ? 'Save Assessment Changes'
                    : 'Create Assessment Template'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

