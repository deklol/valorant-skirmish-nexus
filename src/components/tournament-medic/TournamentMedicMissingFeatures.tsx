import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Users, Settings, Trophy, Bell, Zap } from "lucide-react";

const MISSING_FEATURES = [
  {
    category: "Notification System",
    icon: Bell,
    features: [
      { name: "Tournament Status Change Notifications", status: "missing", priority: "high" },
      { name: "Achievement Unlock Notifications", status: "missing", priority: "high" },
      { name: "Automatic Check-in Reminders", status: "partial", priority: "medium" },
      { name: "Match Assignment Notifications", status: "missing", priority: "high" },
      { name: "Team Balance Complete Notifications", status: "missing", priority: "medium" }
    ]
  },
  {
    category: "Tournament Management",
    icon: Trophy,
    features: [
      { name: "Bracket Health Monitoring", status: "missing", priority: "high" },
      { name: "Automated Match Progression", status: "partial", priority: "high" },
      { name: "Tournament Timeline Tracking", status: "missing", priority: "medium" },
      { name: "Emergency Reset Tools", status: "partial", priority: "high" },
      { name: "Participant Communication Tools", status: "missing", priority: "medium" }
    ]
  },
  {
    category: "User Management",
    icon: Users,
    features: [
      { name: "Bulk User Operations", status: "missing", priority: "medium" },
      { name: "User Activity Monitoring", status: "missing", priority: "low" },
      { name: "Permission Management", status: "basic", priority: "medium" },
      { name: "User Statistics Dashboard", status: "partial", priority: "low" },
      { name: "Automated Rank Updates", status: "manual", priority: "medium" }
    ]
  },
  {
    category: "Analytics & Reporting",
    icon: Settings,
    features: [
      { name: "Tournament Performance Metrics", status: "missing", priority: "medium" },
      { name: "User Engagement Analytics", status: "missing", priority: "low" },
      { name: "Error Reporting Dashboard", status: "partial", priority: "medium" },
      { name: "System Health Monitoring", status: "missing", priority: "high" },
      { name: "Export/Import Tools", status: "missing", priority: "low" }
    ]
  },
  {
    category: "Automation",
    icon: Zap,
    features: [
      { name: "Scheduled Tournament Operations", status: "missing", priority: "high" },
      { name: "Auto-substitute Management", status: "missing", priority: "medium" },
      { name: "Dynamic Team Balancing", status: "manual", priority: "medium" },
      { name: "Automated Conflict Resolution", status: "missing", priority: "medium" },
      { name: "Background Task Management", status: "missing", priority: "high" }
    ]
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'missing': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'partial': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    case 'basic': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'manual': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-600 text-white';
    case 'medium': return 'bg-yellow-600 text-white';
    case 'low': return 'bg-green-600 text-white';
    default: return 'bg-gray-600 text-white';
  }
};

export default function TournamentMedicMissingFeatures() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const getCategoryStats = (category: any) => {
    const total = category.features.length;
    const missing = category.features.filter((f: any) => f.status === 'missing').length;
    const partial = category.features.filter((f: any) => f.status === 'partial' || f.status === 'basic' || f.status === 'manual').length;
    const complete = total - missing - partial;
    
    return { total, missing, partial, complete };
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Tournament Medic - Missing Features Audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {MISSING_FEATURES.map((category) => {
          const stats = getCategoryStats(category);
          const Icon = category.icon;
          const isExpanded = expandedCategory === category.category;
          
          return (
            <div key={category.category} className="border border-slate-600 rounded-lg bg-slate-900/50">
              <div 
                className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : category.category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-white">{category.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
                      {stats.missing} Missing
                    </Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
                      {stats.partial} Partial
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                      {stats.complete} Complete
                    </Badge>
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {category.features.map((feature: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-600">
                      <div className="flex items-center gap-3">
                        {feature.status === 'missing' ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : feature.status === 'partial' || feature.status === 'basic' || feature.status === 'manual' ? (
                          <Clock className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        <span className="text-slate-200">{feature.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(feature.priority)}>
                          {feature.priority}
                        </Badge>
                        <Badge className={getStatusColor(feature.status)}>
                          {feature.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h3 className="text-blue-400 font-medium mb-2">Summary</h3>
          <p className="text-slate-300 text-sm">
            Tournament Medic is missing several critical features for comprehensive tournament management. 
            Priority should be given to notification system enhancements, automated tournament operations, 
            and system health monitoring tools.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}