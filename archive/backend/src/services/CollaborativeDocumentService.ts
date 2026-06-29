/**
 * Collaborative Document Service
 * Handles real-time collaborative document editing
 * "Two are better than one, because they have a good return for their labor" - Ecclesiastes 4:9
 */

import { PrismaClient } from '@prisma/client';
import {
  CollaborativeDocument,
  DocumentEdit,
  CreateCollaborativeDocumentRequest,
  UpdateCollaborativeDocumentRequest
} from '../types/study-group.types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class CollaborativeDocumentService {
  private readonly LOCK_TIMEOUT_MINUTES = 30;

  /**
   * Create a collaborative document
   */
  async createDocument(
    userId: string,
    request: CreateCollaborativeDocumentRequest
  ): Promise<CollaborativeDocument> {
    try {
      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${request.groupId} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      // Create document
      const document = await prisma.$queryRaw<any[]>`
        INSERT INTO collaborative_documents (
          group_id, title, content, created_by, last_edited_by
        ) VALUES (
          ${request.groupId},
          ${request.title},
          ${request.content || ''},
          ${userId},
          ${userId}
        )
        RETURNING *
      `;

      logger.info(`Collaborative document created: ${document[0].id} in group ${request.groupId}`);

      return this.formatDocument(document[0]);
    } catch (error) {
      logger.error('Error creating collaborative document:', error);
      throw error;
    }
  }

  /**
   * Update a collaborative document
   */
  async updateDocument(
    userId: string,
    request: UpdateCollaborativeDocumentRequest
  ): Promise<{ document: CollaborativeDocument; version: number }> {
    try {
      // Get document
      const doc = await prisma.$queryRaw<any[]>`
        SELECT cd.*, sg.id as group_id
        FROM collaborative_documents cd
        JOIN study_groups sg ON cd.group_id = sg.id
        WHERE cd.id = ${request.documentId}
      `;

      if (!doc || doc.length === 0) {
        throw new Error('Document not found');
      }

      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${doc[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      // Check if document is locked by another user
      if (doc[0].is_locked && doc[0].locked_by !== userId) {
        // Check if lock has expired
        const lockTime = new Date(doc[0].locked_at);
        const now = new Date();
        const minutesSinceLock = (now.getTime() - lockTime.getTime()) / (1000 * 60);

        if (minutesSinceLock < this.LOCK_TIMEOUT_MINUTES) {
          throw new Error('Document is currently locked by another user');
        }

        // Lock has expired, release it
        await this.unlockDocument(request.documentId);
      }

      // Get current version
      const currentVersion = doc[0].version;
      const newVersion = currentVersion + 1;

      // Calculate changes (simplified - in production, use a proper diff algorithm)
      const changes = JSON.stringify({
        oldContent: doc[0].content,
        newContent: request.content,
        timestamp: new Date()
      });

      // Save edit history
      await prisma.$executeRaw`
        INSERT INTO document_edits (document_id, user_id, changes, version)
        VALUES (${request.documentId}, ${userId}, ${changes}, ${newVersion})
      `;

      // Update document
      const lockDocument = request.lockDocument || false;
      const updated = await prisma.$queryRaw<any[]>`
        UPDATE collaborative_documents
        SET 
          content = ${request.content},
          version = ${newVersion},
          last_edited_by = ${userId},
          is_locked = ${lockDocument},
          locked_by = ${lockDocument ? userId : null},
          locked_at = ${lockDocument ? 'CURRENT_TIMESTAMP' : null}
        WHERE id = ${request.documentId}
        RETURNING *
      `;

      logger.info(`Collaborative document updated: ${request.documentId} by user ${userId}`);

      return {
        document: this.formatDocument(updated[0]),
        version: newVersion
      };
    } catch (error) {
      logger.error('Error updating collaborative document:', error);
      throw error;
    }
  }

  /**
   * Lock a document for editing
   */
  async lockDocument(userId: string, documentId: string): Promise<CollaborativeDocument> {
    try {
      // Get document
      const doc = await prisma.$queryRaw<any[]>`
        SELECT cd.*, sg.id as group_id
        FROM collaborative_documents cd
        JOIN study_groups sg ON cd.group_id = sg.id
        WHERE cd.id = ${documentId}
      `;

      if (!doc || doc.length === 0) {
        throw new Error('Document not found');
      }

      // Check if user is member of the group
      const member = await prisma.$queryRaw<any[]>`
        SELECT * FROM study_group_members
        WHERE group_id = ${doc[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      // Check if already locked
      if (doc[0].is_locked && doc[0].locked_by !== userId) {
        throw new Error('Document is already locked by another user');
      }

      // Lock document
      const locked = await prisma.$queryRaw<any[]>`
        UPDATE collaborative_documents
        SET 
          is_locked = true,
          locked_by = ${userId},
          locked_at = CURRENT_TIMESTAMP
        WHERE id = ${documentId}
        RETURNING *
      `;

      logger.info(`Document locked: ${documentId} by user ${userId}`);

      return this.formatDocument(locked[0]);
    } catch (error) {
      logger.error('Error locking document:', error);
      throw error;
    }
  }

  /**
   * Unlock a document
   */
  async unlockDocument(documentId: string): Promise<CollaborativeDocument> {
    try {
      const unlocked = await prisma.$queryRaw<any[]>`
        UPDATE collaborative_documents
        SET 
          is_locked = false,
          locked_by = NULL,
          locked_at = NULL
        WHERE id = ${documentId}
        RETURNING *
      `;

      if (!unlocked || unlocked.length === 0) {
        throw new Error('Document not found');
      }

      logger.info(`Document unlocked: ${documentId}`);

      return this.formatDocument(unlocked[0]);
    } catch (error) {
      logger.error('Error unlocking document:', error);
      throw error;
    }
  }

  /**
   * Get group documents
   */
  async getGroupDocuments(groupId: string): Promise<CollaborativeDocument[]> {
    try {
      const documents = await prisma.$queryRaw<any[]>`
        SELECT * FROM collaborative_documents
        WHERE group_id = ${groupId}
        ORDER BY updated_at DESC
      `;

      return documents.map(this.formatDocument);
    } catch (error) {
      logger.error('Error getting group documents:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string): Promise<CollaborativeDocument> {
    try {
      const doc = await prisma.$queryRaw<any[]>`
        SELECT * FROM collaborative_documents WHERE id = ${documentId}
      `;

      if (!doc || doc.length === 0) {
        throw new Error('Document not found');
      }

      return this.formatDocument(doc[0]);
    } catch (error) {
      logger.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Get document edit history
   */
  async getDocumentHistory(documentId: string): Promise<DocumentEdit[]> {
    try {
      const edits = await prisma.$queryRaw<any[]>`
        SELECT * FROM document_edits
        WHERE document_id = ${documentId}
        ORDER BY version DESC
        LIMIT 50
      `;

      return edits.map(this.formatDocumentEdit);
    } catch (error) {
      logger.error('Error getting document history:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    try {
      // Get document
      const doc = await prisma.$queryRaw<any[]>`
        SELECT cd.*, sg.id as group_id
        FROM collaborative_documents cd
        JOIN study_groups sg ON cd.group_id = sg.id
        WHERE cd.id = ${documentId}
      `;

      if (!doc || doc.length === 0) {
        throw new Error('Document not found');
      }

      // Check if user is creator or group owner
      const member = await prisma.$queryRaw<any[]>`
        SELECT role FROM study_group_members
        WHERE group_id = ${doc[0].group_id} AND user_id = ${userId}
      `;

      if (!member || member.length === 0) {
        throw new Error('User is not a member of this group');
      }

      const isCreator = doc[0].created_by === userId;
      const isOwner = member[0].role === 'OWNER';

      if (!isCreator && !isOwner) {
        throw new Error('Only document creator or group owner can delete the document');
      }

      // Delete document
      await prisma.$executeRaw`
        DELETE FROM collaborative_documents WHERE id = ${documentId}
      `;

      logger.info(`Document deleted: ${documentId} by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Release expired locks
   */
  async releaseExpiredLocks(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        UPDATE collaborative_documents
        SET 
          is_locked = false,
          locked_by = NULL,
          locked_at = NULL
        WHERE is_locked = true
          AND locked_at < CURRENT_TIMESTAMP - INTERVAL '${this.LOCK_TIMEOUT_MINUTES} minutes'
      `;

      logger.info(`Released ${result} expired document locks`);

      return result as number;
    } catch (error) {
      logger.error('Error releasing expired locks:', error);
      throw error;
    }
  }

  /**
   * Format document
   */
  private formatDocument(row: any): CollaborativeDocument {
    return {
      id: row.id,
      groupId: row.group_id,
      title: row.title,
      content: row.content,
      version: row.version,
      createdBy: row.created_by,
      lastEditedBy: row.last_edited_by,
      isLocked: row.is_locked,
      lockedBy: row.locked_by,
      lockedAt: row.locked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Format document edit
   */
  private formatDocumentEdit(row: any): DocumentEdit {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      changes: row.changes,
      version: row.version,
      editedAt: row.edited_at
    };
  }
}

export default new CollaborativeDocumentService();
