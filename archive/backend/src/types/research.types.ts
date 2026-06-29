/**
 * ScrollUniversity Research Assistant Types
 * "The Spirit of truth will guide you into all truth" - John 16:13
 */

export interface AcademicPaper {
    paperId: string;
    title: string;
    authors: Author[];
    year: number;
    abstract: string;
    url?: string;
    citationCount: number;
    influentialCitationCount: number;
    venue?: string;
    publicationTypes?: string[];
    fieldsOfStudy?: string[];
}

export interface Author {
    authorId: string;
    name: string;
}

export interface PaperSummary {
    paperId: string;
    title: string;
    authors: string[];
    year: number;
    keyFindings: string[];
    methodology: string;
    limitations: string[];
    connections: string[];
    relevanceScore: number;
    summary: string;
}

export interface LiteratureReview {
    topic: string;
    searchQuery: string;
    totalPapers: number;
    keyPapers: PaperSummary[];
    researchGaps: string[];
    methodologies: string[];
    theoreticalFrameworks: string[];
    synthesisMap: ConceptMap;
    recommendations: string[];
    generatedAt: Date;
}

export interface ConceptMap {
    nodes: ConceptNode[];
    edges: ConceptEdge[];
}

export interface ConceptNode {
    id: string;
    label: string;
    type: 'theme' | 'methodology' | 'finding' | 'gap';
    papers: string[];
}

export interface ConceptEdge {
    source: string;
    target: string;
    relationship: string;
}

export interface ResearchScope {
    topic: string;
    keywords: string[];
    yearRange?: {
        start: number;
        end: number;
    };
    fieldsOfStudy?: string[];
    minCitations?: number;
    maxPapers?: number;
}

export interface MethodologySuggestion {
    researchType: 'quantitative' | 'qualitative' | 'mixed-methods';
    recommendedMethods: ResearchMethod[];
    statisticalAnalyses: StatisticalAnalysis[];
    confoundingVariables: string[];
    dataCollectionStrategies: string[];
    sampleSizeRecommendation?: string;
    ethicalConsiderations: string[];
    templates: MethodologyTemplate[];
}

export interface ResearchMethod {
    name: string;
    description: string;
    appropriateFor: string[];
    strengths: string[];
    limitations: string[];
    examples: string[];
}

export interface StatisticalAnalysis {
    name: string;
    description: string;
    whenToUse: string;
    assumptions: string[];
    interpretation: string;
}

export interface MethodologyTemplate {
    title: string;
    sections: string[];
    content: string;
}

export interface ResearchProposal {
    title: string;
    researchQuestion: string;
    objectives: string[];
    background: string;
    proposedMethodology?: string;
    expectedOutcomes?: string[];
}

export interface Citation {
    type: 'book' | 'article' | 'website' | 'conference' | 'thesis';
    authors: string[];
    title: string;
    year: number;
    journal?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    publisher?: string;
    url?: string;
    doi?: string;
    accessDate?: Date;
}

export interface FormattedCitation {
    citation: Citation;
    apa: string;
    mla: string;
    chicago: string;
}

export interface Bibliography {
    style: CitationStyle;
    citations: FormattedCitation[];
    formatted: string;
}

export type CitationStyle = 'APA' | 'MLA' | 'Chicago';

export interface ResearchFeedback {
    paperId: string;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    argumentStructure: ArgumentFeedback;
    evidenceQuality: EvidenceFeedback;
    writingQuality: WritingFeedback;
    recommendations: string[];
    detailedComments: Comment[];
}

export interface ArgumentFeedback {
    score: number;
    thesisClarity: number;
    logicalFlow: number;
    counterarguments: number;
    conclusion: number;
    comments: string[];
}

export interface EvidenceFeedback {
    score: number;
    sourceQuality: number;
    sourceRelevance: number;
    citationAccuracy: number;
    dataInterpretation: number;
    comments: string[];
}

export interface WritingFeedback {
    score: number;
    clarity: number;
    academicTone: number;
    grammar: number;
    organization: number;
    comments: string[];
}

export interface Comment {
    section: string;
    lineNumber?: number;
    type: 'strength' | 'weakness' | 'suggestion';
    comment: string;
    priority: 'high' | 'medium' | 'low';
}

export interface ResearchPaper {
    title: string;
    abstract: string;
    introduction: string;
    methodology: string;
    results: string;
    discussion: string;
    conclusion: string;
    references: Citation[];
}

export interface SemanticScholarResponse {
    total: number;
    offset: number;
    next?: number;
    data: AcademicPaper[];
}

export interface SemanticScholarSearchParams {
    query: string;
    year?: string;
    fieldsOfStudy?: string[];
    limit?: number;
    offset?: number;
    fields?: string[];
}
