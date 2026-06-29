/**
 * ScrollUniversity Escalation Service
 * "Cast all your anxiety on him because he cares for you" - 1 Peter 5:7
 * 
 * Manages chatbot escalations and support ticket creation
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/productionLogger';
import { PrismaClient } from '@prisma/client';
import { conversationService } from './ConversationService';

const prisma = new PrismaClient();

export interface SupportTicket {
    id: string;
    conversationId?: string;
    userId: string;
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string;
    resolution?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
    smsSent: boolean;
    emailSent: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface EscalationCriteria {
    confidenceThreshold: number;
    urgentKeywords: string[];
    escalationReasons: string[];
}

export class EscalationService {
    private readonly CONFIDENCE_THRESHOLD = 0.75;
    private readonly URGENT_KEYWORDS = [
        'urgent', 'emergency', 'critical', 'immediately', 'asap',
        'payment failed', 'cannot access', 'locked out', 'deadline',
        'exam', 'grade', 'appeal', 'complaint', 'refund'
    ];

    /**
     * Check if message should be escalated
     */
    shouldEscalate(
        message: string,
        confidenceScore?: number,
        conversationHistory?: any[]
    ): {
        shouldEscalate: boolean;
        reason: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
    } {
        // Check confidence threshold
        if (confidenceScore !== undefined && confidenceScore < this.CONFIDENCE_THRESHOLD) {
            return {
                shouldEscalate: true,
                reason: 'Low confidence score',
                priority: 'medium'
            };
        }

        // Check for urgent keywords
        const lowerMessage = message.toLowerCase();
        const hasUrgentKeyword = this.URGENT_KEYWORDS.some(keyword =>
            lowerMessage.includes(keyword)
        );

        if (hasUrgentKeyword) {
            return {
                shouldEscalate: true,
                reason: 'Urgent keyword detected',
                priority: 'urgent'
            };
        }

        // Check conversation length (too many back-and-forth)
        if (conversationHistory && conversationHistory.length > 10) {
            return {
                shouldEscalate: true,
                reason: 'Extended conversation without resolution',
                priority: 'medium'
            };
        }

        // Check for frustration indicators
        const frustrationIndicators = ['frustrated', 'angry', 'disappointed', 'terrible', 'awful'];
        const hasFrustration = frustrationIndicators.some(indicator =>
            lowerMessage.includes(indicator)
        );

        if (hasFrustration) {
            return {
                shouldEscalate: true,
                reason: 'User frustration detected',
                priority: 'high'
            };
        }

        return {
            shouldEscalate: false,
            reason: '',
            priority: 'low'
        };
    }

    /**
     * Create support ticket
     */
    async createTicket(
        userId: string,
        subject: string,
        description: string,
        options: {
            conversationId?: string;
            priority?: 'low' | 'medium' | 'high' | 'urgent';
            category?: string;
        } = {}
    ): Promise<SupportTicket> {
        const ticketId = uuidv4();

        try {
            const priority = options.priority || 'medium';
            const category = options.category || 'General Support';

            await prisma.$executeRawUnsafe(`
                INSERT INTO support_tickets (
                    id, conversation_id, user_id, subject, description,
                    priority, category, status, sms_sent, email_sent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', false, false)
            `, ticketId, options.conversationId || null, userId, subject,
                description, priority, category);

            // Update conversation status if linked
            if (options.conversationId) {
                await conversationService.updateConversationStatus(
                    options.conversationId,
                    'escalated',
                    {
                        escalationReason: subject,
                        ticketId
                    }
                );
            }

            logger.info('Support ticket created', {
                ticketId,
                userId,
                priority,
                conversationId: options.conversationId
            });

            // Send notifications based on priority
            if (priority === 'urgent' || priority === 'high') {
                await this.sendUrgentNotifications(ticketId, userId, subject);
            } else {
                await this.sendEmailNotification(ticketId, userId, subject);
            }

            return {
                id: ticketId,
                conversationId: options.conversationId,
                userId,
                subject,
                description,
                priority,
                category,
                status: 'open',
                smsSent: false,
                emailSent: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

        } catch (error: any) {
            logger.error('Failed to create support ticket', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Escalate conversation to human support
     */
    async escalateConversation(
        conversationId: string,
        reason: string,
        priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    ): Promise<SupportTicket> {
        try {
            // Get conversation details
            const conversations = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM chatbot_conversations WHERE id = $1
            `, conversationId);

            if (conversations.length === 0) {
                throw new Error('Conversation not found');
            }

            const conversation = conversations[0];

            // Get conversation messages for context
            const messages = await conversationService.getConversationHistory(conversationId);
            const conversationText = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n\n');

            // Create ticket
            const ticket = await this.createTicket(
                conversation.user_id,
                `Escalation: ${reason}`,
                `Conversation escalated from chatbot.\n\nReason: ${reason}\n\nConversation History:\n${conversationText}`,
                {
                    conversationId,
                    priority,
                    category: 'Escalation'
                }
            );

            logger.info('Conversation escalated', {
                conversationId,
                ticketId: ticket.id,
                reason,
                priority
            });

            return ticket;

        } catch (error: any) {
            logger.error('Failed to escalate conversation', {
                error: error.message,
                conversationId
            });
            throw error;
        }
    }

    /**
     * Send urgent notifications (SMS + Email)
     */
    private async sendUrgentNotifications(
        ticketId: string,
        userId: string,
        subject: string
    ): Promise<void> {
        try {
            // Get user details
            const users = await prisma.$queryRawUnsafe<any[]>(`
                SELECT email, phone_number FROM users WHERE id = $1
            `, userId);

            if (users.length === 0) {
                logger.warn('User not found for notifications', { userId });
                return;
            }

            const user = users[0];

            // Send SMS if phone number available
            if (user.phone_number) {
                await this.sendSMS(user.phone_number, ticketId, subject);
                
                await prisma.$executeRawUnsafe(`
                    UPDATE support_tickets SET sms_sent = true WHERE id = $1
                `, ticketId);
            }

            // Send email
            if (user.email) {
                await this.sendEmail(user.email, ticketId, subject);
                
                await prisma.$executeRawUnsafe(`
                    UPDATE support_tickets SET email_sent = true WHERE id = $1
                `, ticketId);
            }

            logger.info('Urgent notifications sent', {
                ticketId,
                userId,
                sms: !!user.phone_number,
                email: !!user.email
            });

        } catch (error: any) {
            logger.error('Failed to send urgent notifications', {
                error: error.message,
                ticketId
            });
        }
    }

    /**
     * Send email notification
     */
    private async sendEmailNotification(
        ticketId: string,
        userId: string,
        subject: string
    ): Promise<void> {
        try {
            const users = await prisma.$queryRawUnsafe<any[]>(`
                SELECT email FROM users WHERE id = $1
            `, userId);

            if (users.length === 0 || !users[0].email) {
                return;
            }

            await this.sendEmail(users[0].email, ticketId, subject);
            
            await prisma.$executeRawUnsafe(`
                UPDATE support_tickets SET email_sent = true WHERE id = $1
            `, ticketId);

            logger.info('Email notification sent', { ticketId, userId });

        } catch (error: any) {
            logger.error('Failed to send email notification', {
                error: error.message,
                ticketId
            });
        }
    }

    /**
     * Send SMS (integration with Zapier or Twilio)
     */
    private async sendSMS(phoneNumber: string, ticketId: string, subject: string): Promise<void> {
        try {
            // TODO: Integrate with Zapier webhook or Twilio API
            const message = `ScrollUniversity Support: Your urgent ticket #${ticketId.substring(0, 8)} has been created. Subject: ${subject}. We'll respond within 2 hours.`;

            logger.info('SMS would be sent', {
                phoneNumber: phoneNumber.substring(0, 5) + '***',
                ticketId,
                message: message.substring(0, 50)
            });

            // In production, call Zapier webhook or Twilio API here
            // await fetch('https://hooks.zapier.com/hooks/catch/...', {
            //     method: 'POST',
            //     body: JSON.stringify({ phone: phoneNumber, message })
            // });

        } catch (error: any) {
            logger.error('Failed to send SMS', {
                error: error.message,
                ticketId
            });
        }
    }

    /**
     * Send email (integration with Zapier or SendGrid)
     */
    private async sendEmail(email: string, ticketId: string, subject: string): Promise<void> {
        try {
            // TODO: Integrate with Zapier webhook or SendGrid API
            const emailBody = `
                Dear Student,

                Your support ticket has been created successfully.

                Ticket ID: ${ticketId}
                Subject: ${subject}
                Status: Open

                Our support team will review your request and respond within 24 hours.
                For urgent matters, please call our support line.

                Thank you for your patience.

                Blessings,
                ScrollUniversity Support Team
            `;

            logger.info('Email would be sent', {
                email: email.substring(0, 3) + '***',
                ticketId,
                subject
            });

            // In production, call Zapier webhook or SendGrid API here
            // await fetch('https://hooks.zapier.com/hooks/catch/...', {
            //     method: 'POST',
            //     body: JSON.stringify({ to: email, subject, body: emailBody })
            // });

        } catch (error: any) {
            logger.error('Failed to send email', {
                error: error.message,
                ticketId
            });
        }
    }

    /**
     * Update ticket status
     */
    async updateTicketStatus(
        ticketId: string,
        status: 'open' | 'in_progress' | 'resolved' | 'closed',
        options?: {
            assignedTo?: string;
            resolution?: string;
            resolvedBy?: string;
        }
    ): Promise<boolean> {
        try {
            const updates: string[] = [`status = '${status}'`];
            const values: any[] = [];
            let paramIndex = 1;

            if (status === 'resolved' || status === 'closed') {
                updates.push(`resolved_at = CURRENT_TIMESTAMP`);
                if (options?.resolution) {
                    updates.push(`resolution = $${paramIndex++}`);
                    values.push(options.resolution);
                }
                if (options?.resolvedBy) {
                    updates.push(`resolved_by = $${paramIndex++}`);
                    values.push(options.resolvedBy);
                }
            }

            if (options?.assignedTo) {
                updates.push(`assigned_to = $${paramIndex++}`);
                values.push(options.assignedTo);
            }

            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(ticketId);

            await prisma.$executeRawUnsafe(`
                UPDATE support_tickets
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
            `, ...values);

            logger.info('Ticket status updated', {
                ticketId,
                status
            });

            return true;

        } catch (error: any) {
            logger.error('Failed to update ticket status', {
                error: error.message,
                ticketId
            });
            return false;
        }
    }

    /**
     * Get ticket by ID
     */
    async getTicket(ticketId: string): Promise<SupportTicket | null> {
        try {
            const tickets = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM support_tickets WHERE id = $1
            `, ticketId);

            if (tickets.length === 0) {
                return null;
            }

            const ticket = tickets[0];
            return {
                id: ticket.id,
                conversationId: ticket.conversation_id,
                userId: ticket.user_id,
                subject: ticket.subject,
                description: ticket.description,
                priority: ticket.priority,
                category: ticket.category,
                status: ticket.status,
                assignedTo: ticket.assigned_to,
                resolution: ticket.resolution,
                resolvedAt: ticket.resolved_at,
                resolvedBy: ticket.resolved_by,
                smsSent: ticket.sms_sent,
                emailSent: ticket.email_sent,
                createdAt: ticket.created_at,
                updatedAt: ticket.updated_at
            };

        } catch (error: any) {
            logger.error('Failed to get ticket', {
                error: error.message,
                ticketId
            });
            return null;
        }
    }

    /**
     * Get user's tickets
     */
    async getUserTickets(userId: string, status?: string): Promise<SupportTicket[]> {
        try {
            const whereClause = status
                ? `WHERE user_id = $1 AND status = $2`
                : `WHERE user_id = $1`;

            const params = status ? [userId, status] : [userId];

            const tickets = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM support_tickets
                ${whereClause}
                ORDER BY created_at DESC
            `, ...params);

            return tickets.map((ticket: any) => ({
                id: ticket.id,
                conversationId: ticket.conversation_id,
                userId: ticket.user_id,
                subject: ticket.subject,
                description: ticket.description,
                priority: ticket.priority,
                category: ticket.category,
                status: ticket.status,
                assignedTo: ticket.assigned_to,
                resolution: ticket.resolution,
                resolvedAt: ticket.resolved_at,
                resolvedBy: ticket.resolved_by,
                smsSent: ticket.sms_sent,
                emailSent: ticket.email_sent,
                createdAt: ticket.created_at,
                updatedAt: ticket.updated_at
            }));

        } catch (error: any) {
            logger.error('Failed to get user tickets', {
                error: error.message,
                userId
            });
            return [];
        }
    }

    /**
     * Get ticket statistics
     */
    async getStatistics(): Promise<any> {
        try {
            const stats = await prisma.$queryRawUnsafe<any[]>(`
                SELECT 
                    COUNT(*) as total_tickets,
                    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
                    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
                    COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
                    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
                FROM support_tickets
                WHERE created_at > NOW() - INTERVAL '30 days'
            `);

            return stats[0] || {};

        } catch (error: any) {
            logger.error('Failed to get ticket statistics', {
                error: error.message
            });
            return {};
        }
    }
}

// Singleton instance
export const escalationService = new EscalationService();
