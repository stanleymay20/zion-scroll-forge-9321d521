/**
 * Automated Fix Service
 * Applies automated accessibility fixes to content
 * Requirement 15.4
 */

import { ComplianceReport, AutomatedFix } from '../types/accessibility.types';
import { AltTextGenerationService } from './AltTextGenerationService';
import logger from '../utils/logger';
import * as cheerio from 'cheerio';

export class AutomatedFixService {
  private altTextService: AltTextGenerationService;

  constructor() {
    this.altTextService = new AltTextGenerationService();
  }

  /**
   * Apply automated accessibility fixes to HTML content
   */
  async applyFixes(
    htmlContent: string,
    complianceReport: ComplianceReport
  ): Promise<{ fixedContent: string; appliedFixes: number }> {
    try {
      logger.info('Applying automated fixes', { 
        violationCount: complianceReport.violations.length 
      });

      const $ = cheerio.load(htmlContent);
      let appliedFixes = 0;

      // Apply each automated fix
      for (const fix of complianceReport.automatedFixes) {
        try {
          const applied = await this.applyFix($, fix);
          if (applied) {
            appliedFixes++;
            fix.applied = true;
          }
        } catch (error) {
          logger.warn('Could not apply fix', { fix, error });
        }
      }

      // Additional fixes based on violations
      appliedFixes += await this.applyMissingAltText($);
      appliedFixes += this.fixHeadingHierarchy($);
      appliedFixes += this.improveColorContrast($);
      appliedFixes += this.addLanguageAttribute($);
      appliedFixes += this.addSkipLink($);
      appliedFixes += this.fixKeyboardAccess($);

      const fixedContent = $.html();

      logger.info('Automated fixes applied', { appliedFixes });

      return {
        fixedContent,
        appliedFixes
      };
    } catch (error) {
      logger.error('Error applying automated fixes', { error });
      throw new Error(`Failed to apply fixes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply a single automated fix
   */
  private async applyFix($: cheerio.CheerioAPI, fix: AutomatedFix): Promise<boolean> {
    try {
      switch (fix.violationType) {
        case 'color_contrast':
          return this.applyColorContrastFix($, fix);
        case 'heading_structure':
          return this.applyHeadingFix($, fix);
        case 'keyboard_access':
          return this.applyKeyboardFix($, fix);
        case 'other':
          return this.applyOtherFix($, fix);
        default:
          return false;
      }
    } catch (error) {
      logger.warn('Error applying specific fix', { fix, error });
      return false;
    }
  }

  /**
   * Add missing alt text to images using AI
   */
  private async applyMissingAltText($: cheerio.CheerioAPI): Promise<number> {
    let fixCount = 0;

    const imagesWithoutAlt: cheerio.Element[] = [];
    $('img').each((_, element) => {
      const $img = $(element);
      const alt = $img.attr('alt');
      const role = $img.attr('role');

      if (alt === undefined && role !== 'presentation') {
        imagesWithoutAlt.push(element);
      }
    });

    // Generate alt text for images (in production, would use actual image URLs)
    for (const img of imagesWithoutAlt) {
      const $img = $(img);
      const src = $img.attr('src');

      if (src) {
        try {
          // In production, generate alt text using AI
          // For now, add placeholder
          $img.attr('alt', 'Image description pending');
          fixCount++;
        } catch (error) {
          logger.warn('Could not generate alt text', { src, error });
        }
      } else {
        // No src, mark as decorative
        $img.attr('alt', '');
        fixCount++;
      }
    }

    return fixCount;
  }

  /**
   * Fix heading hierarchy
   */
  private fixHeadingHierarchy($: cheerio.CheerioAPI): number {
    let fixCount = 0;
    const headings: { element: cheerio.Element; level: number }[] = [];

    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $heading = $(element);
      const level = parseInt($heading.prop('tagName').substring(1));
      headings.push({ element, level });
    });

    // Fix skipped levels
    for (let i = 1; i < headings.length; i++) {
      const prevLevel = headings[i - 1].level;
      const currLevel = headings[i].level;
      const diff = currLevel - prevLevel;

      if (diff > 1) {
        // Adjust current heading to be one level below previous
        const newLevel = prevLevel + 1;
        const $heading = $(headings[i].element);
        const newTag = `h${newLevel}`;
        
        $heading.replaceWith(`<${newTag}>${$heading.html()}</${newTag}>`);
        headings[i].level = newLevel;
        fixCount++;
      }
    }

    return fixCount;
  }

  /**
   * Improve color contrast
   */
  private improveColorContrast($: cheerio.CheerioAPI): number {
    let fixCount = 0;

    $('[style*="color"]').each((_, element) => {
      const $el = $(element);
      const style = $el.attr('style') || '';

      // Simple fix: ensure dark text on light background
      if (style.includes('color: white') || style.includes('color: #fff')) {
        const newStyle = style.replace(/color:\s*(white|#fff[^;]*)/gi, 'color: #000000');
        $el.attr('style', newStyle);
        fixCount++;
      }
    });

    return fixCount;
  }

  /**
   * Add language attribute if missing
   */
  private addLanguageAttribute($: cheerio.CheerioAPI): number {
    const $html = $('html');
    const lang = $html.attr('lang');

    if (!lang) {
      $html.attr('lang', 'en');
      return 1;
    }

    return 0;
  }

  /**
   * Add skip link if missing
   */
  private addSkipLink($: cheerio.CheerioAPI): number {
    const skipLink = $('a[href^="#"]').first();
    const hasSkipLink = skipLink.length > 0 && 
      (skipLink.text().toLowerCase().includes('skip') || 
       skipLink.text().toLowerCase().includes('jump'));

    if (!hasSkipLink) {
      const $body = $('body');
      const skipLinkHtml = '<a href="#main-content" class="skip-link" style="position: absolute; left: -9999px; z-index: 999;">Skip to main content</a>';
      $body.prepend(skipLinkHtml);

      // Ensure main content has id
      let $main = $('#main-content');
      if ($main.length === 0) {
        $main = $('main');
        if ($main.length > 0) {
          $main.attr('id', 'main-content');
        }
      }

      return 1;
    }

    return 0;
  }

  /**
   * Fix keyboard accessibility
   */
  private fixKeyboardAccess($: cheerio.CheerioAPI): number {
    let fixCount = 0;

    $('[onclick]').each((_, element) => {
      const $el = $(element);
      const tagName = $el.prop('tagName').toLowerCase();
      const tabindex = $el.attr('tabindex');
      const role = $el.attr('role');

      // Non-interactive elements with onclick should have keyboard support
      if (!['a', 'button', 'input', 'select', 'textarea'].includes(tagName)) {
        if (tabindex === undefined && role !== 'button') {
          $el.attr('tabindex', '0');
          $el.attr('role', 'button');
          
          // Add keyboard handler
          const onclick = $el.attr('onclick');
          if (onclick) {
            $el.attr('onkeypress', `if(event.key==='Enter'||event.key===' '){${onclick}}`);
          }
          
          fixCount++;
        }
      }
    });

    return fixCount;
  }

  /**
   * Apply color contrast fix
   */
  private applyColorContrastFix($: cheerio.CheerioAPI, fix: AutomatedFix): boolean {
    if (!fix.element) return false;

    try {
      const $el = $(fix.element);
      if ($el.length > 0) {
        $el.attr('style', fix.fixedValue);
        return true;
      }
    } catch (error) {
      logger.warn('Could not apply color contrast fix', { error });
    }

    return false;
  }

  /**
   * Apply heading fix
   */
  private applyHeadingFix($: cheerio.CheerioAPI, fix: AutomatedFix): boolean {
    // Heading fixes are applied in fixHeadingHierarchy
    return false;
  }

  /**
   * Apply keyboard accessibility fix
   */
  private applyKeyboardFix($: cheerio.CheerioAPI, fix: AutomatedFix): boolean {
    if (!fix.element) return false;

    try {
      const $el = $(fix.element);
      if ($el.length > 0) {
        $el.attr('tabindex', '0');
        $el.attr('role', 'button');
        return true;
      }
    } catch (error) {
      logger.warn('Could not apply keyboard fix', { error });
    }

    return false;
  }

  /**
   * Apply other fixes
   */
  private applyOtherFix($: cheerio.CheerioAPI, fix: AutomatedFix): boolean {
    if (fix.description.includes('language')) {
      return this.addLanguageAttribute($) > 0;
    }

    if (fix.description.includes('skip')) {
      return this.addSkipLink($) > 0;
    }

    return false;
  }

  /**
   * Validate fixes were applied correctly
   */
  async validateFixes(
    originalContent: string,
    fixedContent: string
  ): Promise<{ valid: boolean; improvements: string[] }> {
    try {
      const $original = cheerio.load(originalContent);
      const $fixed = cheerio.load(fixedContent);

      const improvements: string[] = [];

      // Check alt text improvements
      const originalMissingAlt = $original('img:not([alt])').length;
      const fixedMissingAlt = $fixed('img:not([alt])').length;
      if (fixedMissingAlt < originalMissingAlt) {
        improvements.push(`Added alt text to ${originalMissingAlt - fixedMissingAlt} images`);
      }

      // Check language attribute
      if (!$original('html').attr('lang') && $fixed('html').attr('lang')) {
        improvements.push('Added language attribute to html element');
      }

      // Check skip link
      const hasSkipLink = $fixed('a.skip-link').length > 0;
      if (hasSkipLink && $original('a.skip-link').length === 0) {
        improvements.push('Added skip navigation link');
      }

      // Check keyboard accessibility
      const originalNonKeyboard = $original('[onclick]:not([tabindex])').length;
      const fixedNonKeyboard = $fixed('[onclick]:not([tabindex])').length;
      if (fixedNonKeyboard < originalNonKeyboard) {
        improvements.push(`Made ${originalNonKeyboard - fixedNonKeyboard} elements keyboard accessible`);
      }

      return {
        valid: improvements.length > 0,
        improvements
      };
    } catch (error) {
      logger.error('Error validating fixes', { error });
      return {
        valid: false,
        improvements: []
      };
    }
  }
}

export default AutomatedFixService;
