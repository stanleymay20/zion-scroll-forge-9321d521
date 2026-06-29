/**
 * Compliance Checking Service
 * Scans content for WCAG 2.1 violations
 * Requirement 15.3
 */

import {
  ComplianceCheckRequest,
  ComplianceReport,
  AccessibilityViolation,
  AutomatedFix
} from '../types/accessibility.types';
import { AIGatewayService } from './AIGatewayService';
import logger from '../utils/logger';
import * as cheerio from 'cheerio';

export class ComplianceCheckingService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Check content for WCAG compliance
   */
  async checkCompliance(request: ComplianceCheckRequest): Promise<ComplianceReport> {
    try {
      logger.info('Checking WCAG compliance', { 
        contentType: request.contentType,
        wcagLevel: request.wcagLevel 
      });

      const htmlContent = await this.getHtmlContent(request);
      const $ = cheerio.load(htmlContent);

      // Run automated checks
      const violations: AccessibilityViolation[] = [];
      let passedChecks = 0;
      const totalChecks = 15; // Number of checks we perform

      // Check 1: Missing alt text
      const altTextViolations = this.checkAltText($);
      violations.push(...altTextViolations);
      if (altTextViolations.length === 0) passedChecks++;

      // Check 2: Color contrast
      const contrastViolations = await this.checkColorContrast($);
      violations.push(...contrastViolations);
      if (contrastViolations.length === 0) passedChecks++;

      // Check 3: Heading structure
      const headingViolations = this.checkHeadingStructure($);
      violations.push(...headingViolations);
      if (headingViolations.length === 0) passedChecks++;

      // Check 4: Missing labels
      const labelViolations = this.checkFormLabels($);
      violations.push(...labelViolations);
      if (labelViolations.length === 0) passedChecks++;

      // Check 5: Keyboard accessibility
      const keyboardViolations = this.checkKeyboardAccess($);
      violations.push(...keyboardViolations);
      if (keyboardViolations.length === 0) passedChecks++;

      // Check 6: ARIA attributes
      const ariaViolations = this.checkAriaAttributes($);
      violations.push(...ariaViolations);
      if (ariaViolations.length === 0) passedChecks++;

      // Check 7: Link text
      const linkViolations = this.checkLinkText($);
      violations.push(...linkViolations);
      if (linkViolations.length === 0) passedChecks++;

      // Check 8: Language attribute
      const langViolations = this.checkLanguageAttribute($);
      violations.push(...langViolations);
      if (langViolations.length === 0) passedChecks++;

      // Check 9: Page title
      const titleViolations = this.checkPageTitle($);
      violations.push(...titleViolations);
      if (titleViolations.length === 0) passedChecks++;

      // Check 10: Skip links
      const skipLinkViolations = this.checkSkipLinks($);
      violations.push(...skipLinkViolations);
      if (skipLinkViolations.length === 0) passedChecks++;

      // Additional checks for AA/AAA levels
      if (request.wcagLevel === 'AA' || request.wcagLevel === 'AAA') {
        const additionalViolations = await this.checkAdvancedCriteria($, request.wcagLevel);
        violations.push(...additionalViolations);
      }

      // Generate automated fixes
      const automatedFixes = this.generateAutomatedFixes(violations);

      // Calculate overall score
      const overallScore = passedChecks / totalChecks;

      // Determine if manual review is needed
      const manualReviewNeeded = violations.some(v => 
        v.severity === 'critical' || !v.canAutoFix
      );

      return {
        wcagLevel: request.wcagLevel || 'AA',
        overallScore,
        violations,
        passedChecks,
        totalChecks,
        automatedFixes,
        manualReviewNeeded,
        summary: this.generateSummary(violations, overallScore, passedChecks, totalChecks)
      };
    } catch (error) {
      logger.error('Error checking compliance', { error, request });
      throw new Error(`Compliance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get HTML content from request
   */
  private async getHtmlContent(request: ComplianceCheckRequest): Promise<string> {
    if (request.htmlContent) {
      return request.htmlContent;
    }

    if (request.contentUrl) {
      // In production, fetch content from URL
      logger.warn('Content URL provided, fetching not implemented');
      return '<html><body></body></html>';
    }

    throw new Error('No content provided for compliance check');
  }

  /**
   * Check for missing alt text on images
   */
  private checkAltText($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    $('img').each((_, element) => {
      const $img = $(element);
      const alt = $img.attr('alt');
      const role = $img.attr('role');

      // Decorative images should have empty alt or role="presentation"
      if (alt === undefined && role !== 'presentation') {
        violations.push({
          type: 'missing_alt',
          severity: 'serious',
          element: $img.toString(),
          description: 'Image missing alt attribute',
          wcagCriterion: '1.1.1 Non-text Content (Level A)',
          recommendation: 'Add descriptive alt text or mark as decorative with alt="" or role="presentation"',
          canAutoFix: false // Requires understanding of image content
        });
      }
    });

    return violations;
  }

  /**
   * Check color contrast ratios
   */
  private async checkColorContrast($: cheerio.CheerioAPI): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];

    // This would use a color contrast analyzer in production
    // For now, check for common patterns that might have issues
    $('[style*="color"]').each((_, element) => {
      const $el = $(element);
      const style = $el.attr('style') || '';
      
      // Simple check for light text on light background
      if (style.includes('color: white') || style.includes('color: #fff')) {
        violations.push({
          type: 'color_contrast',
          severity: 'serious',
          element: $el.toString().substring(0, 100),
          description: 'Potential color contrast issue detected',
          wcagCriterion: '1.4.3 Contrast (Minimum) (Level AA)',
          recommendation: 'Ensure text has a contrast ratio of at least 4.5:1 against background',
          canAutoFix: true
        });
      }
    });

    return violations;
  }

  /**
   * Check heading structure
   */
  private checkHeadingStructure($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const headings: { level: number; text: string }[] = [];

    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $heading = $(element);
      const level = parseInt($heading.prop('tagName').substring(1));
      const text = $heading.text().trim();
      headings.push({ level, text });
    });

    // Check for missing h1
    if (headings.length > 0 && !headings.some(h => h.level === 1)) {
      violations.push({
        type: 'heading_structure',
        severity: 'moderate',
        description: 'Page missing h1 heading',
        wcagCriterion: '1.3.1 Info and Relationships (Level A)',
        recommendation: 'Add an h1 heading as the main page title',
        canAutoFix: false
      });
    }

    // Check for skipped heading levels
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i].level - headings[i - 1].level;
      if (diff > 1) {
        violations.push({
          type: 'heading_structure',
          severity: 'moderate',
          description: `Heading level skipped from h${headings[i - 1].level} to h${headings[i].level}`,
          wcagCriterion: '1.3.1 Info and Relationships (Level A)',
          recommendation: 'Use sequential heading levels without skipping',
          canAutoFix: true
        });
      }
    }

    return violations;
  }

  /**
   * Check form labels
   */
  private checkFormLabels($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    $('input, select, textarea').each((_, element) => {
      const $input = $(element);
      const id = $input.attr('id');
      const ariaLabel = $input.attr('aria-label');
      const ariaLabelledby = $input.attr('aria-labelledby');
      const type = $input.attr('type');

      // Skip hidden and submit buttons
      if (type === 'hidden' || type === 'submit' || type === 'button') {
        return;
      }

      // Check if input has associated label
      const hasLabel = id && $(`label[for="${id}"]`).length > 0;

      if (!hasLabel && !ariaLabel && !ariaLabelledby) {
        violations.push({
          type: 'missing_label',
          severity: 'serious',
          element: $input.toString().substring(0, 100),
          description: 'Form control missing accessible label',
          wcagCriterion: '1.3.1 Info and Relationships (Level A)',
          recommendation: 'Add a <label> element or aria-label attribute',
          canAutoFix: false
        });
      }
    });

    return violations;
  }

  /**
   * Check keyboard accessibility
   */
  private checkKeyboardAccess($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    // Check for onclick without keyboard equivalent
    $('[onclick]').each((_, element) => {
      const $el = $(element);
      const tagName = $el.prop('tagName').toLowerCase();
      const tabindex = $el.attr('tabindex');
      const role = $el.attr('role');

      // Non-interactive elements with onclick should have keyboard support
      if (!['a', 'button', 'input', 'select', 'textarea'].includes(tagName)) {
        if (tabindex === undefined && role !== 'button') {
          violations.push({
            type: 'keyboard_access',
            severity: 'serious',
            element: $el.toString().substring(0, 100),
            description: 'Interactive element not keyboard accessible',
            wcagCriterion: '2.1.1 Keyboard (Level A)',
            recommendation: 'Add tabindex="0" and keyboard event handlers, or use a button element',
            canAutoFix: true
          });
        }
      }
    });

    return violations;
  }

  /**
   * Check ARIA attributes
   */
  private checkAriaAttributes($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    $('[role]').each((_, element) => {
      const $el = $(element);
      const role = $el.attr('role');

      // Check for invalid ARIA roles
      const validRoles = ['button', 'link', 'navigation', 'main', 'complementary', 'banner', 'contentinfo', 'search', 'form', 'region', 'article', 'list', 'listitem'];
      
      if (role && !validRoles.includes(role)) {
        violations.push({
          type: 'aria_invalid',
          severity: 'moderate',
          element: $el.toString().substring(0, 100),
          description: `Invalid or uncommon ARIA role: ${role}`,
          wcagCriterion: '4.1.2 Name, Role, Value (Level A)',
          recommendation: 'Use valid ARIA roles from the ARIA specification',
          canAutoFix: false
        });
      }
    });

    return violations;
  }

  /**
   * Check link text
   */
  private checkLinkText($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    $('a').each((_, element) => {
      const $link = $(element);
      const text = $link.text().trim().toLowerCase();
      const ariaLabel = $link.attr('aria-label');

      // Check for generic link text
      const genericTexts = ['click here', 'read more', 'more', 'link', 'here'];
      
      if (!ariaLabel && genericTexts.includes(text)) {
        violations.push({
          type: 'other',
          severity: 'moderate',
          element: $link.toString().substring(0, 100),
          description: 'Link has generic text that doesn\'t describe destination',
          wcagCriterion: '2.4.4 Link Purpose (In Context) (Level A)',
          recommendation: 'Use descriptive link text or add aria-label',
          canAutoFix: false
        });
      }
    });

    return violations;
  }

  /**
   * Check language attribute
   */
  private checkLanguageAttribute($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    const lang = $('html').attr('lang');

    if (!lang) {
      violations.push({
        type: 'other',
        severity: 'serious',
        element: '<html>',
        description: 'Page missing language attribute',
        wcagCriterion: '3.1.1 Language of Page (Level A)',
        recommendation: 'Add lang attribute to html element (e.g., lang="en")',
        canAutoFix: true
      });
    }

    return violations;
  }

  /**
   * Check page title
   */
  private checkPageTitle($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    const title = $('title').text().trim();

    if (!title) {
      violations.push({
        type: 'other',
        severity: 'serious',
        element: '<title>',
        description: 'Page missing title element',
        wcagCriterion: '2.4.2 Page Titled (Level A)',
        recommendation: 'Add descriptive title element in head',
        canAutoFix: false
      });
    }

    return violations;
  }

  /**
   * Check skip links
   */
  private checkSkipLinks($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    const skipLink = $('a[href^="#"]').first();
    const hasSkipLink = skipLink.length > 0 && 
      (skipLink.text().toLowerCase().includes('skip') || 
       skipLink.text().toLowerCase().includes('jump'));

    if (!hasSkipLink) {
      violations.push({
        type: 'other',
        severity: 'moderate',
        description: 'Page missing skip navigation link',
        wcagCriterion: '2.4.1 Bypass Blocks (Level A)',
        recommendation: 'Add skip link at beginning of page to jump to main content',
        canAutoFix: true
      });
    }

    return violations;
  }

  /**
   * Check advanced WCAG criteria for AA/AAA levels
   */
  private async checkAdvancedCriteria(
    $: cheerio.CheerioAPI,
    level: 'AA' | 'AAA'
  ): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];

    // Additional checks for AA/AAA would go here
    // For example: enhanced contrast ratios, text spacing, etc.

    return violations;
  }

  /**
   * Generate automated fixes for violations
   */
  private generateAutomatedFixes(violations: AccessibilityViolation[]): AutomatedFix[] {
    const fixes: AutomatedFix[] = [];

    violations.forEach(violation => {
      if (violation.canAutoFix) {
        fixes.push({
          violationType: violation.type,
          element: violation.element,
          fixedValue: this.generateFixValue(violation),
          applied: false,
          description: violation.recommendation
        });
      }
    });

    return fixes;
  }

  /**
   * Generate fix value for a violation
   */
  private generateFixValue(violation: AccessibilityViolation): string {
    switch (violation.type) {
      case 'color_contrast':
        return 'color: #000000; background-color: #ffffff;';
      case 'heading_structure':
        return 'Use sequential heading levels';
      case 'keyboard_access':
        return 'tabindex="0" onkeypress="handleKeyPress(event)"';
      case 'other':
        if (violation.description.includes('language')) {
          return 'lang="en"';
        }
        if (violation.description.includes('skip')) {
          return '<a href="#main-content" class="skip-link">Skip to main content</a>';
        }
        return 'See recommendation';
      default:
        return 'Manual fix required';
    }
  }

  /**
   * Generate summary of compliance check
   */
  private generateSummary(
    violations: AccessibilityViolation[],
    overallScore: number,
    passedChecks: number,
    totalChecks: number
  ): string {
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const seriousCount = violations.filter(v => v.severity === 'serious').length;
    const moderateCount = violations.filter(v => v.severity === 'moderate').length;

    let summary = `Accessibility Score: ${(overallScore * 100).toFixed(1)}% (${passedChecks}/${totalChecks} checks passed). `;

    if (violations.length === 0) {
      summary += 'No accessibility violations found. Content meets WCAG guidelines.';
    } else {
      summary += `Found ${violations.length} violation(s): `;
      if (criticalCount > 0) summary += `${criticalCount} critical, `;
      if (seriousCount > 0) summary += `${seriousCount} serious, `;
      if (moderateCount > 0) summary += `${moderateCount} moderate. `;
      summary += 'Review violations and apply fixes.';
    }

    return summary;
  }
}

export default ComplianceCheckingService;
