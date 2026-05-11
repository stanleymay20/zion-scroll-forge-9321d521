import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onComplete: (data: any) => void;
  onBack: () => void;
  institutionId: string;
  faculties: any[];
}

export const CourseImport = ({ onComplete, onBack, institutionId, faculties }: Props) => {
  const handleManualCreation = () => {
    toast.info('Navigate to Courses page to manually create courses');
    onComplete({ method: 'manual' });
  };

  const handleImport = () => {
    toast.info('Bulk import is governed by the Registrar pipeline', {
      description: 'Submit your CSV/JSON to the Registrar Office for review and ingestion.',
    });
  };

  const handleAIGeneration = () => {
    toast.info('AI generation requires faculty review', {
      description: 'Use the Faculty workspace to draft AI-assisted curricula before publishing.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Course Setup Method</h3>
        <p className="text-sm text-muted-foreground">
          Select how you'd like to add courses to your institution
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleManualCreation}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Manual Creation</CardTitle>
                <CardDescription>Create courses one by one through the interface</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Best for starting small or when you have specific course requirements
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors opacity-60" onClick={handleImport}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Import from File</CardTitle>
                <CardDescription>Upload a CSV or JSON file with course data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Import multiple courses at once from a structured CSV or JSON file
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors opacity-60" onClick={handleAIGeneration}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>AI Course Generation</CardTitle>
                <CardDescription>Let AI create a complete curriculum for your faculties</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate courses, modules, and content for faculty review and approval
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={() => onComplete({ method: 'skip' })} className="flex-1">
          Skip for Now
        </Button>
      </div>
    </div>
  );
};
