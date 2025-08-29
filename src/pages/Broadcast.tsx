import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useBroadcastData } from "@/hooks/useBroadcastData";
import BroadcastLayout from "@/components/broadcast/BroadcastLayout";
import TeamShowcase from "@/components/broadcast/TeamShowcase";
import TeamComparison from "@/components/broadcast/TeamComparison";
import PlayerSpotlight from "@/components/broadcast/PlayerSpotlight";
import BracketViewer from "@/components/broadcast/BracketViewer";
import SceneControls from "@/components/broadcast/SceneControls";
import ProgressIndicator from "@/components/broadcast/ProgressIndicator";
import BroadcastConfig from "@/components/broadcast/BroadcastConfig";
import KeyboardControlsModal from "@/components/broadcast/KeyboardControlsModal";
import TournamentOverlay from "@/components/broadcast/TournamentOverlay";
import MatchPredictions from "@/components/broadcast/MatchPredictions";
import LiveStatistics from "@/components/broadcast/LiveStatistics";
import { useBroadcastScene, type SceneType } from "@/hooks/useBroadcastScene";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    pauseAutoPlay,
    updateConfig,
    setTeamIndex,
    setPlayerIndex
  } = useBroadcastScene(teams);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent default browser shortcuts
      e.preventDefault();
      
      switch (e.code) {
        case 'ArrowRight':
          nextScene();
          pauseAutoPlay();
          break;
        case 'ArrowLeft':
          prevScene();
          pauseAutoPlay();
          break;
        case 'ArrowUp':
          // Next scene type
          const enabledScenes = config.enabledScenes;
          const currentIndex = enabledScenes.indexOf(currentScene);
          const nextSceneIndex = (currentIndex + 1) % enabledScenes.length;
          setScene(enabledScenes[nextSceneIndex]);
          pauseAutoPlay();
          break;
        case 'ArrowDown':
          // Previous scene type
          const enabledScenesDown = config.enabledScenes;
          const currentIndexDown = enabledScenesDown.indexOf(currentScene);
          const prevSceneIndex = currentIndexDown === 0 ? enabledScenesDown.length - 1 : currentIndexDown - 1;
          setScene(enabledScenesDown[prevSceneIndex]);
          pauseAutoPlay();
          break;
        case 'Space':
          togglePlayPause();
          break;
        case 'KeyH':
          setControlsVisible(prev => !prev);
          break;
        case 'Digit1':
          setScene('team-showcase' as SceneType);
          pauseAutoPlay();
          break;
        case 'Digit2':
          setScene('team-comparison' as SceneType);
          pauseAutoPlay();
          break;
        case 'Digit3':
          setScene('player-spotlight' as SceneType);
          pauseAutoPlay();
          break;
        case 'Digit4':
          setScene('bracket' as SceneType);
          pauseAutoPlay();
          break;
        case 'Escape':
          setShowKeyboardHelp(false);
          break;
        case 'F1':
          setShowKeyboardHelp(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentScene, config.enabledScenes, nextScene, prevScene, setScene, togglePlayPause, pauseAutoPlay]);

  // Show keyboard help on first load
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('broadcast-keyboard-help-shown');
    if (!hasSeenHelp) {
      setTimeout(() => setShowKeyboardHelp(true), 2000);
      localStorage.setItem('broadcast-keyboard-help-shown', 'true');
    }
  }, []);

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
            {error || "Tournament not found or not available for broadcast"}
          </div>
          <div className="text-muted-foreground text-center max-w-md">
            Make sure the tournament is in "live" or "completed" status and try again
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
            tournamentId={id}
            onPlayerClick={(playerIndex) => {
              pauseAutoPlay();
              setPlayerIndex(playerIndex);
            }}
            onTeamClick={(teamIndex) => {
              pauseAutoPlay();
              setTeamIndex(teamIndex);
            }}
          />
        );
      case 'team-comparison':
        return (
          <TeamComparison
            teams={teams}
            transition={config.transition}
            onTeamClick={(teamIndex) => {
              pauseAutoPlay();
              setTeamIndex(teamIndex);
              setScene('team-showcase');
            }}
          />
        );
      case 'player-spotlight':
        return (
          <PlayerSpotlight
            teams={teams}
            currentPlayerIndex={currentPlayerIndex}
            transition={config.transition}
            onPlayerClick={(playerIndex) => {
              pauseAutoPlay();
              setPlayerIndex(playerIndex);
            }}
            onTeamClick={(teamIndex) => {
              pauseAutoPlay();
              setTeamIndex(teamIndex);
              setScene('team-showcase');
            }}
          />
        );
      case 'bracket':
        return (
          <BracketViewer
            tournamentId={id!}
            transition={config.transition}
            onMatchClick={(matchId) => {
              pauseAutoPlay();
              // Could navigate to match details or highlight match
              console.log('Match clicked:', matchId);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <BroadcastLayout backgroundColor={config.backgroundColor}>
      <div className="relative w-full h-full">
        {/* Tournament Information Overlays */}
        {controlsVisible && (
          <>
            <TournamentOverlay 
              tournament={tournament} 
              teams={teams}
            />
            <MatchPredictions 
              teams={teams}
            />
            <LiveStatistics 
              teams={teams}
            />
          </>
        )}
        
        <div onClick={pauseAutoPlay}>
          {renderScene()}
        </div>
        
        {controlsVisible && (
          <>
            <ProgressIndicator
              currentScene={currentScene}
              progress={progress}
              isPlaying={isPlaying}
              config={config}
              onSceneClick={(scene) => {
                pauseAutoPlay();
                setScene(scene);
              }}
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
          </>
        )}

        {/* Hide/Show Controls Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 bg-black/40 hover:bg-black/60 text-white border border-white/20"
          onClick={() => setControlsVisible(!controlsVisible)}
        >
          <span className="text-sm">H</span>
        </Button>

        {/* Keyboard Help Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-16 bg-black/40 hover:bg-black/60 text-white border border-white/20"
          onClick={() => setShowKeyboardHelp(true)}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

        <KeyboardControlsModal
          open={showKeyboardHelp}
          onOpenChange={setShowKeyboardHelp}
        />
      </div>
    </BroadcastLayout>
  );
}