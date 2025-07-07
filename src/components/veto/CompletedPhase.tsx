import { VetoSessionData } from '@/hooks/useVetoSession';
import { CheckCircle, MapPin, Sword, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CompletedPhaseProps {
  session: VetoSessionData;
  homeTeamName: string;
  awayTeamName: string;
}

export function CompletedPhase({ session, homeTeamName, awayTeamName }: CompletedPhaseProps) {
  // Get the selected map and side choice
  const selectedAction = session.actions.find(action => action.action === 'pick');
  const selectedMap = selectedAction?.map;
  const sideChoice = selectedAction?.side_choice;

  // Get banned maps
  const bannedMaps = session.actions
    .filter(action => action.action === 'ban')
    .sort((a, b) => a.order_number - b.order_number);

  return (
    <div className="text-center py-8">
      <div className="mb-8">
        <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Veto Complete!
        </h3>
        <p className="text-slate-400">
          The map has been selected and teams are ready to play.
        </p>
      </div>

      {/* Selected Map */}
      {selectedMap && (
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-green-500/30">
          <div className="flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6 text-green-400 mr-2" />
            <h4 className="text-lg font-semibold text-white">Selected Map</h4>
          </div>
          
          <div className="flex flex-col items-center">
            {selectedMap.thumbnail_url && (
              <img 
                src={selectedMap.thumbnail_url} 
                alt={selectedMap.display_name}
                className="w-48 h-32 object-cover rounded-lg mb-4"
              />
            )}
            <h5 className="text-xl font-bold text-white mb-2">
              {selectedMap.display_name}
            </h5>
            
            {/* Side choice info */}
            {sideChoice && (
              <div className="flex items-center space-x-2">
                {sideChoice === 'Attack' ? (
                  <Sword className="w-4 h-4 text-red-400" />
                ) : (
                  <Shield className="w-4 h-4 text-blue-400" />
                )}
                <span className="text-slate-300">
                  {homeTeamName} starts on {sideChoice}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banned Maps Summary */}
      {bannedMaps.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4">Banned Maps</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {bannedMaps.map((action, index) => (
              <div 
                key={action.id}
                className="flex items-center space-x-2 p-2 bg-red-500/10 rounded border border-red-500/30"
              >
                <Badge variant="destructive" className="text-xs">
                  {index + 1}
                </Badge>
                <span className="text-sm text-slate-300 truncate">
                  {action.map.display_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-slate-400">
        Veto completed at {session.completed_at ? new Date(session.completed_at).toLocaleTimeString() : 'Unknown time'}
      </div>
    </div>
  );
}