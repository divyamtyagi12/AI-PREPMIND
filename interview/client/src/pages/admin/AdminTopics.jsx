import { useEffect, useState } from 'react';
import { PlusCircle, Layers, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/common/FormField';
import { FormAlert, ErrorState } from '@/components/common/States';
import { adminService, contentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AdminTopics() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topics, setTopics] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quick Create Topic Form
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicSlug, setNewTopicSlug] = useState('');
  const [newTopicDifficulty, setNewTopicDifficulty] = useState('Medium');
  const [creating, setCreating] = useState(false);

  const loadTaxonomy = async () => {
    setLoading(true);
    setError('');
    try {
      const cats = await contentService.getCategories();
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0].id || cats[0]._id);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      contentService
        .getSubjects({ categoryId: selectedCategory })
        .then((subs) => {
          setSubjects(subs);
          if (subs.length > 0) setSelectedSubject(subs[0].id || subs[0]._id);
          else setSelectedSubject('');
        })
        .catch(console.error);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedSubject) {
      contentService.getTopics({ subjectId: selectedSubject }).then(setTopics).catch(console.error);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicSlug.trim() || !selectedSubject || !selectedCategory) {
      toast.error('Please enter topic name, slug, and select subject.');
      return;
    }

    setCreating(true);
    try {
      await adminService.createTopic({
        categoryId: selectedCategory,
        subjectId: selectedSubject,
        name: newTopicName.trim(),
        slug: newTopicSlug.trim().toLowerCase(),
        difficulty: newTopicDifficulty,
      });
      toast.success('Topic created successfully');
      setNewTopicName('');
      setNewTopicSlug('');
      const updated = await contentService.getTopics({ subjectId: selectedSubject });
      setTopics(updated);
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this topic?')) return;
    try {
      await adminService.deleteTopic(id);
      toast.success('Topic deactivated');
      setTopics((prev) => prev.filter((t) => (t.id || t._id) !== id));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight">Topic Taxonomy Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and organize category, subject, and topic hierarchies across DSA, Core CS, and Aptitude.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Selection Bar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Select Subject</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Category">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
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
          </CardContent>
        </Card>

        {/* Topic List & Quick Create */}
        <div className="space-y-6 md:col-span-2">
          {/* Quick Create Topic Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PlusCircle className="size-4 text-primary" /> Add Topic to Selected Subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTopic} className="grid gap-3 sm:grid-cols-4">
                <Input
                  placeholder="Topic Name (e.g. Heaps)"
                  value={newTopicName}
                  onChange={(e) => {
                    setNewTopicName(e.target.value);
                    if (!newTopicSlug) {
                      setNewTopicSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }
                  }}
                  className="sm:col-span-2"
                />
                <Input
                  placeholder="Slug (e.g. heaps)"
                  value={newTopicSlug}
                  onChange={(e) => setNewTopicSlug(e.target.value)}
                />
                <Button type="submit" loading={creating} disabled={!selectedSubject}>
                  Add Topic
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Topic List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Topics ({topics.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {topics.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No topics in this subject yet.
                </div>
              ) : (
                <div className="divide-y">
                  {topics.map((t) => (
                    <div key={t.id || t._id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{t.name}</p>
                          <Badge variant="outline">{t.difficulty}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">slug: {t.slug}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeactivate(t.id || t._id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

