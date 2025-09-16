import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StandardBadge, StandardHeading, StandardText } from "@/components/ui";
import { Users, Clock, Trophy, Calendar, Shield } from "lucide-react";
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
    registration_type: "solo" | "team";
    max_teams?: number;
  };
}

const TournamentCard = React.memo(({ tournament }: TournamentCardProps) => {
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
    return date.toLocaleString("en-GB", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
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
      className={`group overflow-hidden border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover-scale animate-fade-in cursor-pointer ${
        // If there's no image, make the card a flex column to fill height
        !tournament.banner_image_url ? "flex flex-col" : ""
      }`}
      onClick={handleCardClick}
    >
      {/* This part for the card with a banner image is changed */}
      {tournament.banner_image_url && (
        <div className="relative overflow-hidden">
          <AspectRatio ratio={16 / 9}>
            <img
              src={tournament.banner_image_url}
              alt={`${tournament.name} banner image`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
            {/* UPDATED: This div creates the feathered gradient effect */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <StandardHeading level="h4" className="pr-2 text-white">
                  {tournament.name}
                </StandardHeading>
                <div className="flex gap-2">
                  <StandardBadge status={tournament.registration_type === "team" ? "info" : "neutral"} className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    {tournament.registration_type === "team" ? "TEAM" : "SOLO"}
                  </StandardBadge>
                </div>
              </div>
              <StandardBadge status={mapStatusToBadge(tournament.status)}>
                {tournament.status.charAt(0).toUpperCase() +
                  tournament.status.slice(1)}
              </StandardBadge>
            </div>
          </AspectRatio>
        </div>
      )}

      {/* This is the header for cards WITHOUT an image */}
      {!tournament.banner_image_url && (
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <StandardHeading level="h4" className="truncate">
              {tournament.name}
            </StandardHeading>
            <StandardBadge status={tournament.registration_type === "team" ? "info" : "neutral"} className="text-xs w-fit">
              <Shield className="w-3 h-3 mr-1" />
              {tournament.registration_type === "team" ? "TEAM" : "SOLO"}
            </StandardBadge>
          </div>
          <StandardBadge status={mapStatusToBadge(tournament.status)}>
            {tournament.status.charAt(0).toUpperCase() +
              tournament.status.slice(1)}
          </StandardBadge>
        </CardHeader>
      )}

      <CardContent
        className={`p-4 pt-3 sm:p-5 flex flex-col ${
          // For cards without an image, make the content area grow and distribute its content vertically
          !tournament.banner_image_url ? "flex-grow" : "h-auto"
        }`}
      >
        {/* This grid contains the player, format, prize, and time info */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4 flex-grow">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <StandardText size="sm" color="muted">
              {tournament.registration_type === "team" 
                ? `${tournament.currentSignups}/${tournament.max_teams} Teams`
                : `${tournament.currentSignups}/${tournament.maxPlayers} Players`
              }
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

        {/* This div contains the action buttons - always at bottom */}
        <div className="flex gap-2 mt-auto">
          <Button
            variant="default"
            size="sm"
            className="flex-1 min-h-[36px] touch-manipulation"
            onClick={handleCardClick}
          >
            View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[36px] touch-manipulation"
            onClick={handleBracketClick}
          >
            View Bracket
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

TournamentCard.displayName = "TournamentCard";

export default TournamentCard;
