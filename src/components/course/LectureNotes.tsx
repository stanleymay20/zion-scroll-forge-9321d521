/**
 * Lecture Notes Component
 * Displays lecture notes with downloadable PDF functionality
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { legacyApiCall } from "@/lib/legacyApi";
import { Button } from '@/components/ui/button';
import { Download, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

interface LectureNotesProps {
  lectureId: string;
  title: string;
  content: any;
}

export function LectureNotes({ lectureId, title, content }: LectureNotesProps) {
  const handleDownloadPDF = async () => {
    try {
      toast.info('Generating PDF...', {
        description: 'Please wait while we prepare your download'
      });

      // In production, this would call the backend PDF generation service
      // For now, we'll simulate the download
      const response = await legacyApiCall(`/api/lectures/${lectureId}/notes/pdf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_notes.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('PDF Downloaded', {
          description: 'Lecture notes have been downloaded successfully'
        });
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Download Failed', {
        description: 'Unable to download PDF. Please try again later.'
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Parse content if it's a JSON object
  const notesContent = typeof content === 'string' 
    ? content 
    : content?.notes || content?.description || 'No notes available for this lecture.';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lecture Notes
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {/* Lecture Title */}
          <h2 className="text-2xl font-bold mb-4">{title}</h2>

          {/* Notes Content */}
          <div className="space-y-4">
            {typeof notesContent === 'string' ? (
              <div 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notesContent) }}
              />
            ) : (
              <>
                {/* Key Concepts */}
                {content?.key_concepts && (
                  <div className="bg-primary/5 border-l-4 border-primary p-4 rounded">
                    <h3 className="font-semibold text-lg mb-2">Key Concepts</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {content.key_concepts.map((concept: string, index: number) => (
                        <li key={index}>{concept}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Main Content */}
                {content?.sections && content.sections.map((section: any, index: number) => (
                  <div key={index} className="mb-6">
                    <h3 className="font-semibold text-xl mb-2">{section.title}</h3>
                    <p className="text-muted-foreground">{section.content}</p>
                    
                    {section.examples && (
                      <div className="mt-3 bg-muted/50 p-3 rounded">
                        <h4 className="font-medium mb-2">Examples:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {section.examples.map((example: string, exIndex: number) => (
                            <li key={exIndex}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {/* Scripture References */}
                {content?.scripture_references && (
                  <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 p-4 rounded">
                    <h3 className="font-semibold text-lg mb-2">📖 Scripture References</h3>
                    <ul className="space-y-2">
                      {content.scripture_references.map((ref: any, index: number) => (
                        <li key={index}>
                          <span className="font-medium">{ref.reference}:</span>{' '}
                          <span className="text-muted-foreground">{ref.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary */}
                {content?.summary && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 p-4 rounded">
                    <h3 className="font-semibold text-lg mb-2">Summary</h3>
                    <p>{content.summary}</p>
                  </div>
                )}

                {/* Additional Resources */}
                {content?.resources && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-lg mb-2">Additional Resources</h3>
                    <ul className="space-y-2">
                      {content.resources.map((resource: any, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <a 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {resource.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Study Questions */}
                {content?.study_questions && (
                  <div className="mt-6 bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded">
                    <h3 className="font-semibold text-lg mb-2">Study Questions</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      {content.study_questions.map((question: string, index: number) => (
                        <li key={index} className="text-muted-foreground">{question}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
            <p>✝️ ScrollUniversity - Christ is Lord over every scroll</p>
            <p className="mt-1">© {new Date().getFullYear()} ScrollUniversity. All rights reserved.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
