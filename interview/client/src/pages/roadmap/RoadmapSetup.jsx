import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react';
import { generateRoadmap } from '../../services/roadmapService';
import { RoadmapFeasibilityAlert } from '../../components/roadmap/RoadmapFeasibilityAlert';

const GOAL_OPTIONS = [
  { id: 'General Campus Placements', title: 'General Campus Placements', desc: 'Balanced DSA, Core CS, and Aptitude coverage for standard university placement drives.' },
  { id: 'Software Development Engineer', title: 'Software Development Engineer (SDE)', desc: 'High-intensity DSA and problem solving with fundamental computer science principles.' },
  { id: 'Backend Developer', title: 'Backend Developer', desc: 'Heavy emphasis on DBMS, OS, Networks, OOP, and backend architectural concepts.' },
  { id: 'Frontend Developer', title: 'Frontend Developer', desc: 'Focus on web algorithms, UI engineering concepts, and foundational DSA.' },
  { id: 'Full-Stack Developer', title: 'Full-Stack Developer', desc: 'Comprehensive full-lifecycle preparation covering algorithmic problems and system concepts.' },
  { id: 'Data Analyst', title: 'Data Analyst', desc: 'Specialized in SQL/DBMS, Quantitative Aptitude, Logical Reasoning, and Data Interpretation.' },
];

const PREFERENCE_OPTIONS = [
  { id: 'balanced', label: 'Balanced Curriculum', desc: 'Proportional coverage across all relevant subjects.' },
  { id: 'dsa', label: 'DSA-Focused', desc: 'Prioritizes algorithmic and data structure mastery.' },
  { id: 'core_cs', label: 'Core CS-Focused', desc: 'Deep dive into Operating Systems, DBMS, and Networks.' },
  { id: 'aptitude', label: 'Aptitude & Reasoning', desc: 'Focus on quantitative and analytical placement screening tests.' },
];

export default function RoadmapSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [preparationGoal, setPreparationGoal] = useState('General Campus Placements');
  const [targetPreset, setTargetPreset] = useState('60');
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  });
  const [studyPreference, setStudyPreference] = useState('balanced');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    monday: 60,
    tuesday: 60,
    wednesday: 60,
    thursday: 60,
    friday: 60,
    saturday: 120,
    sunday: 120,
  });

  const [scopeOverride, setScopeOverride] = useState('full');

  const handlePresetSelect = (days) => {
    setTargetPreset(days);
    const d = new Date();
    d.setDate(d.getDate() + parseInt(days, 10));
    setCustomDate(d.toISOString().split('T')[0]);
  };

  const handleWeekdayChange = (day, val) => {
    const num = Math.max(0, Math.min(480, parseInt(val, 10) || 0));
    setWeeklyAvailability((prev) => ({ ...prev, [day]: num }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const payload = {
        preparationGoal,
        targetDate: new Date(customDate).toISOString(),
        studyPreference,
        dailyStudyMinutes: dailyMinutes,
        weeklyAvailability,
        scopeOverride,
      };

      const result = await generateRoadmap(payload);
      toast.success('Your personalized learning roadmap has been generated!');
      navigate('/roadmap');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to generate learning roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            <Compass className="w-4 h-4" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Roadmap Setup Wizard</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Answer a few questions to build your intelligent, prerequisite-aware placement schedule.
        </p>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {[
          { num: 1, label: 'Goal' },
          { num: 2, label: 'Timeline' },
          { num: 3, label: 'Schedule' },
          { num: 4, label: 'Review' },
        ].map((s) => (
          <div
            key={s.num}
            className={`border-t-2 pt-2 text-xs font-bold transition-all ${
              step >= s.num ? 'border-primary text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            Step {s.num}: {s.label}
          </div>
        ))}
      </div>

      {/* STEP 1: Preparation Goal */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Select Your Placement Preparation Target</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GOAL_OPTIONS.map((goal) => {
              const isSelected = preparationGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setPreparationGoal(goal.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border hover:border-primary/40 bg-card'
                  }`}
                >
                  <h4 className="font-bold text-sm text-foreground mb-1 flex items-center justify-between">
                    {goal.title}
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{goal.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
            >
              Continue to Timeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Timeline Target Date */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold">When is your placement target deadline?</h3>
          <p className="text-xs text-muted-foreground">
            PrepMind AI will distribute curriculum topics, practice sessions, and spaced reviews across your timeline.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {['30', '60', '90'].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handlePresetSelect(days)}
                className={`py-3 px-4 rounded-xl border font-bold text-sm text-center transition-all ${
                  targetPreset === days
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                {days} Days Plan
              </button>
            ))}
          </div>

          <div className="bg-card p-4 rounded-xl border space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">
              Or Select Specific Target Date:
            </label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setTargetPreset('custom');
              }}
              min={new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-secondary transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
            >
              Continue to Availability <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Weekly Availability & Preferences */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold">Weekly Study Availability (Minutes per Day)</h3>
            <p className="text-xs text-muted-foreground">
              Customize how many minutes you can dedicate on each day of the week.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-4 rounded-xl border">
            {Object.entries(weeklyAvailability).map(([day, val]) => (
              <div key={day}>
                <label className="text-xs font-semibold capitalize text-muted-foreground block mb-1">
                  {day}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="480"
                    step="15"
                    value={val}
                    onChange={(e) => handleWeekdayChange(day, e.target.value)}
                    className="w-full bg-background border rounded-lg px-2.5 py-1.5 text-sm font-bold text-center"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-bold mb-2">Curriculum Study Focus</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PREFERENCE_OPTIONS.map((pref) => {
                const isSelected = studyPreference === pref.id;
                return (
                  <button
                    key={pref.id}
                    type="button"
                    onClick={() => setStudyPreference(pref.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-border hover:border-primary/40 bg-card'
                    }`}
                  >
                    <span className="font-bold text-xs block mb-0.5">{pref.label}</span>
                    <span className="text-[11px] text-muted-foreground block">{pref.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-secondary transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
            >
              Review & Generate <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review and Generate */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="bg-card text-card-foreground rounded-2xl border p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-base border-b pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Roadmap Summary
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Preparation Goal:</span>
                <span className="font-bold text-sm text-foreground">{preparationGoal}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Target Date:</span>
                <span className="font-bold text-sm text-foreground">
                  {new Date(customDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Curriculum Focus:</span>
                <span className="font-bold text-sm text-foreground capitalize">{studyPreference}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Weekly Study Time:</span>
                <span className="font-bold text-sm text-foreground">
                  {Math.round(Object.values(weeklyAvailability).reduce((a, b) => a + b, 0) / 60)} hrs / week
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-secondary transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Building Roadmap...' : 'Generate My Roadmap'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

