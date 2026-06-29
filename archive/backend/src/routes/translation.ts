/**
 * Translation & Localization API Routes
 */

import express, { Request, Response } from 'express';
import TranslationService from '../services/TranslationService';
import LocalizationService from '../services/LocalizationService';
import TheologicalTranslationService from '../services/TheologicalTranslationService';
import MultilingualTutorService from '../services/MultilingualTutorService';
import TranslationQualityService from '../services/TranslationQualityService';
import {
  TranslationRequest,
  LocalizationRequest,
  TheologicalTranslationRequest,
  MultilingualTutorRequest,
  BatchTranslationRequest
} from '../types/translation.types';
import logger from '../utils/logger';

const router = express.Router();

const translationService = new TranslationService();
const localizationService = new LocalizationService();
const theologicalService = new TheologicalTranslationService();
const tutorService = new MultilingualTutorService();
const qualityService = new TranslationQualityService();

/**
 * POST /api/translation/translate
 * Translate content to target language
 */
router.post('/translate', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: TranslationRequest = req.body;

    if (!request.content || !request.sourceLanguage || !request.targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: content, sourceLanguage, targetLanguage'
      });
      return;
    }

    const result = await translationService.translateContent(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Translation endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed'
    });
  }
});

/**
 * POST /api/translation/localize
 * Localize content for specific region and culture
 */
router.post('/localize', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: LocalizationRequest = req.body;

    if (!request.content || !request.targetLanguage || !request.targetRegion || !request.targetCulture) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: content, targetLanguage, targetRegion, targetCulture'
      });
      return;
    }

    const result = await translationService.localizeContent(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Localization endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Localization failed'
    });
  }
});

/**
 * POST /api/translation/theological
 * Translate theological/biblical content
 */
router.post('/theological', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: TheologicalTranslationRequest = req.body;

    if (!request.text || !request.sourceLanguage || !request.targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: text, sourceLanguage, targetLanguage'
      });
      return;
    }

    const result = await translationService.translateTheologicalContent(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Theological translation endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Theological translation failed'
    });
  }
});

/**
 * POST /api/translation/tutor
 * Provide multilingual AI tutoring
 */
router.post('/tutor', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: MultilingualTutorRequest = req.body;

    if (!request.studentId || !request.language || !request.culture || !request.question) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, language, culture, question'
      });
      return;
    }

    const result = await translationService.provideMultilingualTutoring(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Multilingual tutoring endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Multilingual tutoring failed'
    });
  }
});

/**
 * POST /api/translation/batch
 * Batch translate multiple items
 */
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: BatchTranslationRequest = req.body;

    if (!request.items || !Array.isArray(request.items) || request.items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid items array'
      });
      return;
    }

    const result = await translationService.batchTranslate(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Batch translation endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch translation failed'
    });
  }
});

/**
 * POST /api/translation/validate
 * Validate translation quality
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourceText, translatedText, sourceLanguage, targetLanguage, contentType } = req.body;

    if (!sourceText || !translatedText || !sourceLanguage || !targetLanguage || !contentType) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const metrics = await translationService.validateTranslationQuality(
      sourceText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      contentType
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Translation validation endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
});

/**
 * POST /api/translation/adapt-examples
 * Adapt examples to local context
 */
router.post('/adapt-examples', async (req: Request, res: Response): Promise<void> => {
  try {
    const { examples, targetRegion, targetCulture, targetLanguage } = req.body;

    if (!examples || !Array.isArray(examples) || !targetRegion || !targetCulture || !targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const result = await localizationService.adaptExamples(
      examples,
      targetRegion,
      targetCulture,
      targetLanguage
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Example adaptation endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Example adaptation failed'
    });
  }
});

/**
 * POST /api/translation/theological/verify
 * Verify theological precision
 */
router.post('/theological/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalText, translatedText, sourceLanguage, targetLanguage } = req.body;

    if (!originalText || !translatedText || !sourceLanguage || !targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    const result = await theologicalService.verifyTheologicalPrecision(
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Theological verification endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Theological verification failed'
    });
  }
});

/**
 * POST /api/translation/quality/report
 * Generate quality report
 */
router.post('/quality/report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { translation, metrics } = req.body;

    if (!translation || !metrics) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: translation, metrics'
      });
      return;
    }

    const report = await qualityService.generateQualityReport(translation, metrics);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Quality report endpoint error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Quality report generation failed'
    });
  }
});

/**
 * GET /api/translation/languages
 * Get supported languages
 */
router.get('/languages', async (req: Request, res: Response): Promise<void> => {
  try {
    const languages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' }
    ];

    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    logger.error('Languages endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve languages'
    });
  }
});

export default router;
