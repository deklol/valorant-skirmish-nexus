import { useParams } from "react-router-dom";
import { useBroadcastData } from "@/hooks/useBroadcastData";
import BroadcastLayout from "@/components/broadcast/BroadcastLayout";
import TeamShowcase from "@/components/broadcast/TeamShowcase";
import TeamComparison from "@/components/broadcast/TeamComparison";
import PlayerSpotlight from "@/components/broadcast/PlayerSpotlight";
import BracketViewer from "@/components/broadcast/BracketViewer";
import SceneControls from "@/components/broadcast/SceneControls";
import ProgressIndicator from "@/components/broadcast/ProgressIndicator";
import BroadcastConfig from "@/components/broadcast/BroadcastConfig";
import { useBroadcastScene } from "@/hooks/useBroadcastScene";
import { AlertCircle } from "lucide-react";

export default function Broadcast() {
  const { id } = useParams<{ id: string }>();
  const { tournament, teams, loading, error } = useBroadcastData(id);
  const {
    currentScene,
    currentTeamIndex,
    currentPlayerIndex,
    config,
    isPlaying,
    progress,
    nextScene,
    prevScene,
    setScene,
    togglePlayPause,
    updateConfig,
    setTeamIndex,
    setPlayerIndex
  } = useBroadcastScene(teams);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-foreground">Loading broadcast...</div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-2xl text-foreground">
            {error || "Tournament not found or not live"}
          </div>
          <div className="text-muted-foreground text-center max-w-md">
            Make sure the tournament is in "live" status and try again
          </div>
        </div>
      </div>
    );
  }

  const renderScene = () => {
    switch (currentScene) {
      case 'team-showcase':
        return (
          <TeamShowcase
            teams={teams}
            currentTeamIndex={currentTeamIndex}
            currentPlayerIndex={currentPlayerIndex}
            transition={config.transition}
          />
        );
      case 'team-comparison':
        return (
          <TeamComparison
            teams={teams}
            transition={config.transition}
          />
        );
      case 'player-spotlight':
        return (
          <PlayerSpotlight
            teams={teams}
            currentPlayerIndex={currentPlayerIndex}
            transition={config.transition}
          />
        );
      case 'bracket':
        return (
          <BracketViewer
            tournamentId={id!}
            transition={config.transition}
          />
        );
      default:
        return null;
    }
  };

  return (
    <BroadcastLayout backgroundColor={config.backgroundColor}>
      <div className="relative w-full h-full">
        {renderScene()}
        
        <ProgressIndicator
          currentScene={currentScene}
          progress={progress}
          isPlaying={isPlaying}
          config={config}
        />
        
        <SceneControls
          currentScene={currentScene}
          isPlaying={isPlaying}
          onNext={nextScene}
          onPrev={prevScene}
          onSetScene={setScene}
          onTogglePlay={togglePlayPause}
          onTeamChange={setTeamIndex}
          onPlayerChange={setPlayerIndex}
          currentTeamIndex={currentTeamIndex}
          currentPlayerIndex={currentPlayerIndex}
          teams={teams}
          config={config}
        />
        
        <BroadcastConfig
          config={config}
          onUpdate={updateConfig}
        />
      </div>
    </BroadcastLayout>
  );
}