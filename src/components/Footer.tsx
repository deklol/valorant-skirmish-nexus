import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Code, 
  Database, 
  Gamepad2, 
  Trophy, 
  Users, 
  Shield, 
  Zap, 
  Target,
  GitBranch,
  Server,
  Cpu,
  Settings,
  ChevronDown,
  ChevronRight,
  Info,
  Eye,
  ArrowRight
} from "lucide-react";

const Footer = () => {
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const techDetails = {
    react: {
      name: "React + TypeScript",
      description: "Modern component-based architecture with type safety",
      details: "Using React 18 with hooks, context, and TypeScript for robust type checking. All components are functional with proper prop types and error boundaries."
    },
    vite: {
      name: "Vite",
      description: "Lightning-fast build tool and dev server",
      details: "Vite provides instant hot module replacement, optimized builds, and tree-shaking for minimal bundle sizes."
    },
    tailwind: {
      name: "Tailwind CSS",
      description: "Utility-first CSS framework with design system",
      details: "Custom design tokens defined in index.css with semantic color variables. All components use HSL color functions for consistent theming."
    },
    supabase: {
      name: "Supabase",
      description: "Backend-as-a-service with real-time capabilities",
      details: "PostgreSQL database with Row Level Security, real-time subscriptions, edge functions, and built-in authentication."
    },
    shadcn: {
      name: "Shadcn/ui",
      description: "Accessible component library built on Radix",
      details: "Headless UI components with proper ARIA attributes, keyboard navigation, and customizable styling."
    },
    lovable: {
      name: "Lovable",
      description: "AI-powered development platform",
      details: "Built entirely on Lovable.dev using AI-assisted development with human oversight for complex tournament logic."
    }
  };

  return (
    <>
      <footer className="bg-slate-900/50 border-t border-slate-700 py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-2">The Last Resort — Skirmish Hub</h3>
              <p className="text-muted-foreground text-sm">
                Professional tournament management platform built for competitive gaming
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span>&copy; 2024 The Last Resort</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSystemModalOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                System
              </Button>
              <span>Built with ❤️</span>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={systemModalOpen} onOpenChange={setSystemModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Settings className="w-6 h-6 text-red-500" />
              System Architecture & Technical Overview
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              A comprehensive look under the hood of The Last Resort Skirmish Hub
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Interactive Technology Stack */}
            <Card className="bg-slate-700 border-slate-600 hover:bg-slate-700/80 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-400" />
                  Technology Stack
                  <Badge variant="outline" className="ml-2">Interactive</Badge>
                </CardTitle>
                <CardDescription>Hover over each technology to learn more</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(techDetails).map(([key, tech]) => (
                    <div
                      key={key}
                      className="relative cursor-pointer"
                      onMouseEnter={() => setHoveredTech(key)}
                      onMouseLeave={() => setHoveredTech(null)}
                    >
                      <Badge 
                        variant="secondary" 
                        className="w-full justify-center hover:bg-slate-600 transition-all duration-200 hover:scale-105"
                      >
                        {tech.name}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                {hoveredTech && (
                  <div className="mt-4 p-4 bg-slate-600 rounded-lg border border-slate-500 animate-fade-in">
                    <h4 className="font-semibold text-white mb-2">
                      {techDetails[hoveredTech as keyof typeof techDetails].name}
                    </h4>
                    <p className="text-sm text-slate-300 mb-2">
                      {techDetails[hoveredTech as keyof typeof techDetails].description}
                    </p>
                    <p className="text-xs text-slate-400">
                      {techDetails[hoveredTech as keyof typeof techDetails].details}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interactive Tournament Flow */}
            <Card className="bg-slate-700 border-slate-600">
              <Collapsible 
                open={expandedSections.has('tournament-flow')}
                onOpenChange={() => toggleSection('tournament-flow')}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-slate-600/50 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        Tournament Management System
                      </div>
                      {expandedSections.has('tournament-flow') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-blue-400" />
                          Tournament Lifecycle
                        </h4>
                        <div className="space-y-2">
                          {[
                            { status: "Draft", desc: "Tournament creation and configuration", color: "bg-gray-500" },
                            { status: "Open", desc: "Player registration active", color: "bg-green-500" },
                            { status: "Balancing", desc: "Automated team creation", color: "bg-blue-500" },
                            { status: "Live", desc: "Matches in progress", color: "bg-red-500" },
                            { status: "Completed", desc: "Winners determined", color: "bg-purple-500" }
                          ].map((stage, index) => (
                            <div key={stage.status} className="flex items-center gap-3 p-2 rounded hover:bg-slate-600 transition-colors">
                              <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                              <div>
                                <span className="font-medium">{stage.status}</span>
                                <p className="text-xs text-slate-400">{stage.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-green-400" />
                          Bracket Generation Logic
                        </h4>
                        <div className="text-sm space-y-2">
                          <div className="p-3 bg-slate-600 rounded border-l-4 border-green-400">
                            <strong>Algorithm:</strong> calculateBracketStructure()
                            <p className="text-xs text-slate-300 mt-1">
                              Generates optimal single-elimination brackets with power-of-2 considerations
                            </p>
                          </div>
                          <div className="p-3 bg-slate-600 rounded border-l-4 border-blue-400">
                            <strong>Progression:</strong> Automated match advancement
                            <p className="text-xs text-slate-300 mt-1">
                              Winners automatically advance to next round matches
                            </p>
                          </div>
                          <div className="p-3 bg-slate-600 rounded border-l-4 border-purple-400">
                            <strong>Validation:</strong> Health monitoring
                            <p className="text-xs text-slate-300 mt-1">
                              Real-time bracket integrity checking and issue detection
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Interactive Team Balancing */}
            <Card className="bg-slate-700 border-slate-600">
              <Collapsible 
                open={expandedSections.has('team-balancing')}
                onOpenChange={() => toggleSection('team-balancing')}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-slate-600/50 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-400" />
                        Team Balancing Algorithm
                      </div>
                      {expandedSections.has('team-balancing') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-yellow-400" />
                          Rank Weight System
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="bg-slate-600 p-3 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">Iron 1-3</span>
                              <Badge variant="outline" className="text-xs">10-20 pts</Badge>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div className="bg-yellow-600 h-2 rounded-full" style={{width: '10%'}}></div>
                            </div>
                          </div>
                          <div className="bg-slate-600 p-3 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">Gold 1-3</span>
                              <Badge variant="outline" className="text-xs">70-90 pts</Badge>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div className="bg-yellow-400 h-2 rounded-full" style={{width: '45%'}}></div>
                            </div>
                          </div>
                          <div className="bg-slate-600 p-3 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">Immortal+</span>
                              <Badge variant="outline" className="text-xs">300-500 pts</Badge>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: '100%'}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400" />
                          Balance Algorithm
                        </h4>
                        <div className="text-sm space-y-3">
                          <div className="p-3 bg-slate-600 rounded border border-slate-500">
                            <code className="text-green-400 font-mono text-xs">
                              rankingSystemWithOverrides()
                            </code>
                            <p className="text-xs text-slate-300 mt-2">
                              Calculates effective rank considering overrides, peak ranks, and manual adjustments
                            </p>
                          </div>
                          <div className="p-3 bg-slate-600 rounded border border-slate-500">
                            <code className="text-blue-400 font-mono text-xs">
                              TeamBalancingLogic.generateTeams()
                            </code>
                            <p className="text-xs text-slate-300 mt-2">
                              Distributes players across teams to minimize rank point variance
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Interactive Map Veto System */}
            <Card className="bg-slate-700 border-slate-600">
              <Collapsible 
                open={expandedSections.has('map-veto')}
                onOpenChange={() => toggleSection('map-veto')}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-slate-600/50 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Map Veto & Fair Odds System
                      </div>
                      {expandedSections.has('map-veto') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          Veto Flow (BO1)
                        </h4>
                        <div className="space-y-2">
                          {[
                            { team: "Home", action: "Ban", order: 1, color: "bg-red-500" },
                            { team: "Away", action: "Ban", order: 2, color: "bg-red-500" },
                            { team: "Away", action: "Ban", order: 3, color: "bg-red-500" },
                            { team: "Home", action: "Ban", order: 4, color: "bg-red-500" },
                            { team: "Away", action: "Ban", order: 5, color: "bg-red-500" },
                            { team: "Home", action: "Ban", order: 6, color: "bg-red-500" },
                            { team: "Auto", action: "Pick", order: 7, color: "bg-green-500" },
                            { team: "Home", action: "Side", order: 8, color: "bg-blue-500" }
                          ].map((step) => (
                            <div key={step.order} className="flex items-center gap-3 p-2 rounded hover:bg-slate-600 transition-colors">
                              <Badge variant="outline" className="w-8 text-xs">{step.order}</Badge>
                              <div className={`w-3 h-3 rounded-full ${step.color}`}></div>
                              <span className="text-sm">{step.team} - {step.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Server className="w-4 h-4 text-green-400" />
                          Cryptographic Dice Rolling
                        </h4>
                        <div className="text-sm space-y-3">
                          <div className="p-3 bg-slate-600 rounded border border-green-500">
                            <code className="text-green-400 font-mono text-xs">crypto.getRandomValues()</code>
                            <p className="text-xs text-slate-300 mt-2">
                              Uses browser's cryptographically secure random number generator
                            </p>
                          </div>
                          <div className="p-3 bg-slate-600 rounded border border-blue-500">
                            <strong>Seed Generation:</strong>
                            <p className="text-xs text-slate-300 mt-1">
                              Timestamp + user ID + crypto random = verifiable seed
                            </p>
                          </div>
                          <div className="p-3 bg-slate-600 rounded border border-purple-500">
                            <strong>Audit Trail:</strong>
                            <p className="text-xs text-slate-300 mt-1">
                              All rolls logged in audit_logs table with full context
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Interactive Database Architecture */}
            <Card className="bg-slate-700 border-slate-600">
              <Collapsible 
                open={expandedSections.has('database')}
                onOpenChange={() => toggleSection('database')}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-slate-600/50 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-orange-400" />
                        Database Architecture & Security
                      </div>
                      {expandedSections.has('database') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="animate-fade-in">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-400">Core Tables</h4>
                        <div className="space-y-2 text-sm">
                          {['tournaments', 'teams', 'matches', 'users', 'team_members'].map(table => (
                            <div key={table} className="p-2 bg-slate-600 rounded border-l-4 border-blue-400">
                              <code className="text-green-400 font-mono">{table}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-purple-400">Veto System</h4>
                        <div className="space-y-2 text-sm">
                          {['map_veto_sessions', 'map_veto_actions', 'maps', 'match_maps'].map(table => (
                            <div key={table} className="p-2 bg-slate-600 rounded border-l-4 border-purple-400">
                              <code className="text-green-400 font-mono">{table}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-red-400">Security & Logs</h4>
                        <div className="space-y-2 text-sm">
                          {['audit_logs', 'notifications', 'user_notification_preferences'].map(table => (
                            <div key={table} className="p-2 bg-slate-600 rounded border-l-4 border-red-400">
                              <code className="text-green-400 font-mono">{table}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Separator className="bg-slate-600 my-4" />
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-600 rounded border border-orange-500">
                        <h5 className="font-semibold text-orange-400 mb-2">Row Level Security (RLS)</h5>
                        <p className="text-xs text-slate-300">
                          Every table has granular access controls. Users can only see/modify data they own or have permission to access.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-600 rounded border border-green-500">
                        <h5 className="font-semibold text-green-400 mb-2">Real-time Subscriptions</h5>
                        <p className="text-xs text-slate-300">
                          Live updates for matches, veto actions, team changes using PostgreSQL's NOTIFY/LISTEN.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Interactive Medic Tools */}
            <Card className="bg-slate-700 border-slate-600">
              <Collapsible 
                open={expandedSections.has('medic-tools')}
                onOpenChange={() => toggleSection('medic-tools')}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-slate-600/50 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-red-400" />
                        Tournament Medic Tools
                        <Badge variant="destructive" className="text-xs">Admin Only</Badge>
                      </div>
                      {expandedSections.has('medic-tools') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-400" />
                          Health Monitoring
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="p-3 bg-red-900/20 border border-red-500 rounded">
                            <strong className="text-red-400">BracketHealthAnalyzer</strong>
                            <p className="text-xs text-slate-300 mt-1">
                              Real-time validation of bracket structure and progression logic
                            </p>
                          </div>
                          <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
                            <strong className="text-yellow-400">TournamentHealthDashboard</strong>
                            <p className="text-xs text-slate-300 mt-1">
                              Comprehensive health metrics and issue detection
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Settings className="w-4 h-4 text-purple-400" />
                          Emergency Tools
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="p-3 bg-orange-900/20 border border-orange-500 rounded">
                            <strong className="text-orange-400">Emergency Reset</strong>
                            <p className="text-xs text-slate-300 mt-1">
                              Safe tournament state restoration with full audit trail
                            </p>
                          </div>
                          <div className="p-3 bg-purple-900/20 border border-purple-500 rounded">
                            <strong className="text-purple-400">Team Reconstruction</strong>
                            <p className="text-xs text-slate-300 mt-1">
                              Player reassignment and team rebalancing tools
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            <Separator className="bg-slate-600" />
            
            <div className="text-center text-sm text-muted-foreground animate-fade-in">
              <p className="mb-2">💡 <strong>Pro Tip:</strong> Click on any section above to explore detailed technical information</p>
              <p>This platform represents hundreds of hours of development and countless iterations.</p>
              <p>Built with modern web technologies for reliability, scalability, and performance.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Footer;