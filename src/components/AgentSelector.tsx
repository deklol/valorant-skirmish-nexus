import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Agent {
  name: string;
  role: string;
}

const agents: Agent[] = [
  // Duelists
  { name: 'Iso', role: 'Duelist' },
  { name: 'Jett', role: 'Duelist' },
  { name: 'Neon', role: 'Duelist' },
  { name: 'Phoenix', role: 'Duelist' },
  { name: 'Raze', role: 'Duelist' },
  { name: 'Reyna', role: 'Duelist' },
  { name: 'Yoru', role: 'Duelist' },
  
  // Controllers
  { name: 'Astra', role: 'Controller' },
  { name: 'Brimstone', role: 'Controller' },
  { name: 'Clove', role: 'Controller' },
  { name: 'Harbor', role: 'Controller' },
  { name: 'Omen', role: 'Controller' },
  { name: 'Viper', role: 'Controller' },
  
  // Initiators
  { name: 'Breach', role: 'Initiator' },
  { name: 'Fade', role: 'Initiator' },
  { name: 'Gekko', role: 'Initiator' },
  { name: 'KAY/O', role: 'Initiator' },
  { name: 'Skye', role: 'Initiator' },
  { name: 'Sova', role: 'Initiator' },
  
  // Sentinels
  { name: 'Chamber', role: 'Sentinel' },
  { name: 'Cypher', role: 'Sentinel' },
  { name: 'Deadlock', role: 'Sentinel' },
  { name: 'Killjoy', role: 'Sentinel' },
  { name: 'Sage', role: 'Sentinel' },
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
                    src={`https://static.wikia.nocookie.net/valorant/images/4/49/${agent.name}_icon.png`}
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