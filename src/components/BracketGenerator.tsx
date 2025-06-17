import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BracketGeneratorProps {
  tournamentId: string;
  teams: { id: string; name: string }[];
  onBracketGenerated: () => void;
}

const BracketGenerator = ({ tournamentId, teams, onBracketGenerated }: BracketGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateBracket = async () => {
    if (teams.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 teams are required to generate a bracket",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // First, capture current active map pool for this tournament
      const { data: activeMapPoolData, error: mapPoolError } = await supabase
        .rpc('capture_active_map_pool');

      if (mapPoolError) {
        console.error('Error capturing active map pool:', mapPoolError);
        toast({
          title: "Warning",
          description: "Could not capture current map pool. Tournament will use global settings.",
          variant: "destructive",
        });
      }

      // Update tournament with map pool before generating bracket
      if (activeMapPoolData) {
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({ map_pool: activeMapPoolData })
          .eq('id', tournamentId);

        if (updateError) {
          console.error('Error updating tournament map pool:', updateError);
          toast({
            title: "Warning", 
            description: "Tournament map pool could not be set. Continuing with bracket generation.",
            variant: "destructive",
          });
        }
      }

      const { data, error } = await supabase.functions.invoke("generate-bracket", {
        body: {
          tournamentId: tournamentId,
          teams: teams.map((team) => team.id),
        },
      });

      if (error) {
        console.error("Function invoke error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to generate bracket",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Bracket generated successfully",
        });
        onBracketGenerated();
      }
      
      // Add logging for map pool capture
      console.log(`[BracketGenerator] Captured ${JSON.parse(activeMapPoolData || '[]').length} maps for tournament ${tournamentId}`);
      

    } catch (error: any) {
      console.error('Error generating bracket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate bracket",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateBracket}
      disabled={generating}
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    >
      {generating ? "Generating..." : "Generate Bracket"}
    </Button>
  );
};

export default BracketGenerator;
