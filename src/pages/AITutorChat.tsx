import { useParams, useNavigate } from "react-router-dom";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, Heart, Microscope, Coins, Briefcase } from "lucide-react";
import { AIChat } from "@/components/AIChat";
import { AIDisclosureBanner } from "@/components/ai/AIDisclosureBanner";

const tutorDetails: Record<string, any> = {
  "scrollmentor-gpt": {
    name: "ScrollMentor GPT",
    faculty: "General Studies",
    specialty: "General Knowledge & Spiritual Guidance",
    personality: "Wise & Encouraging",
    icon: Brain
  },
  "propheticus-ai": {
    name: "Propheticus AI",
    faculty: "Prophetic Intelligence",
    specialty: "Prophetic Intelligence & Discernment",
    personality: "Prophetic & Insightful",
    icon: Heart
  },
  "scroll-medicus": {
    name: "ScrollMedicus AI",
    faculty: "ScrollMedicine",
    specialty: "Medical Science & Divine Healing",
    personality: "Compassionate & Knowledgeable",
    icon: Heart
  },
  "economicus-scrollus": {
    name: "Economicus Scrollus",
    faculty: "Scroll Economy",
    specialty: "Kingdom Economics & ScrollCoin Theory",
    personality: "Strategic & Kingdom-Minded",
    icon: Coins
  },
  "scientificus-eden": {
    name: "Scientificus Eden",
    faculty: "Edenic Science",
    specialty: "Edenic Science & Creation Research",
    personality: "Curious & Evidence-Based",
    icon: Microscope
  },
  "legalis-propheticus": {
    name: "Legalis Propheticus",
    faculty: "Prophetic Law",
    specialty: "Prophetic Law & Divine Governance",
    personality: "Just & Principled",
    icon: Briefcase
  }
};

export default function AITutorChat() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  
  const tutor = (tutorId && tutorDetails[tutorId]) ? tutorDetails[tutorId] : tutorDetails["scrollmentor-gpt"];
  const TutorIcon = tutor?.icon || Brain;

  return (
    <PageTemplate
      title={tutor.name}
      description={tutor.specialty}
      actions={
        <Button variant="outline" onClick={() => navigate("/ai-tutors")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to AI Tutors
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <TutorIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{tutor.name}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">{tutor.faculty}</Badge>
              <Badge variant="outline">{tutor.personality}</Badge>
            </div>
          </div>
        </div>

        <AIDisclosureBanner systemName={tutor.name} variant="chat" />

        <AIChat faculty={tutor.faculty} personality={tutor.personality} />
      </div>
    </PageTemplate>
  );
}
