import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Agent {
  name: string;
  role: string;
  iconUrl: string; // Added property for the icon URL
}

const agents: Agent[] = [
  // Duelists
  { name: 'Iso', role: 'Duelist', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/b/b7/Iso_icon.png' },
  { name: 'Jett', role: 'Duelist', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/3/35/Jett_icon.png' },
  { name: 'Neon', role: 'Duelist', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/d/d0/Neon_icon.png' },
  { name: 'Phoenix', role: 'Duelist', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/1/14/Phoenix_icon.png' },
  { name: 'Raze', role: 'Duelist', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/9/9c/Raze_icon.png' },
  { name: 'Reyna', role: 'Duelist', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/b/b0/Reyna_icon.png' },
  { name: 'Yoru', role: 'Duelist', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/d/d4/Yoru_icon.png' },
  
  // Controllers
  { name: 'Astra', role: 'Controller', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/0/08/Astra_icon.png' },
  { name: 'Brimstone', role: 'Controller', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/4/4d/Brimstone_icon.png' },
  { name: 'Clove', role: 'Controller', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/3/30/Clove_icon.png' },
  { name: 'Harbor', role: 'Controller', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/f/f3/Harbor_icon.png' },
  { name: 'Omen', role: 'Controller', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/b/b0/Omen_icon.png' },
  { name: 'Viper', role: 'Controller', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/5/5f/Viper_icon.png' },
  
  // Initiators
  { name: 'Breach', role: 'Initiator', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/5/53/Breach_icon.png' },
  { name: 'Fade', role: 'Initiator', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/a/a6/Fade_icon.png' },
  { name: 'Gekko', role: 'Initiator', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/6/66/Gekko_icon.png' },
  { name: 'KAY/O', role: 'Initiator', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/f/f0/KAYO_icon.png' },
  { name: 'Skye', role: 'Initiator', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/3/33/Skye_icon.png' },
  { name: 'Sova', role: 'Initiator', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/4/49/Sova_icon.png' },
  
  // Sentinels
  { name: 'Chamber', role: 'Sentinel', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/0/09/Chamber_icon.png' },
  { name: 'Cypher', role: 'Sentinel', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/8/88/Cypher_icon.png' },
  { name: 'Deadlock', role: 'Sentinel', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/e/eb/Deadlock_icon.png' },
  { name: 'Killjoy', role: 'Sentinel', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/1/15/Killjoy_icon.png' },
  { name: 'Sage', role: 'Sentinel', iconUrl: 'https://static.wikia.nocookie.net/valorant/images/7/74/Sage_icon.png' },
];

interface AgentSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const AgentSelector = ({ value, onValueChange, placeholder = "Select an agent" }: AgentSelectorProps) => {
  const groupedAgents = agents.reduce((acc, agent) => {
    if (!acc[agent.role]) {
      acc[agent.role] = [];
    }
    acc[agent.role].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedAgents).map(([role, roleAgents]) => (
          <div key={role}>
            <div className="px-2 py-1 text-sm font-semibold text-slate-400 bg-slate-800">
              {role}s
            </div>
            {roleAgents.map((agent) => (
              <SelectItem key={agent.name} value={agent.name}>
                <div className="flex items-center gap-2">
                  <img 
                    src={agent.iconUrl} // Use the correct URL from the agent object
                    alt={agent.name}
                    className="w-4 h-4 rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {agent.name}
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};