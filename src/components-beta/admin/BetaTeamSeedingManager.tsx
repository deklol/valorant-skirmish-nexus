import { useState, useEffect } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  Trophy, GripVertical, Shuffle, TrendingUp, Check, Save, 
  AlertTriangle, Lock, RefreshCw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeamSeeding } from "@/hooks/useTeamSeeding";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SeedingRegistration {
  id: string;
  team_id: string;
  seed: number | null;
  team: {
    id: string;
    name: string;
    total_rank_points: number;
    avg_rank_points: number;
  };
}

interface SortableTeamItemProps {
  registration: SeedingRegistration;
  index: number;
  onSeedChange: (id: string, seed: number) => void;
}

const SortableTeamItem = ({ registration, index, onSeedChange }: SortableTeamItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: registration.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-[hsl(var(--beta-surface-3))] rounded-lg border ${
        isDragging ? 'border-[hsl(var(--beta-accent))]' : 'border-[hsl(var(--beta-border))]'
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Seed Input */}
      <input
        type="number"
        min={1}
        value={registration.seed || index + 1}
        onChange={(e) => onSeedChange(registration.id, parseInt(e.target.value) || index + 1)}
        className="w-14 bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] rounded-lg px-2 py-1 text-center text-[hsl(var(--beta-text-primary))] font-bold"
      />

      {/* Team Info */}
      <div className="flex-1">
        <p className="font-medium text-[hsl(var(--beta-text-primary))]">{registration.team.name}</p>
        <p className="text-xs text-[hsl(var(--beta-text-muted))]">
          Weight: {registration.team.total_rank_points || 0} (Avg: {Math.round(registration.team.avg_rank_points || 0)})
        </p>
      </div>

      {/* Rank Indicator */}
      <BetaBadge variant={index < 4 ? 'accent' : 'default'} size="sm">
        #{index + 1}
      </BetaBadge>
    </div>
  );
};

interface BetaTeamSeedingManagerProps {
  tournamentId: string;
  onSeedingComplete?: () => void;
}

export const BetaTeamSeedingManager = ({ tournamentId, onSeedingComplete }: BetaTeamSeedingManagerProps) => {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<SeedingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchRegistrations();
  }, [tournamentId]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_tournament_registrations')
        .select(`
          id,
          team_id,
          seed,
          persistent_teams!inner (
            id,
            name,
            total_rank_points,
            avg_rank_points
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'registered')
        .order('seed', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const mapped = (data || []).map(r => ({
        id: r.id,
        team_id: r.team_id,
        seed: r.seed,
        team: {
          id: r.persistent_teams.id,
          name: r.persistent_teams.name,
          total_rank_points: r.persistent_teams.total_rank_points || 0,
          avg_rank_points: r.persistent_teams.avg_rank_points || 0,
        },
      }));

      // Sort by seed if exists, otherwise by rank points
      mapped.sort((a, b) => {
        if (a.seed && b.seed) return a.seed - b.seed;
        if (a.seed) return -1;
        if (b.seed) return 1;
        return (b.team.total_rank_points || 0) - (a.team.total_rank_points || 0);
      });

      setRegistrations(mapped);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast({ title: "Error", description: "Failed to load teams", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRegistrations((items) => {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newArray = arrayMove(items, oldIndex, newIndex);
      // Update seeds based on new positions
      return newArray.map((item, idx) => ({ ...item, seed: idx + 1 }));
    });
    setHasChanges(true);
  };

  const handleSeedChange = (id: string, seed: number) => {
    setRegistrations(registrations.map(r => r.id === id ? { ...r, seed } : r));
    setHasChanges(true);
  };

  const handleAutoSeedByRank = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('auto_seed_by_rank_points', {
        p_tournament_id: tournamentId,
      });

      if (error) throw error;
      const result = data as { success?: boolean; teams_seeded?: number } | null;
      toast({ title: "Auto-seeded!", description: `${result?.teams_seeded || 0} teams seeded by rank points` });
      await fetchRegistrations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRandomize = () => {
    const shuffled = [...registrations].sort(() => Math.random() - 0.5);
    setRegistrations(shuffled.map((item, idx) => ({ ...item, seed: idx + 1 })));
    setHasChanges(true);
  };

  const handleSaveSeeds = async () => {
    setSaving(true);
    try {
      // Update all seeds
      const updates = registrations.map((r, idx) => 
        supabase
          .from('team_tournament_registrations')
          .update({ seed: idx + 1, seeded_at: new Date().toISOString() })
          .eq('id', r.id)
      );

      await Promise.all(updates);

      toast({ title: "Seeds saved!", description: "All team seeds have been updated" });
      setHasChanges(false);
      onSeedingComplete?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-8">
        <div className="flex items-center justify-center">
          <Trophy className="w-8 h-8 text-[hsl(var(--beta-accent))] animate-pulse" />
        </div>
      </GlassCard>
    );
  }

  if (registrations.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] mb-2">No Teams Registered</h3>
        <p className="text-[hsl(var(--beta-text-muted))]">Teams need to register before seeding can begin.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">Team Seeding</h3>
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">
            Drag to reorder or use auto-seed options
          </p>
        </div>
        {hasChanges && (
          <BetaBadge variant="warning">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Unsaved Changes
          </BetaBadge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <BetaButton variant="secondary" size="sm" onClick={handleAutoSeedByRank} disabled={saving}>
          <TrendingUp className="w-4 h-4 mr-1" />
          Auto-Seed by Rank
        </BetaButton>
        <BetaButton variant="secondary" size="sm" onClick={handleRandomize} disabled={saving}>
          <Shuffle className="w-4 h-4 mr-1" />
          Randomize
        </BetaButton>
        <BetaButton variant="secondary" size="sm" onClick={fetchRegistrations} disabled={saving}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Reset
        </BetaButton>
        {hasChanges && (
          <BetaButton onClick={handleSaveSeeds} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save Seeds'}
          </BetaButton>
        )}
      </div>

      {/* Sortable Team List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={registrations.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {registrations.map((reg, idx) => (
              <SortableTeamItem
                key={reg.id}
                registration={reg}
                index={idx}
                onSeedChange={handleSeedChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Summary */}
      <div className="mt-6 p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--beta-text-muted))]">Total Teams</span>
          <span className="font-bold text-[hsl(var(--beta-text-primary))]">{registrations.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-[hsl(var(--beta-text-muted))]">Seeded</span>
          <span className="font-bold text-[hsl(var(--beta-accent))]">
            {registrations.filter(r => r.seed).length}
          </span>
        </div>
      </div>
    </GlassCard>
  );
};

export default BetaTeamSeedingManager;
