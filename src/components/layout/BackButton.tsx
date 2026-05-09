import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallbackTo?: string;
  label?: string;
  className?: string;
}

export const BackButton = ({
  fallbackTo = "/dashboard",
  label = "Back",
  className = "",
}: BackButtonProps) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackTo);
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`font-sans -ml-2 h-8 px-2 text-muted-foreground hover:text-foreground ${className}`}
    >
      <ArrowLeft className="w-4 h-4 mr-1.5" />
      <span className="text-sm">{label}</span>
    </Button>
  );
};
