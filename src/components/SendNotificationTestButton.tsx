
import { Button } from "@/components/ui/button";
import { sendDekTestNotification } from "@/hooks/useSendTestNotification";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SendNotificationTestButton() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const res = await sendDekTestNotification();
    setSending(false);
    if (res.success) {
      toast({ title: "Success", description: "Test notification sent to _dek!" });
    } else {
      toast({
        title: "Failed",
        description: typeof res.error === "string" ? res.error : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
      {sending ? "Sending..." : "Send Test Notification to _dek"}
    </Button>
  );
}
