import { getBroadcastLoadingStyles } from "@/utils/broadcastLayoutUtils";

interface BroadcastLoadingProps {
  message?: string;
  textColor?: string;
  fontSize?: string;
}

export function BroadcastLoading({ 
  message = "Loading...", 
  textColor,
  fontSize 
}: BroadcastLoadingProps) {
  const styles = getBroadcastLoadingStyles(textColor, fontSize);
  
  return (
    <div className={styles.container}>
      <div className="font-medium" style={styles.text}>
        {message}
      </div>
    </div>
  );
}