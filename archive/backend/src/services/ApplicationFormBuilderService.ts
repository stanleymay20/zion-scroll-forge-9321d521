/**
 * ScrollUniversity Application Form Builder Service
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Dynamic form builder for creating customizable application forms
 */

import { PrismaClient, ProgramType } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ApplicationFormTemplate,
  FormSection,
  DynamicFormField,
  ApplicationFormData,
  FieldValidation
} from '../types/admissions.types';

const prisma = new PrismaClient();

export class ApplicationFormBuilderService {
  /**
   * Create a new form template
   */
  async createFormTemplate(template: Omit<ApplicationFormTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApplicationFormTemplate> {
    try {
      logger.info(`Creating form template: ${template.name}`);

      const formTemplate: ApplicationFormTemplate = {
        id: `template_${Date.now()}`,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in configuration or database
      // For now, return the template
      logger.info(`Form template created: ${formTemplate.id}`);
      return formTemplate;

    } catch (error) {
      logger.error('Error creating form template:', error);
      throw new Error(`Failed to create form template: ${(error as Error).message}`);
    }
  }

  /**
   * Get form template by program type
   */
  async getFormTemplateByProgram(programType: ProgramType): Promise<ApplicationFormTemplate> {
    try {
      // Return default template based on program type
      const template = this.getDefaultTemplate(programType);
      return template;

    } catch (error) {
      logger.error('Error fetching form template:', error);
      throw new Error(`Failed to fetch form template: ${(error as Error).message}`);
    }
  }

  /**
   * Validate form data against template
   */
  async validateFormData(
    formData: ApplicationFormData,
    template: ApplicationFormTemplate
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      // Validate each section and field
      for (const section of template.sections) {
        for (const field of section.fields) {
          const value = formData.responses[field.id];

          // Check required fields
          if (field.required && !value) {
            errors.push(`${field.label} is required`);
            continue;
          }

          // Validate field value
          if (value && field.validation) {
            const fieldErrors = this.validateFieldValue(value, field);
            errors.push(...fieldErrors);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      logger.error('Error validating form data:', error);
      throw new Error(`Failed to validate form data: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate form completion percentage
   */
  calculateCompletionPercentage(
    formData: ApplicationFormData,
    template: ApplicationFormTemplate
  ): number {
    try {
      let totalFields = 0;
      let completedFields = 0;

      for (const section of template.sections) {
        for (const field of section.fields) {
          if (field.required) {
            totalFields++;
            if (formData.responses[field.id]) {
              completedFields++;
            }
          }
        }
      }

      return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

    } catch (error) {
      logger.error('Error calculating completion percentage:', error);
      return 0;
    }
  }

  /**
   * Get default template for program type
   */
  private getDefaultTemplate(programType: ProgramType): ApplicationFormTemplate {
    const baseTemplate: ApplicationFormTemplate = {
      id: `template_${programType}`,
      name: `${programType} Application`,
      programType,
      isActive: true,
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      sections: [
        {
          id: 'personal_info',
          title: 'Personal Information',
          description: 'Tell us about yourself',
          order: 1,
          fields: [
            {
              id: 'firstName',
              fieldType: 'text',
              label: 'First Name',
              required: true,
              validation: { minLength: 2, maxLength: 50 },
              order: 1
            },
            {
              id: 'lastName',
              fieldType: 'text',
              label: 'Last Name',
              required: true,
              validation: { minLength: 2, maxLength: 50 },
              order: 2
            },
            {
              id: 'email',
              fieldType: 'email',
              label: 'Email Address',
              required: true,
              validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
              order: 3
            },
            {
              id: 'phone',
              fieldType: 'phone',
              label: 'Phone Number',
              required: true,
              order: 4
            },
            {
              id: 'dateOfBirth',
              fieldType: 'date',
              label: 'Date of Birth',
              required: true,
              order: 5
            },
            {
              id: 'country',
              fieldType: 'select',
              label: 'Country of Residence',
              required: true,
              options: ['United States', 'Canada', 'United Kingdom', 'Other'],
              order: 6
            }
          ]
        },
        {
          id: 'academic_background',
          title: 'Academic Background',
          description: 'Share your educational history',
          order: 2,
          fields: [
            {
              id: 'highestDegree',
              fieldType: 'select',
              label: 'Highest Degree Earned',
              required: true,
              options: ['High School', 'Associate', 'Bachelor', 'Master', 'Doctorate'],
              order: 1
            },
            {
              id: 'institution',
              fieldType: 'text',
              label: 'Institution Name',
              required: true,
              order: 2
            },
            {
              id: 'graduationYear',
              fieldType: 'number',
              label: 'Graduation Year',
              required: true,
              validation: { min: 1950, max: new Date().getFullYear() + 10 },
              order: 3
            },
            {
              id: 'gpa',
              fieldType: 'number',
              label: 'GPA (if applicable)',
              required: false,
              validation: { min: 0, max: 4.0 },
              order: 4
            }
          ]
        },
        {
          id: 'spiritual_background',
          title: 'Spiritual Background',
          description: 'Share your faith journey',
          order: 3,
          fields: [
            {
              id: 'salvationExperience',
              fieldType: 'textarea',
              label: 'Describe your salvation experience',
              placeholder: 'Share how you came to faith in Christ...',
              required: true,
              validation: { minLength: 100, maxLength: 1000 },
              helpText: 'Minimum 100 words',
              order: 1
            },
            {
              id: 'churchAffiliation',
              fieldType: 'text',
              label: 'Current Church Affiliation',
              required: true,
              order: 2
            },
            {
              id: 'ministryExperience',
              fieldType: 'textarea',
              label: 'Ministry Experience',
              placeholder: 'Describe your involvement in ministry...',
              required: false,
              validation: { maxLength: 1000 },
              order: 3
            },
            {
              id: 'spiritualGifts',
              fieldType: 'multiselect',
              label: 'Spiritual Gifts',
              required: false,
              options: [
                'Teaching',
                'Prophecy',
                'Leadership',
                'Evangelism',
                'Mercy',
                'Service',
                'Giving',
                'Administration',
                'Other'
              ],
              order: 4
            }
          ]
        },
        {
          id: 'personal_statement',
          title: 'Personal Statement',
          description: 'Tell us why you want to join ScrollUniversity',
          order: 4,
          fields: [
            {
              id: 'personalStatement',
              fieldType: 'textarea',
              label: 'Personal Statement',
              placeholder: 'Why do you want to study at ScrollUniversity? What are your goals?',
              required: true,
              validation: { minLength: 500, maxLength: 2000 },
              helpText: '500-2000 words',
              order: 1
            },
            {
              id: 'careerGoals',
              fieldType: 'textarea',
              label: 'Career and Ministry Goals',
              placeholder: 'What are your career and ministry aspirations?',
              required: true,
              validation: { minLength: 200, maxLength: 1000 },
              order: 2
            },
            {
              id: 'kingdomVision',
              fieldType: 'textarea',
              label: 'Kingdom Vision',
              placeholder: 'How do you see yourself advancing God\'s kingdom?',
              required: true,
              validation: { minLength: 200, maxLength: 1000 },
              order: 3
            }
          ]
        },
        {
          id: 'references',
          title: 'References',
          description: 'Provide contact information for your references',
          order: 5,
          fields: [
            {
              id: 'reference1Name',
              fieldType: 'text',
              label: 'Reference 1 - Name',
              required: true,
              order: 1
            },
            {
              id: 'reference1Email',
              fieldType: 'email',
              label: 'Reference 1 - Email',
              required: true,
              order: 2
            },
            {
              id: 'reference1Relationship',
              fieldType: 'text',
              label: 'Reference 1 - Relationship',
              required: true,
              order: 3
            },
            {
              id: 'reference2Name',
              fieldType: 'text',
              label: 'Reference 2 - Name',
              required: true,
              order: 4
            },
            {
              id: 'reference2Email',
              fieldType: 'email',
              label: 'Reference 2 - Email',
              required: true,
              order: 5
            },
            {
              id: 'reference2Relationship',
              fieldType: 'text',
              label: 'Reference 2 - Relationship',
              required: true,
              order: 6
            }
          ]
        }
      ]
    };

    return baseTemplate;
  }

  /**
   * Validate individual field value
   */
  private validateFieldValue(value: any, field: DynamicFormField): string[] {
    const errors: string[] = [];
    const validation = field.validation;

    if (!validation) return errors;

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`${field.label} must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push(`${field.label} must not exceed ${validation.maxLength} characters`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        errors.push(`${field.label} format is invalid`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push(`${field.label} must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push(`${field.label} must not exceed ${validation.max}`);
      }
    }

    return errors;
  }
}

export default ApplicationFormBuilderService;
