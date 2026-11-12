import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bot, Sparkles, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/common/FormField';
import { FormAlert } from '@/components/common/States';
import { adminService, contentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AiQuestionGenerator() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionType, setQuestionType] = useState('single_choice');
  const [count, setCount] = useState(5);
  const [referencePlatform, setReferencePlatform] = useState('geeksforgeeks');

  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState('');
  const [recentJob, setRecentJob] = useState(null);

  // Load initial taxonomy
  useEffect(() => {
    contentService.getCategories().then((cats) => {
      // Prioritize Core CS or Aptitude
      const filtered = cats.filter((c) => c.slug !== 'dsa');
      setCategories(filtered.length ? filtered : cats);
      if (filtered.length) setSelectedCategory(filtered[0].id || filtered[0]._id);
    });
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      contentService.getSubjects({ categoryId: selectedCategory }).then((subs) => {
        setSubjects(subs);
        if (subs.length) setSelectedSubject(subs[0].id || subs[0]._id);
        else setSelectedSubject('');
      });
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedSubject) {
      contentService.getTopics({ subjectId: selectedSubject }).then((tops) => {
        setTopics(tops);
        if (tops.length) setSelectedTopic(tops[0].id || tops[0]._id);
        else setSelectedTopic('');
      });
    }
  }, [selectedSubject]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!selectedCategory || !selectedSubject || !selectedTopic) {
      setFormError('Please select Category, Subject, and Topic.');
      return;
    }

    setGenerating(true);
    try {
      const res = await adminService.generateQuestions({
        categoryId: selectedCategory,
        subjectId: selectedSubject,
        topicId: selectedTopic,
        difficulty,
        questionType,
        count: Number(count),
        referencePlatform,
      });

      setRecentJob(res);
      toast.success(`Successfully generated ${res.generatedCount} questions into the Review Queue.`);
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.message);
      toast.error(parsed.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bot className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Question Generator</h1>
            <p className="text-sm text-muted-foreground">
              Generate 100% original Core CS and Aptitude questions with Gemini AI inspired by GeeksforGeeks topic coverage.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generation Parameters</CardTitle>
          <CardDescription>
            All generated questions are validated with strict Zod schemas and placed into the <strong>Admin Review Queue</strong> as Drafts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <FormAlert message={formError} />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Category">
                <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
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
                  disabled={subjects.length === 0}
                >
                  {subjects.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Topic">
                <Select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  disabled={topics.length === 0}
                >
                  {topics.map((t) => (
                    <option key={t.id || t._id} value={t.id || t._id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Question Type">
                <Select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                  <option value="single_choice">Single Choice MCQ</option>
                  <option value="multiple_select">Multiple Select MCQ</option>
                  <option value="short_conceptual">Short Conceptual</option>
                </Select>
              </FormField>

              <FormField label="Difficulty">
                <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>
              </FormField>

              <FormField label="Number of Questions (1-10)">
                <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </Select>
              </FormField>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Cost &amp; Quality Control:</strong> Generated items pass structural validation and remain in <strong>Draft</strong> status until approved by an administrator in the Review Queue.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={generating} disabled={!selectedTopic} className="gap-2">
                <Sparkles className="size-4" /> Generate Questions
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {recentJob && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-6 text-success" />
              <div>
                <p className="font-semibold text-foreground">Generation Complete</p>
                <p className="text-xs text-muted-foreground">
                  {recentJob.generatedCount} questions ready for evaluation in the review queue.
                </p>
              </div>
            </div>

            <Button asChild size="sm">
              <Link to="/admin/review">
                Open Review Queue <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

