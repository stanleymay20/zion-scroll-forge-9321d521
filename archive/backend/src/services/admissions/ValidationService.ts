/**
 * ScrollUniversity Admissions - Validation Service
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Application completion validation and submission confirmation system
 */

import { PrismaClient, Application, ProgramType } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface ValidationResult {
  isValid: boolean;
  isComplete: boolean;
  completionPercentage: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingRequirements: string[];
  recommendations: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
  code: string;
}

export interface RequirementDefinition {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
  programTypes: ProgramType[];
  validationRules: ValidationRule[];
  weight: number; // For completion percentage calculation
}

export interface ValidationRule {
  type: 'REQUIRED' | 'MIN_LENGTH' | 'MAX_LENGTH' | 'FORMAT' | 'CUSTOM';
  parameter?: any;
  message: string;
}

export class ValidationService {
  private requirements: RequirementDefinition[] = [];

  constructor(private prisma: PrismaClient) {
    this.initializeRequirements();
  }

  /**
   * Initialize application requirements
   */
  private initializeRequirements(): void {
    this.requirements = [
      {
        id: 'personal-statement',
        name: 'Personal Statement',
        description: 'A comprehensive personal statement describing your background and goals',
        isRequired: true,
        programTypes: ['SCROLL_OPEN', 'SCROLL_STARTER', 'SCROLL_DEGREE', 'SCROLL_DOCTORATE', 'SCROLL_SCHOLARSHIP', 'DSGEI_PROGRAM'],
        validationRules: [
          {
            type: 'REQUIRED',
            message: 'Personal statement is required'
          },
          {
            type: 'MIN_LENGTH',
            parameter: 500,
            message: 'Personal statement must be at least 500 characters'
          },
          {
            type: 'MAX_LENGTH',
            parameter: 5000,
            message: 'Personal statement must not exceed 5000 characters'
          }
        ],
        weight: 20
      },
      {
        id: 'spiritual-testimony',
        name: 'Spiritual Testimony',
        description: 'Your personal testimony of faith and spiritual journey',
        isRequired: true,
        programTypes: ['SCROLL_OPEN', 'SCROLL_STARTER', 'SCROLL_DEGREE', 'SCROLL_DOCTORATE', 'SCROLL_SCHOLARSHIP', 'DSGEI_PROGRAM'],
        validationRules: [
          {
            type: 'REQUIRED',
            message: 'Spiritual testimony is required'
          },
          {
            type: 'MIN_LENGTH',
            parameter: 300,
            message: 'Spiritual testimony must be at least 300 characters'
          }
        ],
        weight: 25
      },
      {
        id: 'academic-history',
        name: 'Academic History',
        description: 'Complete academic background and transcripts',
        isRequired: true,
        programTypes: ['SCROLL_DEGREE', 'SCROLL_DOCTORATE', 'DSGEI_PROGRAM'],
        validationRules: [
          {
            type: 'REQUIRED',
            message: 'Academic history is required'
          },
          {
            type: 'CUSTOM',
            parameter: 'validateAcademicHistory',
            message: 'Academic history must include at least one educational institution'
          }
        ],
        weight: 20
      },
      {
        id: 'character-references',
        name: 'Character References',
        description: 'References from spiritual leaders or mentors',
        isRequired: true,
        programTypes: ['SCROLL_OPEN', 'SCROLL_STARTER', 'SCROLL_DEGREE', 'SCROLL_DOCTORATE', 'SCROLL_SCHOLARSHIP', 'DSGEI_PROGRAM'],
        validationRules: [
          {
            type: 'REQUIRED',
            message: 'Character references are required'
          },
          {
            type: 'CUSTOM',
            parameter: 'validateCharacterReferences',
            message: 'At least 2 character references are required'
          }
        ],
        weight: 15
      },
      {
        id: 'documents',
        name: 'Supporting Documents',
        description: 'Required supporting documents (transcripts, certificates, etc.)',
        isRequired: true,
        programTypes: ['SCROLL_DEGREE', 'SCROLL_DOCTORATE', 'DSGEI_PROGRAM'],
        validationRules: [
          {
            type: 'REQUIRED',
            message: 'Supporting documents are required'
          },
          {
            type: 'CUSTOM',
            parameter: 'validateDocuments',
            message: 'Required documents must be uploaded and verified'
          }
        ],
        weight: 20
      }
    ];
  }

  /**
   * Validate complete application
   */
  async validateApplication(applicationId: string): Promise<ValidationResult> {
    try {
      logger.info(`Validating application ${applicationId}`);

      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const result: ValidationResult = {
        isValid: true,
        isComplete: true,
        completionPercentage: 0,
        errors: [],
        warnings: [],
        missingRequirements: [],
        recommendations: []
      };

      // Get applicable requirements for this program
      const applicableRequirements = this.getApplicableRequirements(application.programApplied);
      
      let totalWeight = 0;
      let completedWeight = 0;

      // Validate each requirement
      for (const requirement of applicableRequirements) {
        totalWeight += requirement.weight;
        
        const requirementResult = await this.validateRequirement(application, requirement);
        
        // Merge results
        result.errors.push(...requirementResult.errors);
        result.warnings.push(...requirementResult.warnings);
        
        if (requirementResult.isComplete) {
          completedWeight += requirement.weight;
        } else {
          result.missingRequirements.push(requirement.name);
          if (requirement.isRequired) {
            result.isComplete = false;
          }
        }

        if (!requirementResult.isValid && requirement.isRequired) {
          result.isValid = false;
        }
      }

      // Calculate completion percentage
      result.completionPercentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

      // Add recommendations
      result.recommendations = this.generateRecommendations(application, result);

      // Perform cross-field validations
      await this.performCrossFieldValidations(application, result);

      logger.info(`Application ${applicationId} validation completed: ${result.completionPercentage}% complete, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      logger.error('Error validating application:', error);
      throw error;
    }
  }

  /**
   * Validate specific requirement
   */
  private async validateRequirement(
    application: Application,
    requirement: RequirementDefinition
  ): Promise<{ isValid: boolean; isComplete: boolean; errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const result = {
      isValid: true,
      isComplete: true,
      errors: [] as ValidationError[],
      warnings: [] as ValidationWarning[]
    };

    // Get field value
    const fieldValue = this.getFieldValue(application, requirement.id);

    // Apply validation rules
    for (const rule of requirement.validationRules) {
      const ruleResult = await this.applyValidationRule(fieldValue, rule, requirement);
      
      if (!ruleResult.isValid) {
        result.isValid = false;
        result.errors.push({
          field: requirement.id,
          message: ruleResult.message,
          severity: 'ERROR',
          code: `${requirement.id.toUpperCase()}_${rule.type}`
        });
      }

      if (!ruleResult.isComplete) {
        result.isComplete = false;
      }

      if (ruleResult.warning) {
        result.warnings.push({
          field: requirement.id,
          message: ruleResult.warning,
          suggestion: ruleResult.suggestion || '',
          code: `${requirement.id.toUpperCase()}_WARNING`
        });
      }
    }

    return result;
  }

  /**
   * Apply individual validation rule
   */
  private async applyValidationRule(
    value: any,
    rule: ValidationRule,
    requirement: RequirementDefinition
  ): Promise<{ isValid: boolean; isComplete: boolean; message: string; warning?: string; suggestion?: string }> {
    switch (rule.type) {
      case 'REQUIRED':
        return this.validateRequired(value, rule);
      
      case 'MIN_LENGTH':
        return this.validateMinLength(value, rule);
      
      case 'MAX_LENGTH':
        return this.validateMaxLength(value, rule);
      
      case 'FORMAT':
        return this.validateFormat(value, rule);
      
      case 'CUSTOM':
        return await this.validateCustom(value, rule, requirement);
      
      default:
        return {
          isValid: true,
          isComplete: true,
          message: ''
        };
    }
  }

  /**
   * Validate required field
   */
  private validateRequired(value: any, rule: ValidationRule): { isValid: boolean; isComplete: boolean; message: string } {
    const isEmpty = value === null || value === undefined || value === '' || 
                   (Array.isArray(value) && value.length === 0);
    
    return {
      isValid: !isEmpty,
      isComplete: !isEmpty,
      message: isEmpty ? rule.message : ''
    };
  }

  /**
   * Validate minimum length
   */
  private validateMinLength(value: any, rule: ValidationRule): { isValid: boolean; isComplete: boolean; message: string } {
    if (!value) {
      return { isValid: false, isComplete: false, message: rule.message };
    }

    const length = typeof value === 'string' ? value.length : 0;
    const isValid = length >= rule.parameter;
    
    return {
      isValid,
      isComplete: isValid,
      message: isValid ? '' : rule.message
    };
  }

  /**
   * Validate maximum length
   */
  private validateMaxLength(value: any, rule: ValidationRule): { isValid: boolean; isComplete: boolean; message: string } {
    if (!value) {
      return { isValid: true, isComplete: true, message: '' };
    }

    const length = typeof value === 'string' ? value.length : 0;
    const isValid = length <= rule.parameter;
    
    return {
      isValid,
      isComplete: true, // Max length doesn't affect completeness
      message: isValid ? '' : rule.message
    };
  }

  /**
   * Validate format
   */
  private validateFormat(value: any, rule: ValidationRule): { isValid: boolean; isComplete: boolean; message: string } {
    if (!value) {
      return { isValid: true, isComplete: true, message: '' };
    }

    const regex = new RegExp(rule.parameter);
    const isValid = regex.test(value);
    
    return {
      isValid,
      isComplete: true,
      message: isValid ? '' : rule.message
    };
  }

  /**
   * Validate custom rules
   */
  private async validateCustom(
    value: any,
    rule: ValidationRule,
    requirement: RequirementDefinition
  ): Promise<{ isValid: boolean; isComplete: boolean; message: string; warning?: string; suggestion?: string }> {
    switch (rule.parameter) {
      case 'validateAcademicHistory':
        return this.validateAcademicHistory(value);
      
      case 'validateCharacterReferences':
        return this.validateCharacterReferences(value);
      
      case 'validateDocuments':
        return this.validateDocuments(value);
      
      default:
        return {
          isValid: true,
          isComplete: true,
          message: ''
        };
    }
  }

  /**
   * Validate academic history
   */
  private validateAcademicHistory(academicHistory: any): { isValid: boolean; isComplete: boolean; message: string } {
    if (!Array.isArray(academicHistory) || academicHistory.length === 0) {
      return {
        isValid: false,
        isComplete: false,
        message: 'At least one educational institution must be provided'
      };
    }

    // Check if each entry has required fields
    for (const entry of academicHistory) {
      if (!entry.institution || !entry.degree || !entry.graduationDate) {
        return {
          isValid: false,
          isComplete: false,
          message: 'Each academic entry must include institution, degree, and graduation date'
        };
      }
    }

    return {
      isValid: true,
      isComplete: true,
      message: ''
    };
  }

  /**
   * Validate character references
   */
  private validateCharacterReferences(references: any): { isValid: boolean; isComplete: boolean; message: string; warning?: string } {
    if (!Array.isArray(references) || references.length < 2) {
      return {
        isValid: false,
        isComplete: false,
        message: 'At least 2 character references are required'
      };
    }

    // Check if each reference has required fields
    for (const reference of references) {
      if (!reference.name || !reference.relationship || !reference.contact) {
        return {
          isValid: false,
          isComplete: false,
          message: 'Each reference must include name, relationship, and contact information'
        };
      }
    }

    let warning;
    if (references.length < 3) {
      warning = 'Consider providing 3 or more references for a stronger application';
    }

    return {
      isValid: true,
      isComplete: true,
      message: '',
      warning
    };
  }

  /**
   * Validate documents
   */
  private validateDocuments(documents: any): { isValid: boolean; isComplete: boolean; message: string; suggestion?: string } {
    if (!Array.isArray(documents) || documents.length === 0) {
      return {
        isValid: false,
        isComplete: false,
        message: 'Required supporting documents must be uploaded'
      };
    }

    // Check for required document types
    const requiredTypes = ['TRANSCRIPT', 'IDENTIFICATION'];
    const uploadedTypes = documents.map((doc: any) => doc.documentType);
    
    const missingTypes = requiredTypes.filter(type => !uploadedTypes.includes(type));
    
    if (missingTypes.length > 0) {
      return {
        isValid: false,
        isComplete: false,
        message: `Missing required documents: ${missingTypes.join(', ')}`,
        suggestion: 'Please upload all required document types'
      };
    }

    return {
      isValid: true,
      isComplete: true,
      message: ''
    };
  }

  /**
   * Get field value from application
   */
  private getFieldValue(application: Application, fieldId: string): any {
    switch (fieldId) {
      case 'personal-statement':
        return application.personalStatement;
      case 'spiritual-testimony':
        return application.spiritualTestimony;
      case 'academic-history':
        return application.academicHistory;
      case 'character-references':
        return application.characterReferences;
      case 'documents':
        return application.documents;
      default:
        return null;
    }
  }

  /**
   * Get applicable requirements for program type
   */
  private getApplicableRequirements(programType: ProgramType): RequirementDefinition[] {
    return this.requirements.filter(req => req.programTypes.includes(programType));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(application: Application, result: ValidationResult): string[] {
    const recommendations: string[] = [];

    // Based on completion percentage
    if (result.completionPercentage < 50) {
      recommendations.push('Focus on completing the required sections first');
    } else if (result.completionPercentage < 80) {
      recommendations.push('You\'re making good progress! Complete the remaining sections to submit your application');
    }

    // Based on missing requirements
    if (result.missingRequirements.includes('Personal Statement')) {
      recommendations.push('A compelling personal statement is crucial for your application success');
    }

    if (result.missingRequirements.includes('Spiritual Testimony')) {
      recommendations.push('Your spiritual testimony helps us understand your faith journey and calling');
    }

    // Based on warnings
    if (result.warnings.some(w => w.field === 'character-references')) {
      recommendations.push('Additional character references can strengthen your application');
    }

    return recommendations;
  }

  /**
   * Perform cross-field validations
   */
  private async performCrossFieldValidations(application: Application, result: ValidationResult): Promise<void> {
    // Check consistency between personal statement and spiritual testimony
    if (application.personalStatement && application.spiritualTestimony) {
      const personalLength = application.personalStatement.length;
      const testimonyLength = application.spiritualTestimony.length;
      
      if (personalLength > testimonyLength * 3) {
        result.warnings.push({
          field: 'spiritual-testimony',
          message: 'Your spiritual testimony seems brief compared to your personal statement',
          suggestion: 'Consider expanding your spiritual testimony to provide more depth',
          code: 'TESTIMONY_LENGTH_WARNING'
        });
      }
    }

    // Check if academic history matches program requirements
    if (application.programApplied === 'SCROLL_DOCTORATE' && application.academicHistory) {
      const hasAdvancedDegree = (application.academicHistory as any[]).some(
        entry => entry.degree && (entry.degree.includes('Master') || entry.degree.includes('PhD'))
      );
      
      if (!hasAdvancedDegree) {
        result.warnings.push({
          field: 'academic-history',
          message: 'Doctorate programs typically require a master\'s degree',
          suggestion: 'Ensure your academic background meets the program prerequisites',
          code: 'ACADEMIC_PREREQUISITE_WARNING'
        });
      }
    }
  }

  /**
   * Quick validation check (for real-time feedback)
   */
  async quickValidate(applicationId: string, field: string): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const requirement = this.requirements.find(req => req.id === field);
      if (!requirement) {
        return { isValid: true, errors: [], suggestions: [] };
      }

      const requirementResult = await this.validateRequirement(application, requirement);
      
      return {
        isValid: requirementResult.isValid,
        errors: requirementResult.errors.map(e => e.message),
        suggestions: requirementResult.warnings.map(w => w.suggestion).filter(Boolean)
      };

    } catch (error) {
      logger.error('Error in quick validation:', error);
      throw error;
    }
  }

  /**
   * Get validation summary for dashboard
   */
  async getValidationSummary(applicationId: string): Promise<{
    completionPercentage: number;
    requiredFieldsComplete: number;
    totalRequiredFields: number;
    criticalErrors: number;
    warnings: number;
  }> {
    try {
      const result = await this.validateApplication(applicationId);
      
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const applicableRequirements = this.getApplicableRequirements(application.programApplied);
      const requiredFields = applicableRequirements.filter(req => req.isRequired);
      const completedRequiredFields = requiredFields.length - result.missingRequirements.length;

      return {
        completionPercentage: result.completionPercentage,
        requiredFieldsComplete: completedRequiredFields,
        totalRequiredFields: requiredFields.length,
        criticalErrors: result.errors.filter(e => e.severity === 'ERROR').length,
        warnings: result.warnings.length
      };

    } catch (error) {
      logger.error('Error getting validation summary:', error);
      throw error;
    }
  }
}