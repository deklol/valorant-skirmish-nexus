import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Settings
} from "lucide-react";

const Footer = () => {
  const [systemModalOpen, setSystemModalOpen] = useState(false);

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
            {/* Build Information */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-400" />
                  Technology Stack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Badge variant="secondary" className="justify-center">React + TypeScript</Badge>
                  <Badge variant="secondary" className="justify-center">Vite</Badge>
                  <Badge variant="secondary" className="justify-center">Tailwind CSS</Badge>
                  <Badge variant="secondary" className="justify-center">Supabase</Badge>
                  <Badge variant="secondary" className="justify-center">Shadcn/ui</Badge>
                  <Badge variant="secondary" className="justify-center">Lovable</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Built on Lovable.dev using modern web technologies with real-time database capabilities.
                </p>
              </CardContent>
            </Card>

            {/* Tournament System */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Tournament Management System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Tournament Flow</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Draft → Open → Balancing → Live → Completed</li>
                      <li>• Automated status transitions</li>
                      <li>• Real-time notifications</li>
                      <li>• Check-in enforcement</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Bracket Generation</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Single elimination brackets</li>
                      <li>• Power-of-2 optimization</li>
                      <li>• Automated progression logic</li>
                      <li>• Batch processing for large tournaments</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Balancing */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Team Balancing Algorithm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Advanced rank-based balancing system ensuring fair competition across all skill levels.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Ranking System</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Valorant rank integration</li>
                      <li>• Weight-based calculations</li>
                      <li>• Manual override capabilities</li>
                      <li>• Peak rank fallback system</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Balance Logic</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Total rank points optimization</li>
                      <li>• Captain assignment</li>
                      <li>• Phantom player integration</li>
                      <li>• Statistical validation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map Veto System */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Map Veto & Side Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Veto Process</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Competitive ban sequence</li>
                      <li>• Home/Away team assignment</li>
                      <li>• Real-time turn management</li>
                      <li>• Automatic final map selection</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Fair Odds System</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Cryptographic dice rolling</li>
                      <li>• Transparent seed generation</li>
                      <li>• Audit trail logging</li>
                      <li>• Captain-initiated rolls</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database & Infrastructure */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-400" />
                  Database Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Core Tables</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• tournaments, teams, matches</li>
                      <li>• users, team_members</li>
                      <li>• map_veto_sessions, map_veto_actions</li>
                      <li>• notifications, audit_logs</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Advanced Features</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Row Level Security (RLS)</li>
                      <li>• Real-time subscriptions</li>
                      <li>• Automated triggers & functions</li>
                      <li>• Comprehensive audit logging</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medic Tools */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-red-400" />
                  Tournament Medic Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Advanced administrative tools for tournament management and emergency intervention.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Bracket Health</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Progression validation</li>
                      <li>• Structure analysis</li>
                      <li>• Emergency reset tools</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Team Management</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Player reassignment</li>
                      <li>• Team disbanding</li>
                      <li>• Captain transfers</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Match Control</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Manual score editing</li>
                      <li>• Winner override</li>
                      <li>• Result validation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Features */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Real-time Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Live Updates</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Match status changes</li>
                      <li>• Score submissions</li>
                      <li>• Bracket progression</li>
                      <li>• Team assignments</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Notifications</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Tournament announcements</li>
                      <li>• Match assignments</li>
                      <li>• Veto turn notifications</li>
                      <li>• Result confirmations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator className="bg-slate-600" />
            
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">This platform represents hundreds of hours of development and countless iterations.</p>
              <p>Built with modern web technologies for reliability, scalability, and performance.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Footer;