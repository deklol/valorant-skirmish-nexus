
import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Map as MapIcon } from "lucide-react";

interface MapData {
  id: string;
  display_name: string;
  thumbnail_url?: string | null;
}

interface MapPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableMaps: MapData[];
  onConfirm: (selectedMapIds: string[]) => void;
  allowMultiPick?: boolean;
  loading?: boolean;
}

export function MapPickerDialog({
  open,
  onOpenChange,
  availableMaps,
  onConfirm,
  allowMultiPick = false,
  loading = false,
}: MapPickerDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);

  // Reset selection when closed
  React.useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  const handleSelect = (mapId: string) => {
    if (allowMultiPick) {
      setSelected(prev =>
        prev.includes(mapId) ? prev.filter(id => id !== mapId) : [...prev, mapId]
      );
    } else {
      setSelected([mapId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <MapIcon className="inline w-5 h-5 mr-1" />
            Select {allowMultiPick ? 'Final Map(s)' : 'Final Map'} for Veto
          </DialogTitle>
        </DialogHeader>
        {/* Show available maps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
          {availableMaps.length === 0 ? (
            <span className="text-slate-400">No available maps found.</span>
          ) : (
            availableMaps.map((map) => (
              <button
                key={map.id}
                type="button"
                className={`flex items-center gap-3 px-3 py-2 rounded border-2 transition-colors ${
                  selected.includes(map.id)
                    ? "border-green-500 bg-green-500/10"
                    : "border-slate-700 hover:border-green-400"
                }`}
                onClick={() => handleSelect(map.id)}
                disabled={loading}
              >
                {map.thumbnail_url && (
                  <img src={map.thumbnail_url} alt={map.display_name} className="w-8 h-8 rounded" />
                )}
                <span className="text-slate-200">{map.display_name}</span>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={selected.length === 0 || loading}
            onClick={() => {
              onConfirm(selected);
              onOpenChange(false);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MapPickerDialog;
