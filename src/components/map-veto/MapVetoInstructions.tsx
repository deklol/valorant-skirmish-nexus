
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const MapVetoInstructions = () => (
  <Card className="bg-slate-800 border-slate-700">
    <CardContent className="p-4">
      <div className="text-sm text-slate-400 space-y-1">
        <p>• Teams alternate between banning and picking maps</p>
        <p>• Banned maps cannot be played in this match</p>
        <p>• Picked maps will be played in the order they were selected</p>
        <p>• Wait for your turn to make a selection</p>
      </div>
    </CardContent>
  </Card>
);

export default MapVetoInstructions;
