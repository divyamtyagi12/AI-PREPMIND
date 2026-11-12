import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowRight,
  GitBranch,
  Plus,
  RefreshCw,
  Save,
  Sliders,
  Trash2,
} from 'lucide-react';
import { contentService } from '../../services/contentService';
import {
  getAdminPrerequisites,
  addAdminPrerequisite,
  deleteAdminPrerequisite,
  getAdminRoadmapConfig,
  updateAdminRoadmapConfig,
} from '../../services/roadmapService';

export default function RoadmapConfigManager() {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);
  const [prerequisites, setPrerequisites] = useState([]);
  const [config, setConfig] = useState(null);

  // New Prerequisite Form
  const [topicId, setTopicId] = useState('');
  const [prerequisiteTopicId, setPrerequisiteTopicId] = useState('');
  const [dependencyType, setDependencyType] = useState('mandatory');
  const [addingPrereq, setAddingPrereq] = useState(false);

  // Config Form
  const [weights, setWeights] = useState({
    masteryGap: 0.35,
    placementWeight: 0.25,
    prerequisiteImportance: 0.15,
    revisionUrgency: 0.15,
    preferenceWeight: 0.10,
  });
  const [minDuration, setMinDuration] = useState(15);
  const [maxWorkload, setMaxWorkload] = useState(360);
  const [cooldown, setCooldown] = useState(12);
  const [savingConfig, setSavingConfig] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [allTopics, prereqs, conf] = await Promise.all([
        contentService.getTopics(),
        getAdminPrerequisites(),
        getAdminRoadmapConfig(),
      ]);

      setTopics(allTopics || []);
      setPrerequisites(prereqs || []);
      if (conf) {
        setConfig(conf);
        if (conf.priorityWeights) setWeights(conf.priorityWeights);
        if (conf.minSessionDuration) setMinDuration(conf.minSessionDuration);
        if (conf.maxDailyWorkload) setMaxWorkload(conf.maxDailyWorkload);
        if (conf.replanningCooldownHours !== undefined) setCooldown(conf.replanningCooldownHours);
      }
    } catch (err) {
      toast.error('Failed to load roadmap management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddPrerequisite = async (e) => {
    e.preventDefault();
    if (!topicId || !prerequisiteTopicId) {
      toast.error('Please select both dependent topic and prerequisite topic');
      return;
    }

    if (topicId === prerequisiteTopicId) {
      toast.error('A topic cannot be a prerequisite of itself');
      return;
    }

    setAddingPrereq(true);
    try {
      await addAdminPrerequisite({
        topicId,
        prerequisiteTopicId,
        dependencyType,
      });
      toast.success('Prerequisite dependency added successfully!');
      setTopicId('');
      setPrerequisiteTopicId('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to add prerequisite dependency');
    } finally {
      setAddingPrereq(false);
    }
  };

  const handleDeletePrerequisite = async (id) => {
    try {
      await deleteAdminPrerequisite(id);
      toast.success('Prerequisite dependency removed');
      loadAll();
    } catch (err) {
      toast.error('Failed to delete prerequisite');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await updateAdminRoadmapConfig({
        minSessionDuration: minDuration,
        maxDailyWorkload: maxWorkload,
        replanningCooldownHours: cooldown,
        priorityWeights: weights,
      });
      toast.success('Roadmap global configuration saved!');
      loadAll();
    } catch (err) {
      toast.error('Failed to update configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading roadmap configuration...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learning Roadmap Configuration</h1>
        <p className="text-xs text-muted-foreground">
          Manage topic prerequisite relationships, scheduling weights, and replanning heuristics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Prerequisite Graph Management */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card text-card-foreground p-5 rounded-2xl border shadow-xs">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" /> Add Prerequisite Relationship
            </h3>

            <form onSubmit={handleAddPrerequisite} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Prerequisite Topic (Must be done first)
                  </label>
                  <select
                    value={prerequisiteTopicId}
                    onChange={(e) => setPrerequisiteTopicId(e.target.value)}
                    className="w-full bg-background border rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    required
                  >
                    <option value="">Select Topic...</option>
                    {topics.map((t) => (
                      <option key={t.id || t._id} value={t.id || t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Dependent Topic (Unlocks after)
                  </label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full bg-background border rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    required
                  >
                    <option value="">Select Topic...</option>
                    {topics.map((t) => (
                      <option key={t.id || t._id} value={t.id || t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">Type:</label>
                  <select
                    value={dependencyType}
                    onChange={(e) => setDependencyType(e.target.value)}
                    className="bg-background border rounded-md px-2 py-1 text-xs"
                  >
                    <option value="mandatory">Mandatory</option>
                    <option value="recommended">Recommended</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingPrereq}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addingPrereq ? 'Adding...' : 'Add Dependency'}
                </button>
              </div>
            </form>
          </div>

          {/* List of Configured Prerequisites */}
          <div className="bg-card text-card-foreground p-5 rounded-2xl border shadow-xs">
            <h3 className="font-bold text-base mb-3 flex items-center justify-between">
              <span>Configured Topic Prerequisites ({prerequisites.length})</span>
            </h3>

            {prerequisites.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No prerequisite relationships configured yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {prerequisites.map((p) => {
                  const prereqName = p.prerequisiteTopicId?.name || 'Topic';
                  const topicName = p.topicId?.name || 'Topic';

                  return (
                    <div
                      key={p._id || p.id}
                      className="p-3 rounded-xl border bg-secondary/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-wrap font-semibold">
                        <span className="text-foreground">{prereqName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-foreground">{topicName}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-card border text-muted-foreground">
                          {p.dependencyType}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePrerequisite(p._id || p.id)}
                        className="text-muted-foreground hover:text-rose-600 p-1 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Global Scheduling Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-card text-card-foreground p-5 rounded-2xl border shadow-xs space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2 border-b pb-3">
              <Sliders className="w-4 h-4 text-primary" /> Topic Priority Weights
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Mastery Gap (Weakness) Weight:</span>
                  <span>{weights.masteryGap}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.masteryGap}
                  onChange={(e) => setWeights({ ...weights, masteryGap: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Placement Role Relevance:</span>
                  <span>{weights.placementWeight}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.placementWeight}
                  onChange={(e) => setWeights({ ...weights, placementWeight: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Prerequisite Centrality:</span>
                  <span>{weights.prerequisiteImportance}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.prerequisiteImportance}
                  onChange={(e) => setWeights({ ...weights, prerequisiteImportance: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Revision Decay Urgency:</span>
                  <span>{weights.revisionUrgency}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.revisionUrgency}
                  onChange={(e) => setWeights({ ...weights, revisionUrgency: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Student Curriculum Preference:</span>
                  <span>{weights.preferenceWeight}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.preferenceWeight}
                  onChange={(e) => setWeights({ ...weights, preferenceWeight: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="pt-3 border-t space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Replanning Cooldown (Hours)
                </label>
                <input
                  type="number"
                  min="0"
                  max="72"
                  value={cooldown}
                  onChange={(e) => setCooldown(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-background border rounded-lg px-2.5 py-1 text-xs font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

