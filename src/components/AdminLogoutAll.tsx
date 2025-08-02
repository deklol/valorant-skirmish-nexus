
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, AlertTriangle } from "lucide-react";

const AdminLogoutAll = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogoutAll = async () => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to perform this action",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('admin-logout-all', {
        body: { confirm: true },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully logged out ${result.loggedOutCount} of ${result.totalUsers} users`,
        });
        
        if (result.errors && result.errors.length > 0) {
          console.warn('Some errors occurred:', result.errors);
        }
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error logging out all users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to logout all users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <LogOut className="w-5 h-5" />
          User Session Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-400 text-sm">
          This will immediately sign out all users from the system. Use with caution.
        </p>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={isLoading}
              className="w-full"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {isLoading ? "Logging out all users..." : "Logout All Users"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirm Logout All Users</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This action will immediately sign out ALL users from the system. 
                This cannot be undone and users will need to sign in again.
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-muted text-foreground border-input">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogoutAll}
                className="bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                Yes, Logout All Users
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AdminLogoutAll;
