/**
 * Notification Template Service
 * Manages notification templates and variable substitution
 */

import { PrismaClient } from '@prisma/client';
import { NotificationTemplate, NotificationCategory, NotificationChannel } from '../types/notification.types';
import { defaultTemplates } from '../config/notification.config';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export default class NotificationTemplateService {
  /**
   * Initialize default templates
   */
  async initializeDefaultTemplates(): Promise<void> {
    try {
      for (const [key, template] of Object.entries(defaultTemplates)) {
        const existing = await prisma.notificationTemplate.findFirst({
          where: { name: template.name },
        });

        if (!existing) {
          await prisma.notificationTemplate.create({
            data: {
              name: template.name,
              category: template.category,
              channels: template.channels,
              subject: template.subject,
              emailTemplate: template.emailTemplate,
              smsTemplate: template.smsTemplate,
              pushTemplate: template.pushTemplate,
              inAppTemplate: template.inAppTemplate,
              variables: template.variables,
              isActive: true,
            },
          });
        }
      }

      logger.info('Default notification templates initialized');
    } catch (error) {
      logger.error('Error initializing default templates', { error });
      throw new Error('Failed to initialize default templates');
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<NotificationTemplate> {
    try {
      const template = await prisma.notificationTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      return template as NotificationTemplate;
    } catch (error) {
      logger.error('Error getting template', { error, templateId });
      throw new Error('Failed to get template');
    }
  }

  /**
   * Get template by name
   */
  async getTemplateByName(name: string): Promise<NotificationTemplate> {
    try {
      const template = await prisma.notificationTemplate.findFirst({
        where: { name },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      return template as NotificationTemplate;
    } catch (error) {
      logger.error('Error getting template by name', { error, name });
      throw new Error('Failed to get template by name');
    }
  }

  /**
   * Get all templates
   */
  async getAllTemplates(category?: NotificationCategory): Promise<NotificationTemplate[]> {
    try {
      const where: any = { isActive: true };
      if (category) where.category = category;

      const templates = await prisma.notificationTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return templates as NotificationTemplate[];
    } catch (error) {
      logger.error('Error getting all templates', { error, category });
      throw new Error('Failed to get all templates');
    }
  }

  /**
   * Create custom template
   */
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    try {
      const newTemplate = await prisma.notificationTemplate.create({
        data: template,
      });

      logger.info('Notification template created', { templateId: newTemplate.id });

      return newTemplate as NotificationTemplate;
    } catch (error) {
      logger.error('Error creating template', { error, template });
      throw new Error('Failed to create template');
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    try {
      const template = await prisma.notificationTemplate.update({
        where: { id: templateId },
        data: updates,
      });

      logger.info('Notification template updated', { templateId });

      return template as NotificationTemplate;
    } catch (error) {
      logger.error('Error updating template', { error, templateId });
      throw new Error('Failed to update template');
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await prisma.notificationTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
      });

      logger.info('Notification template deleted', { templateId });
    } catch (error) {
      logger.error('Error deleting template', { error, templateId });
      throw new Error('Failed to delete template');
    }
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
    channel: NotificationChannel
  ): Promise<{ subject: string; content: string }> {
    try {
      const template = await this.getTemplate(templateId);

      let content = '';
      switch (channel) {
        case 'email':
          content = template.emailTemplate || '';
          break;
        case 'sms':
          content = template.smsTemplate || '';
          break;
        case 'push':
          content = template.pushTemplate || '';
          break;
        case 'in_app':
          content = template.inAppTemplate || template.emailTemplate || '';
          break;
        default:
          content = template.emailTemplate || '';
      }

      const subject = this.substituteVariables(template.subject || '', variables);
      const renderedContent = this.substituteVariables(content, variables);

      return { subject, content: renderedContent };
    } catch (error) {
      logger.error('Error rendering template', { error, templateId, channel });
      throw new Error('Failed to render template');
    }
  }

  /**
   * Validate template variables
   */
  validateVariables(template: NotificationTemplate, variables: Record<string, any>): boolean {
    const missingVariables = template.variables.filter((v) => !(v in variables));

    if (missingVariables.length > 0) {
      logger.warn('Missing template variables', { templateId: template.id, missingVariables });
      return false;
    }

    return true;
  }

  /**
   * Helper: Substitute variables in template
   */
  private substituteVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Preview template
   */
  async previewTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<{
    email?: { subject: string; content: string };
    sms?: { content: string };
    push?: { content: string };
    inApp?: { content: string };
  }> {
    try {
      const template = await this.getTemplate(templateId);
      const preview: any = {};

      for (const channel of template.channels) {
        const rendered = await this.renderTemplate(templateId, variables, channel);
        preview[channel] = rendered;
      }

      return preview;
    } catch (error) {
      logger.error('Error previewing template', { error, templateId });
      throw new Error('Failed to preview template');
    }
  }

  /**
   * Clone template
   */
  async cloneTemplate(templateId: string, newName: string): Promise<NotificationTemplate> {
    try {
      const original = await this.getTemplate(templateId);

      const cloned = await prisma.notificationTemplate.create({
        data: {
          name: newName,
          category: original.category,
          channels: original.channels,
          subject: original.subject,
          emailTemplate: original.emailTemplate,
          smsTemplate: original.smsTemplate,
          pushTemplate: original.pushTemplate,
          inAppTemplate: original.inAppTemplate,
          variables: original.variables,
          isActive: true,
        },
      });

      logger.info('Template cloned', { originalId: templateId, clonedId: cloned.id });

      return cloned as NotificationTemplate;
    } catch (error) {
      logger.error('Error cloning template', { error, templateId });
      throw new Error('Failed to clone template');
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    deliveryRate: number;
    readRate: number;
  }> {
    try {
      const notifications = await prisma.notification.findMany({
        where: { templateId },
      });

      const totalSent = notifications.length;
      const totalDelivered = notifications.filter((n) => n.status === 'delivered' || n.status === 'read').length;
      const totalRead = notifications.filter((n) => n.status === 'read').length;

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

      return {
        totalSent,
        totalDelivered,
        totalRead,
        deliveryRate,
        readRate,
      };
    } catch (error) {
      logger.error('Error getting template stats', { error, templateId });
      throw new Error('Failed to get template stats');
    }
  }
}
