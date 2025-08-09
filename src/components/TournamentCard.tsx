
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StandardBadge, StandardHeading, StandardText } from "@/components/ui";
import { Users, Clock, Trophy, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tournament } from "@/types/tournament";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface TournamentCardProps {
  tournament: Tournament & {
    currentSignups: number;
    maxPlayers: number;
    prizePool: string;
    startTime: Date;
    format: "BO1" | "BO3";
  };
}

const TournamentCard = ({ tournament }: TournamentCardProps) => {
  const navigate = useNavigate();

type BadgeStatus = "success" | "warning" | "error" | "info" | "neutral";

const mapStatusToBadge = (status: string): BadgeStatus => {
  switch (status) {
    case "open":
      return "success";
    case "balancing":
      return "warning";
    case "live":
      return "error";
    case "completed":
      return "info";
    case "draft":
    case "archived":
    default:
      return "neutral";
  }
};

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleCardClick = () => {
    navigate(`/tournament/${tournament.id}`);
  };

  const handleBracketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/bracket/${tournament.id}`);
  };

  return (
    <Card 
      className="group overflow-hidden border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover-scale animate-fade-in cursor-pointer"
      onClick={handleCardClick}
    >
      {tournament.banner_image_url && (
        <div className="relative overflow-hidden">
          <AspectRatio ratio={16 / 9}>
            <img
              src={tournament.banner_image_url}
              alt={`${tournament.name} banner image`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
              <StandardHeading level="h4" className="pr-2 text-white">
                {tournament.name}
              </StandardHeading>
              <StandardBadge status={mapStatusToBadge(tournament.status)}>
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </StandardBadge>
            </div>
          </AspectRatio>
        </div>
      )}

      {!tournament.banner_image_url && (
        <CardHeader className="flex items-start justify-between gap-3">
          <StandardHeading level="h4" className="truncate">
            {tournament.name}
          </StandardHeading>
          <StandardBadge status={mapStatusToBadge(tournament.status)}>
            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
          </StandardBadge>
        </CardHeader>
      )}

      <CardContent className="space-y-4 p-4 pt-3 sm:p-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <StandardText size="sm" color="muted">
              {tournament.currentSignups}/{tournament.maxPlayers} Players
            </StandardText>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="w-4 h-4" />
            <StandardText size="sm" color="muted">
              {tournament.format}
            </StandardText>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <StandardText size="sm" color="muted">
              {tournament.prizePool}
            </StandardText>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <StandardText size="sm" color="muted">
              {formatDate(tournament.startTime)}
            </StandardText>
          </div>
        </div>
        
        <div className="flex gap-3 pt-1">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={handleCardClick}
          >
            View Details
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleBracketClick}
            disabled>
            View Bracket
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentCard;
