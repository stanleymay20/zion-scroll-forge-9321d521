/**
 * ScrollUniversity Research Assistant Routes
 * "The Spirit of truth will guide you into all truth" - John 16:13
 */

import { Router, Request, Response } from 'express';
import { researchAssistantService } from '../services/ResearchAssistantService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/productionLogger';
import {
    ResearchScope,
    ResearchProposal,
    Citation,
    CitationStyle,
    ResearchPaper
} from '../types/research.types';

const router = Router();

/**
 * POST /api/research/literature-review
 * Conduct comprehensive literature review
 */
router.post('/literature-review', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const scope: ResearchScope = req.body;

        if (!scope.topic) {
            res.status(400).json({
                success: false,
                error: 'Topic is required'
            });
            return;
        }

        logger.info('Literature review requested', {
            userId: (req as any).user?.id,
            topic: scope.topic
        });

        const review = await researchAssistantService.conductLiteratureReview(scope);

        res.json({
            success: true,
            data: review
        });

    } catch (error: any) {
        logger.error('Literature review error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/search-papers
 * Search academic papers
 */
router.post('/search-papers', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const scope: ResearchScope = req.body;

        if (!scope.topic) {
            res.status(400).json({
                success: false,
                error: 'Topic is required'
            });
            return;
        }

        const papers = await researchAssistantService.searchAcademicPapers(scope);

        res.json({
            success: true,
            data: papers
        });

    } catch (error: any) {
        logger.error('Paper search error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/summarize-paper
 * Summarize a single paper
 */
router.post('/summarize-paper', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { paper } = req.body;

        if (!paper || !paper.paperId) {
            res.status(400).json({
                success: false,
                error: 'Valid paper object is required'
            });
            return;
        }

        const summary = await researchAssistantService.summarizePaper(paper);

        res.json({
            success: true,
            data: summary
        });

    } catch (error: any) {
        logger.error('Paper summarization error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/suggest-methodology
 * Suggest research methodology
 */
router.post('/suggest-methodology', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const proposal: ResearchProposal = req.body;

        if (!proposal.title || !proposal.researchQuestion) {
            res.status(400).json({
                success: false,
                error: 'Title and research question are required'
            });
            return;
        }

        logger.info('Methodology suggestion requested', {
            userId: (req as any).user?.id,
            title: proposal.title
        });

        const suggestion = await researchAssistantService.suggestMethodology(proposal);

        res.json({
            success: true,
            data: suggestion
        });

    } catch (error: any) {
        logger.error('Methodology suggestion error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/format-citation
 * Format citation in multiple styles
 */
router.post('/format-citation', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const citation: Citation = req.body;

        if (!citation.authors || !citation.title || !citation.year) {
            res.status(400).json({
                success: false,
                error: 'Authors, title, and year are required'
            });
            return;
        }

        const formatted = researchAssistantService.formatCitation(citation);

        res.json({
            success: true,
            data: formatted
        });

    } catch (error: any) {
        logger.error('Citation formatting error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/generate-bibliography
 * Generate bibliography
 */
router.post('/generate-bibliography', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { citations, style } = req.body;

        if (!citations || !Array.isArray(citations) || citations.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Citations array is required'
            });
            return;
        }

        if (!style || !['APA', 'MLA', 'Chicago'].includes(style)) {
            res.status(400).json({
                success: false,
                error: 'Valid citation style (APA, MLA, Chicago) is required'
            });
            return;
        }

        const bibliography = researchAssistantService.generateBibliography(
            citations,
            style as CitationStyle
        );

        res.json({
            success: true,
            data: bibliography
        });

    } catch (error: any) {
        logger.error('Bibliography generation error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/validate-citation
 * Validate citation accuracy
 */
router.post('/validate-citation', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const citation: Citation = req.body;

        const validation = await researchAssistantService.validateCitation(citation);

        res.json({
            success: true,
            data: validation
        });

    } catch (error: any) {
        logger.error('Citation validation error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/check-missing-citations
 * Check for missing citations in text
 */
router.post('/check-missing-citations', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { text, citations } = req.body;

        if (!text) {
            res.status(400).json({
                success: false,
                error: 'Text is required'
            });
            return;
        }

        const missing = await researchAssistantService.checkMissingCitations(
            text,
            citations || []
        );

        res.json({
            success: true,
            data: missing
        });

    } catch (error: any) {
        logger.error('Missing citations check error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/research/provide-feedback
 * Provide feedback on research paper
 */
router.post('/provide-feedback', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const paper: ResearchPaper = req.body;

        if (!paper.title || !paper.abstract) {
            res.status(400).json({
                success: false,
                error: 'Title and abstract are required'
            });
            return;
        }

        logger.info('Research feedback requested', {
            userId: (req as any).user?.id,
            title: paper.title
        });

        const feedback = await researchAssistantService.provideFeedback(paper);

        res.json({
            success: true,
            data: feedback
        });

    } catch (error: any) {
        logger.error('Research feedback error', {
            userId: (req as any).user?.id,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
