/**
 * Architecture Comparison API Routes
 * Task 2.3: Build architecture comparison visualization system
 * Requirements: 1.3, 1.4 - API endpoints for scalability metrics and technical reports
 */

import express from 'express';
import { ArchitectureComparisonVisualizationService } from '../../../src/services/ArchitectureComparisonVisualizationService';
import { CompetitiveAnalysisEngine } from '../../../src/services/CompetitiveAnalysisEngine';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const visualizationService = new ArchitectureComparisonVisualizationService();
const analysisEngine = new CompetitiveAnalysisEngine();

/**
 * GET /api/architecture-comparison/visualization
 * Generate architecture comparison visualization
 */
router.get('/visualization', authMiddleware, async (req, res) => {
  try {
    const {
      analysisId,
      comparisonType = 'side-by-side',
      includeSpiritual = 'true',
      focusAreas
    } = req.query;

    // Get or generate competitive analysis
    let analysis;
    if (analysisId && typeof analysisId === 'string') {
      analysis = await analysisEngine.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }
    } else {
      analysis = await analysisEngine.generateCompetitiveAnalysis();
    }

    // Parse focus areas
    const parsedFocusAreas = focusAreas ? 
      (typeof focusAreas === 'string' ? focusAreas.split(',') : focusAreas) : 
      [];

    // Generate visualization
    const visualization = await visualizationService.generateArchitectureVisualization(analysis, {
      comparisonType: comparisonType as 'side-by-side' | 'overlay' | 'matrix',
      includeSpiritual: includeSpiritual === 'true',
      focusAreas: parsedFocusAreas as string[]
    });

    res.json({
      success: true,
      data: visualization
    });
  } catch (error) {
    console.error('Error generating architecture visualization:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate visualization'
    });
  }
});

/**
 * GET /api/architecture-comparison/visualization/:id
 * Get existing visualization by ID
 */
router.get('/visualization/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const visualization = await visualizationService.getVisualization(id);
    
    if (!visualization) {
      return res.status(404).json({
        success: false,
        error: 'Visualization not found'
      });
    }

    res.json({
      success: true,
      data: visualization
    });
  } catch (error) {
    console.error('Error retrieving visualization:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve visualization'
    });
  }
});

/**
 * PUT /api/architecture-comparison/visualization/:id
 * Update existing visualization
 */
router.put('/visualization/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { analysisId, options } = req.body;

    // Get analysis for update
    let analysis;
    if (analysisId) {
      analysis = await analysisEngine.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }
    } else {
      analysis = await analysisEngine.generateCompetitiveAnalysis();
    }

    // Update visualization
    const updatedVisualization = await visualizationService.updateVisualization(id, analysis, options);

    res.json({
      success: true,
      data: updatedVisualization
    });
  } catch (error) {
    console.error('Error updating visualization:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update visualization'
    });
  }
});

/**
 * GET /api/architecture-comparison/scalability-metrics
 * Get detailed scalability comparison metrics
 */
router.get('/scalability-metrics', authMiddleware, async (req, res) => {
  try {
    const { analysisId } = req.query;

    // Get analysis
    let analysis;
    if (analysisId && typeof analysisId === 'string') {
      analysis = await analysisEngine.getAnalysis(analysisId);
    } else {
      analysis = await analysisEngine.generateCompetitiveAnalysis();
    }

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    // Generate visualization to get scalability metrics
    const visualization = await visualizationService.generateArchitectureVisualization(analysis);

    res.json({
      success: true,
      data: {
        scalabilityComparison: visualization.scalabilityComparison,
        technicalDetails: {
          scrollUniversity: visualization.scalabilityComparison.technicalDetails.scrollUniversity,
          learnTubeAI: visualization.scalabilityComparison.technicalDetails.learnTubeAI
        },
        keyDifferentiators: visualization.scalabilityComparison.keyDifferentiators,
        overallWinner: visualization.scalabilityComparison.overallWinner
      }
    });
  } catch (error) {
    console.error('Error retrieving scalability metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve scalability metrics'
    });
  }
});

/**
 * GET /api/architecture-comparison/integration-capabilities
 * Get detailed integration comparison metrics
 */
router.get('/integration-capabilities', authMiddleware, async (req, res) => {
  try {
    const { analysisId } = req.query;

    // Get analysis
    let analysis;
    if (analysisId && typeof analysisId === 'string') {
      analysis = await analysisEngine.getAnalysis(analysisId);
    } else {
      analysis = await analysisEngine.generateCompetitiveAnalysis();
    }

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    // Generate visualization to get integration metrics
    const visualization = await visualizationService.generateArchitectureVisualization(analysis);

    res.json({
      success: true,
      data: {
        integrationComparison: visualization.integrationComparison,
        technicalDetails: {
          scrollUniversity: visualization.integrationComparison.technicalDetails.scrollUniversity,
          learnTubeAI: visualization.integrationComparison.technicalDetails.learnTubeAI
        },
        keyDifferentiators: visualization.integrationComparison.keyDifferentiators,
        overallWinner: visualization.integrationComparison.overallWinner
      }
    });
  } catch (error) {
    console.error('Error retrieving integration capabilities:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve integration capabilities'
    });
  }
});

/**
 * GET /api/architecture-comparison/technical-superiority-report
 * Generate technical superiority report
 */
router.get('/technical-superiority-report', authMiddleware, async (req, res) => {
  try {
    const { analysisId, format = 'json' } = req.query;

    // Get analysis
    let analysis;
    if (analysisId && typeof analysisId === 'string') {
      analysis = await analysisEngine.getAnalysis(analysisId);
    } else {
      analysis = await analysisEngine.generateCompetitiveAnalysis();
    }

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    // Generate visualization to get technical superiority report
    const visualization = await visualizationService.generateArchitectureVisualization(analysis);

    if (format === 'json') {
      res.json({
        success: true,
        data: {
          report: visualization.technicalSuperiorityReport,
          generatedAt: visualization.generatedAt,
          analysisId: analysis.id
        }
      });
    } else {
      // Export in requested format
      const exportData = await visualizationService.exportVisualization(
        visualization.id,
        format as 'json' | 'png' | 'svg' | 'pdf'
      );

      const contentTypes = {
        pdf: 'application/pdf',
        png: 'image/png',
        svg: 'image/svg+xml',
        json: 'application/json'
      };

      res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes] || 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="technical-superiority-report.${format}"`);
      res.send(exportData);
    }
  } catch (error) {
    console.error('Error generating technical superiority report:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate technical superiority report'
    });
  }
});

/**
 * GET /api/architecture-comparison/side-by-side/:platform1/:platform2
 * Generate side-by-side comparison for specific platforms
 */
router.get('/side-by-side/:platform1/:platform2', authMiddleware, async (req, res) => {
  try {
    const { platform1, platform2 } = req.params;
    const { includeSpiritual = 'true', focusAreas } = req.query;

    // Validate platform names
    const validPlatforms = ['scrolluniversity', 'learntube_ai'];
    if (!validPlatforms.includes(platform1) || !validPlatforms.includes(platform2)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform names. Use: scrolluniversity, learntube_ai'
      });
    }

    // Generate analysis
    const analysis = await analysisEngine.generateCompetitiveAnalysis();

    // Parse focus areas
    const parsedFocusAreas = focusAreas ? 
      (typeof focusAreas === 'string' ? focusAreas.split(',') : focusAreas) : 
      [];

    // Generate side-by-side visualization
    const visualization = await visualizationService.generateArchitectureVisualization(analysis, {
      comparisonType: 'side-by-side',
      includeSpiritual: includeSpiritual === 'true',
      focusAreas: parsedFocusAreas as string[]
    });

    // Extract platform-specific data
    const platformData = {
      [platform1]: visualization.platforms[platform1 as keyof typeof visualization.platforms],
      [platform2]: visualization.platforms[platform2 as keyof typeof visualization.platforms]
    };

    res.json({
      success: true,
      data: {
        platforms: platformData,
        comparisonType: 'side-by-side',
        scalabilityComparison: visualization.scalabilityComparison,
        integrationComparison: visualization.integrationComparison,
        technicalSuperiorityReport: visualization.technicalSuperiorityReport,
        visualizationData: visualization.visualizationData,
        generatedAt: visualization.generatedAt
      }
    });
  } catch (error) {
    console.error('Error generating side-by-side comparison:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate side-by-side comparison'
    });
  }
});

/**
 * POST /api/architecture-comparison/export
 * Export visualization in various formats
 */
router.post('/export', authMiddleware, async (req, res) => {
  try {
    const { visualizationId, format = 'json', options = {} } = req.body;

    if (!visualizationId) {
      return res.status(400).json({
        success: false,
        error: 'Visualization ID is required'
      });
    }

    // Export visualization
    const exportData = await visualizationService.exportVisualization(visualizationId, format);

    const contentTypes = {
      json: 'application/json',
      pdf: 'application/pdf',
      png: 'image/png',
      svg: 'image/svg+xml'
    };

    res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes] || 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="architecture-comparison.${format}"`);
    res.send(exportData);
  } catch (error) {
    console.error('Error exporting visualization:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export visualization'
    });
  }
});

/**
 * DELETE /api/architecture-comparison/cache
 * Clear visualization cache
 */
router.delete('/cache', authMiddleware, async (req, res) => {
  try {
    visualizationService.clearCache();
    analysisEngine.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache'
    });
  }
});

/**
 * GET /api/architecture-comparison/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'Architecture Comparison Visualization',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Service unhealthy'
    });
  }
});

export default router;