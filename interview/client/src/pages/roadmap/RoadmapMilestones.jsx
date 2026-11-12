import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Award, CheckCircle2 } from 'lucide-react';
import { getActiveRoadmap, getRoadmapMilestones } from '../../services/roadmapService';
import { MilestoneCard } from '../../components/roadmap/MilestoneCard';

export default function RoadmapMilestones() {
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState([]);
  const [roadmap, setRoadmap] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const active = await getActiveRoadmap();
        if (active?.roadmap) {
          setRoadmap(active.roadmap);
          const ms = await getRoadmapMilestones(active.roadmap.id || active.roadmap._id);
          setMilestones(ms || []);
        }
      } catch (err) {
        toast.error('Failed to load roadmap milestones');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const completedCount = milestones.filter((m) => m.status === 'completed').length;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div>
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Roadmap Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Placement Preparation Milestones</h1>
            <p className="text-xs text-muted-foreground">
              Objective benchmark checkpoints across your curriculum timeline.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-card border">
            {completedCount} of {milestones.length} Milestones Achieved
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading milestones...
        </div>
      ) : milestones.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-2xl border p-12 text-center text-sm shadow-xs">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-bold">No Milestones Recorded</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Setup or regenerate your roadmap to establish preparation milestones.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <MilestoneCard key={milestone._id || milestone.id} milestone={milestone} />
          ))}
        </div>
      )}
    </div>
  );
}

