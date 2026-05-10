import { Badge } from "@/components/ui/badge";
import { GraduationCap, FlaskConical, Sparkles, Shield } from "lucide-react";

type Layer = "accreditation_track" | "research_innovation" | "scroll_distinction";
type Status = "accreditation_ready" | "accreditation_track" | "needs_rework" | "experimental" | "internal_honorific" | "pending_review";

export function LayerBadge({ layer, status }: { layer?: Layer | null; status?: Status | null }) {
  if (status === "accreditation_ready") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white"><Shield className="w-3 h-3 mr-1" />Accreditation Ready</Badge>;
  }
  if (layer === "scroll_distinction" || status === "internal_honorific") {
    return <Badge variant="outline" className="border-amber-500 text-amber-700"><Sparkles className="w-3 h-3 mr-1" />Internal Distinction</Badge>;
  }
  if (layer === "research_innovation" || status === "experimental") {
    return <Badge variant="outline" className="border-purple-500 text-purple-700"><FlaskConical className="w-3 h-3 mr-1" />Under Academic Development</Badge>;
  }
  if (layer === "accreditation_track" || status === "accreditation_track") {
    return <Badge variant="outline" className="border-primary text-primary"><GraduationCap className="w-3 h-3 mr-1" />Accreditation Track</Badge>;
  }
  return null;
}

export default LayerBadge;
