/**
 * Cost Optimization Routes
 * API endpoints for cost optimization features
 */

import express, { Request, Response } from 'express';
import CostOptimizationService from '../services/CostOptimizationService';
import PromptOptimizationService from '../services/PromptOptimizationService';
import BudgetControlService from '../services/BudgetControlService';
import { budgetConfig } from '../config/cost-optimization.config';
import { authenticateToken, requireRole } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const costOptimization = new CostOptimizationService();
const promptOptimizer = new PromptOptimizationService();
const budgetControl = new BudgetControlService(budgetConfig);

/**
 * Get cost optimization report
 */
router.get('/report', authenticateToken, requireRole(['admin', 'faculty']), async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await costOptimization.getCostReport();
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Error getting cost report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate cost report' });
  }
});

/**
 * Get budget status
 */
router.get('/budget/status', authenticateToken, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await budgetControl.getBudgetStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Error getting budget status:', error);
    res.status(500).json({ success: false, error: 'Failed to get budget status' });
  }
});

/**
 * Get cost forecast
 */
router.get('/forecast/:period', authenticateToken, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const period = req.params.period as 'daily' | 'weekly' | 'monthly';
    const forecast = await budgetControl.generateForecast(period);
    res.json({ success: true, data: forecast });
  } catch (error) {
    logger.error('Error generating forecast:', error);
    res.status(500).json({ success: false, error: 'Failed to generate forecast' });
  }
});

/**
 * Get optimization recommendations
 */
router.get('/recommendations', authenticateToken, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const recommendations = await costOptimization.getRecommendations();
    res.json({ success: true, data: recommendations });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

/**
 * Optimize a prompt
 */
router.post('/optimize-prompt', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, config } = req.body;

    if (!prompt) {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }

    const optimized = await promptOptimizer.optimizePrompt(prompt, config);
    res.json({ success: true, data: optimized });
  } catch (error) {
    logger.error('Error optimizing prompt:', error);
    res.status(500).json({ success: false, error: 'Failed to optimize prompt' });
  }
});

/**
 * Get prompt best practices
 */
router.get('/prompt-best-practices', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const bestPractices = await promptOptimizer.getBestPractices();
    res.json({ success: true, data: bestPractices });
  } catch (error) {
    logger.error('Error getting best practices:', error);
    res.status(500).json({ success: false, error: 'Failed to get best practices' });
  }
});

/**
 * Get optimization metrics
 */
router.get('/metrics', authenticateToken, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await costOptimization.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

/**
 * Apply optimization strategy
 */
router.post('/apply-strategy', authenticateToken, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { strategy } = req.body;

    if (!['aggressive', 'balanced', 'quality'].includes(strategy)) {
      res.status(400).json({ success: false, error: 'Invalid strategy' });
      return;
    }

    await costOptimization.applyStrategy(strategy);
    res.json({ success: true, message: `${strategy} strategy applied` });
  } catch (error) {
    logger.error('Error applying strategy:', error);
    res.status(500).json({ success: false, error: 'Failed to apply strategy' });
  }
});

/**
 * Get spending by service
 */
router.get('/spending/by-service', authenticateToken, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const spending = await budgetControl.getSpendingByService();
    res.json({ success: true, data: spending });
  } catch (error) {
    logger.error('Error getting spending by service:', error);
    res.status(500).json({ success: false, error: 'Failed to get spending data' });
  }
});

/**
 * Update budget configuration
 */
router.put('/budget/config', authenticateToken, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const config = req.body;
    await budgetControl.updateConfig(config);
    res.json({ success: true, message: 'Budget configuration updated' });
  } catch (error) {
    logger.error('Error updating budget config:', error);
    res.status(500).json({ success: false, error: 'Failed to update budget configuration' });
  }
});

export default router;
