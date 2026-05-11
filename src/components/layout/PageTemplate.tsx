import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Home, Mail, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "./BackButton";

interface PageTemplateProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const PageTemplate = ({
  title,
  description,
  children,
  actions,
  className = "",
}: PageTemplateProps) => {
  return (
    <div className={`space-y-4 md:space-y-6 animate-fade-up ${className}`}>
      <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-foreground break-words">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 break-words">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:flex-nowrap lg:ml-4">
            {actions}
          </div>
        )}
      </div>
      <div className="space-y-4 md:space-y-6">{children}</div>
    </div>
  );
};

export const ComingSoonPage = ({
  title,
  description = "This feature is currently under development.",
}: {
  title: string;
  description?: string;
}) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubmitted(true);
    toast.success("You're on the list", {
      description: `We'll notify ${trimmed} the moment ${title} launches.`,
    });
  };

  return (
    <PageTemplate title={title} description={description}>
      <div className="mb-2">
        <BackButton fallbackTo="/dashboard" label="Back" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-serif">
            <span>📜</span>
            <span>Under Academic Development</span>
          </CardTitle>
          <CardDescription>
            We're building something purposeful here — Christ-centered, AI-powered learning that
            prepares scroll sons for kingdom leadership. {title} will be ready in a future release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-2">What to expect:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Living, AI-generated curriculum aligned to scroll faculties</li>
                <li>Real-time spiritual and academic feedback</li>
                <li>ScrollGold rewards for measurable growth</li>
                <li>Auditable, immutable progress records</li>
              </ul>
            </div>

            {submitted ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                ✓ You'll be notified at <span className="font-medium">{email}</span>.
              </div>
            ) : (
              <form onSubmit={handleNotify} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Get notified at launch
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    aria-label="Email for launch notification"
                  />
                  <Button type="submit">Notify Me</Button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <Home className="w-4 h-4 mr-2" /> Dashboard
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/courses">
                  <BookOpen className="w-4 h-4 mr-2" /> Browse Courses
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
};
