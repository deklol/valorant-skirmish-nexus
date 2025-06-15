
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings } from "lucide-react";

interface BracketHeaderProps {
  name: string;
  bracketType: string;
  matchFormat: string;
  maxTeams: number;
  status: string;
  onBack: () => void;
  isAdmin?: boolean;
  onManageBracket?: () => void;
}

const BracketHeader = ({
  name,
  bracketType,
  matchFormat,
  maxTeams,
  status,
  onBack,
  isAdmin = false,
  onManageBracket
}: BracketHeaderProps) => {
  const variants: Record<string, string> = {
    draft: "bg-slate-600 text-slate-200",
    active: "bg-blue-600 text-white",
    live: "bg-green-600 text-white",
    completed: "bg-yellow-600 text-white",
    pending: "bg-gray-500 text-white"
  };

  return (
    <div className="mb-8 flex flex-col gap-2">
      <div>
        <Button 
          onClick={onBack}
          variant="ghost"
          className="text-slate-300 hover:text-white mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">{name} - Bracket</h1>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge variant="outline" className="border-slate-600 text-slate-300">{bracketType.replace("_", " ")}</Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">{matchFormat}</Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">{maxTeams} Teams Max</Badge>
            <Badge className={variants[status] || "bg-gray-600 text-white"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
          </div>
        </div>
        {isAdmin && (
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onManageBracket}>
            <Settings className="w-4 h-4 mr-2" />
            Manage Bracket
          </Button>
        )}
      </div>
    </div>
  );
};

export default BracketHeader;
