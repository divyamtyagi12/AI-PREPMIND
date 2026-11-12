import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/common/FormField';
import { FormAlert, ErrorState } from '@/components/common/States';
import { adminService, contentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AdminQuestionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  // Selected filters for cascading dropdowns
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Form State
  const [values, setValues] = useState({
    topicId: '',
    title: '',
    description: '',
    type: 'single_choice',
    difficulty: 'Medium',
    status: 'Published',
    options: [
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
      { id: 'opt_3', text: '' },
      { id: 'opt_4', text: '' },
    ],
    correctAnswer: 'opt_1',
    explanation: '',
    hints: [''],
    tags: '',
    evaluationCriteria: [''],
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // 1. Initial Load: Categories
  useEffect(() => {
    contentService.getCategories().then(setCategories).catch(console.error);
  }, []);

  // 2. Load subjects when selected category changes
  useEffect(() => {
    if (selectedCategory) {
      contentService.getSubjects({ categoryId: selectedCategory }).then(setSubjects).catch(console.error);
    } else {
      setSubjects([]);
    }
  }, [selectedCategory]);

  // 3. Load topics when selected subject changes
  useEffect(() => {
    if (selectedSubject) {
      contentService.getTopics({ subjectId: selectedSubject }).then(setTopics).catch(console.error);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  // 4. Load question if editing
  useEffect(() => {
    if (isEditing) {
      adminService
        .getQuestions({ search: id })
        .then((res) => {
          const q = res.questions.find((x) => (x._id || x.id) === id);
          if (q) {
            setValues({
              topicId: q.topicId?._id || q.topicId?.id || q.topicId,
              title: q.title,
              description: q.description,
              type: q.type,
              difficulty: q.difficulty,
              status: q.status,
              options: q.options?.length ? q.options : [],
              correctAnswer: q.correctAnswer || (q.type === 'multiple_select' ? [] : ''),
              explanation: q.explanation || '',
              hints: q.hints?.length ? q.hints : [''],
              tags: q.tags?.join(', ') || '',
              evaluationCriteria: q.evaluationCriteria?.length ? q.evaluationCriteria : [''],
            });
            if (q.topicId?.categoryId) setSelectedCategory(q.topicId.categoryId);
            if (q.topicId?.subjectId) setSelectedSubject(q.topicId.subjectId);
          }
        })
        .catch(console.error);
    }
  }, [id, isEditing]);

  const handleOptionChange = (idx, text) => {
    setValues((prev) => {
      const newOpts = [...prev.options];
      newOpts[idx].text = text;
      return { ...prev, options: newOpts };
    });
  };

  const addOption = () => {
    const nextId = `opt_${values.options.length + 1}`;
    setValues((prev) => ({
      ...prev,
      options: [...prev.options, { id: nextId, text: '' }],
    }));
  };

  const removeOption = (idx) => {
    if (values.options.length <= 2) {
      toast.error('MCQs must have at least 2 options');
      return;
    }
    setValues((prev) => {
      const removedId = prev.options[idx].id;
      const newOpts = prev.options.filter((_, i) => i !== idx);

      let newCorrect = prev.correctAnswer;
      if (prev.type === 'single_choice' && newCorrect === removedId) {
        newCorrect = newOpts[0]?.id || '';
      } else if (prev.type === 'multiple_select' && Array.isArray(newCorrect)) {
        newCorrect = newCorrect.filter((x) => x !== removedId);
      }

      return { ...prev, options: newOpts, correctAnswer: newCorrect };
    });
  };

  const handleCorrectAnswerToggle = (optId) => {
    if (values.type === 'single_choice') {
      setValues((prev) => ({ ...prev, correctAnswer: optId }));
    } else if (values.type === 'multiple_select') {
      setValues((prev) => {
        const cur = Array.isArray(prev.correctAnswer) ? prev.correctAnswer : [];
        const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
        return { ...prev, correctAnswer: next };
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    // Client side check
    if (!values.topicId) {
      setFormError('Please select a topic.');
      return;
    }

    const payload = {
      ...values,
      tags: values.tags
        ? values.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      hints: values.hints.filter((h) => h.trim().length > 0),
      evaluationCriteria: values.evaluationCriteria.filter((c) => c.trim().length > 0),
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await adminService.updateQuestion(id, payload);
        toast.success('Question updated successfully');
      } else {
        await adminService.createQuestion(payload);
        toast.success('Question created successfully');
      }
      navigate('/admin/questions');
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/admin/questions">
          <ArrowLeft className="mr-1 size-3.5" /> Back to Question Bank
        </Link>
      </Button>

      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditing ? 'Edit Question' : 'Create New Question'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define placement questions, difficulty, answer options, hints, and feedback.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormAlert message={formError} />

        {/* 1. Taxonomy Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Placement Taxonomy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField label="Category">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Subject">
              <Select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedCategory}
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Topic *" error={fieldErrors.topicId}>
              <Select
                value={values.topicId}
                onChange={(e) => setValues((p) => ({ ...p, topicId: e.target.value }))}
                disabled={!selectedSubject}
              >
                <option value="">Select Topic</option>
                {topics.map((t) => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {/* 2. Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Question Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Question Title *" error={fieldErrors.title}>
              <Input
                placeholder="e.g. Find First Missing Positive Integer"
                value={values.title}
                onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Type *" error={fieldErrors.type}>
                <Select
                  value={values.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setValues((p) => ({
                      ...p,
                      type: newType,
                      correctAnswer: newType === 'multiple_select' ? ['opt_1'] : 'opt_1',
                    }));
                  }}
                >
                  <option value="single_choice">Single Choice MCQ</option>
                  <option value="multiple_select">Multiple Select MCQ</option>
                  <option value="short_conceptual">Short Conceptual</option>
                </Select>
              </FormField>

              <FormField label="Difficulty *" error={fieldErrors.difficulty}>
                <Select
                  value={values.difficulty}
                  onChange={(e) => setValues((p) => ({ ...p, difficulty: e.target.value }))}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>
              </FormField>

              <FormField label="Publish Status *" error={fieldErrors.status}>
                <Select
                  value={values.status}
                  onChange={(e) => setValues((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Problem Description / Question Prompt *" error={fieldErrors.description}>
              <textarea
                rows={5}
                className="w-full rounded-md border border-input bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={values.description}
                onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
                placeholder="Provide complete question scenario, constraints, examples..."
              />
            </FormField>

            <FormField label="Tags (comma separated)">
              <Input
                placeholder="arrays, two-pointers, leetcode, amazon"
                value={values.tags}
                onChange={(e) => setValues((p) => ({ ...p, tags: e.target.value }))}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* 3. Dynamic Answer & Options */}
        {(values.type === 'single_choice' || values.type === 'multiple_select') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                Options &amp; Correct Answer Key ({values.type === 'single_choice' ? 'Radio' : 'Checkbox'})
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="mr-1 size-3.5" /> Add Option
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {values.options.map((opt, idx) => {
                const isCorrect =
                  values.type === 'single_choice'
                    ? values.correctAnswer === opt.id
                    : Array.isArray(values.correctAnswer) && values.correctAnswer.includes(opt.id);

                return (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCorrectAnswerToggle(opt.id)}
                      className={`flex h-10 w-28 shrink-0 items-center justify-center gap-1 rounded-md border text-xs font-medium transition-colors ${
                        isCorrect
                          ? 'border-success bg-success/10 text-success font-semibold'
                          : 'border-input bg-card hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCorrect && <CheckCircle2 className="size-3.5" />}
                      {isCorrect ? 'Correct' : 'Mark Correct'}
                    </button>

                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                      disabled={values.options.length <= 2}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {values.type === 'short_conceptual' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reference Answer &amp; Evaluation Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Model Reference Answer *" error={fieldErrors.correctAnswer}>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={values.correctAnswer}
                  onChange={(e) => setValues((p) => ({ ...p, correctAnswer: e.target.value }))}
                  placeholder="Expected points, optimal algorithm description, or theoretical explanation..."
                />
              </FormField>

              <div className="space-y-2">
                <label className="text-sm font-medium">Self-Evaluation Checklist Points</label>
                {values.evaluationCriteria.map((crit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Evaluation Criterion #${idx + 1}`}
                      value={crit}
                      onChange={(e) => {
                        const newCrit = [...values.evaluationCriteria];
                        newCrit[idx] = e.target.value;
                        setValues((p) => ({ ...p, evaluationCriteria: newCrit }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setValues((p) => ({
                          ...p,
                          evaluationCriteria: p.evaluationCriteria.filter((_, i) => i !== idx),
                        }))
                      }
                      disabled={values.evaluationCriteria.length <= 1}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setValues((p) => ({
                      ...p,
                      evaluationCriteria: [...p.evaluationCriteria, ''],
                    }))
                  }
                >
                  <Plus className="mr-1 size-3.5" /> Add Criterion
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. Explanation & Hints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Explanation &amp; Student Hints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Detailed Explanation (Shown after submission) *" error={fieldErrors.explanation}>
              <textarea
                rows={4}
                className="w-full rounded-md border border-input bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={values.explanation}
                onChange={(e) => setValues((p) => ({ ...p, explanation: e.target.value }))}
                placeholder="Walk through the mathematical reasoning, step-by-step logic, or complexity derivation..."
              />
            </FormField>

            <div className="space-y-2">
              <label className="text-sm font-medium">Practice Hints</label>
              {values.hints.map((hint, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Hint #${idx + 1}`}
                    value={hint}
                    onChange={(e) => {
                      const newHints = [...values.hints];
                      newHints[idx] = e.target.value;
                      setValues((p) => ({ ...p, hints: newHints }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setValues((p) => ({ ...p, hints: p.hints.filter((_, i) => i !== idx) }))
                    }
                    disabled={values.hints.length <= 1}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValues((p) => ({ ...p, hints: [...p.hints, ''] }))}
              >
                <Plus className="mr-1 size-3.5" /> Add Hint
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link to="/admin/questions">Cancel</Link>
          </Button>
          <Button type="submit" loading={submitting}>
            {isEditing ? 'Save Changes' : 'Create Question'}
          </Button>
        </div>
      </form>
    </div>
  );
}

