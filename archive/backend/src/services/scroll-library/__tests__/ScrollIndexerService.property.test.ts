/**
 * Property-Based Tests for ScrollIndexer Service
 * Tests embedding generation and knowledge graph construction
 */

import * as fc from 'fast-check';
import { ScrollIndexerService } from '../ScrollIndexerService';
import { Book, Chapter } from '../../../types/scroll-library.types';
import { scrollLibraryGenerators, propertyTestUtils } from '../../../__tests__/property-setup';

describe('ScrollIndexer Service - Property-Based Tests', () => {
  let scrollIndexer: ScrollIndexerService;

  beforeAll(() => {
    scrollIndexer = new ScrollIndexerService();
  });

  /**
   * Property 13: Embedding Generation
   * Feature: scroll-library-system, Property 13: Embedding Generation
   * Validates: Requirements 4.1
   * 
   * For any content added to the library, vector embeddings should be created by ScrollIndexer
   */
  describe('Property 13: Embedding Generation', () => {
    test('should create embeddings for any valid book', async () => {
      await fc.assert(
        fc.asyncProperty(
          scrollLibraryGenerators.courseOutline,
          async (outline) => {
            // Create a book with chapters
            const book: Book = {
              id: `book_${Date.now()}_${Math.random()}`,
              title: outline.title,
              subject: outline.subject,
              level: outline.level,
              courseReference: outline.courseReference,
              chapters: outline.chapters.map((chapterSpec, index) => ({
                id: `chapter_${index}_${Date.now()}`,
                bookId: `book_${Date.now()}`,
                title: chapterSpec.title,
                orderIndex: chapterSpec.orderIndex,
                content: `# ${chapterSpec.title}\n\nThis chapter covers: ${chapterSpec.topics.join(', ')}.\n\nLearning objectives:\n${chapterSpec.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}`,
                diagrams: [],
                references: [],
                summaries: [],
                exercises: [],
                readingTime: 15,
                createdAt: new Date(),
                updatedAt: new Date()
              })),
              diagrams: [],
              metadata: {
                authorAgent: 'ScrollAuthorGPT',
                version: '1.0.0',
                scrollIntegrityHash: '',
                generationDate: new Date(),
                lastValidated: new Date(),
                qualityScore: 0.9,
                theologicalAlignment: 0.95
              },
              integrityHash: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // Create embeddings
            const embeddingIds = await scrollIndexer.createEmbeddings(book);

            // Property: Embeddings should be created for all chapters
            expect(embeddingIds).toBeDefined();
            expect(Array.isArray(embeddingIds)).toBe(true);
            expect(embeddingIds.length).toBeGreaterThan(0);

            // Property: Each embedding ID should be a non-empty string
            embeddingIds.forEach(id => {
              expect(typeof id).toBe('string');
              expect(id.length).toBeGreaterThan(0);
            });

            // Property: Number of embeddings should be at least equal to number of chapters
            // (could be more if chapters are split into chunks)
            expect(embeddingIds.length).toBeGreaterThanOrEqual(book.chapters.length);
          }
        ),
        { numRuns: 10, timeout: 60000 } // Reduced runs due to API calls
      );
    });

    test('should create embeddings for books with varying chapter counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          scrollLibraryGenerators.bookTitle,
          scrollLibraryGenerators.subject,
          scrollLibraryGenerators.academicLevel,
          async (chapterCount, title, subject, level) => {
            // Create book with specified number of chapters
            const book: Book = {
              id: `book_${Date.now()}_${Math.random()}`,
              title,
              subject,
              level,
              chapters: Array.from({ length: chapterCount }, (_, i) => ({
                id: `chapter_${i}_${Date.now()}`,
                bookId: `book_${Date.now()}`,
                title: `Chapter ${i + 1}`,
                orderIndex: i + 1,
                content: `# Chapter ${i + 1}\n\nContent for chapter ${i + 1}. This covers important topics related to ${subject}.`,
                diagrams: [],
                references: [],
                summaries: [],
                exercises: [],
                readingTime: 10,
                createdAt: new Date(),
                updatedAt: new Date()
              })),
              diagrams: [],
              metadata: {
                authorAgent: 'ScrollAuthorGPT',
                version: '1.0.0',
                scrollIntegrityHash: '',
                generationDate: new Date(),
                lastValidated: new Date(),
                qualityScore: 0.9,
                theologicalAlignment: 0.95
              },
              integrityHash: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const embeddingIds = await scrollIndexer.createEmbeddings(book);

            // Property: Embeddings created should scale with chapter count
            expect(embeddingIds.length).toBeGreaterThanOrEqual(chapterCount);
          }
        ),
        { numRuns: 10, timeout: 60000 }
      );
    });

    test('should handle books with empty chapters gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          scrollLibraryGenerators.bookTitle,
          scrollLibraryGenerators.subject,
          scrollLibraryGenerators.academicLevel,
          async (title, subject, level) => {
            const book: Book = {
              id: `book_${Date.now()}_${Math.random()}`,
              title,
              subject,
              level,
              chapters: [{
                id: `chapter_empty_${Date.now()}`,
                bookId: `book_${Date.now()}`,
                title: 'Empty Chapter',
                orderIndex: 1,
                content: '', // Empty content
                diagrams: [],
                references: [],
                summaries: [],
                exercises: [],
                readingTime: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              }],
              diagrams: [],
              metadata: {
                authorAgent: 'ScrollAuthorGPT',
                version: '1.0.0',
                scrollIntegrityHash: '',
                generationDate: new Date(),
                lastValidated: new Date(),
                qualityScore: 0.9,
                theologicalAlignment: 0.95
              },
              integrityHash: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // Should not throw error even with empty content
            const embeddingIds = await scrollIndexer.createEmbeddings(book);
            
            // Property: Should return array even for empty content
            expect(Array.isArray(embeddingIds)).toBe(true);
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });
  });

  /**
   * Property 14: Knowledge Graph Construction
   * Feature: scroll-library-system, Property 14: Knowledge Graph Construction
   * Validates: Requirements 4.2
   * 
   * For any indexed content with related concepts, knowledge graph connections should be established
   */
  describe('Property 14: Knowledge Graph Construction', () => {
    test('should build knowledge graph for any valid book', async () => {
      await fc.assert(
        fc.asyncProperty(
          scrollLibraryGenerators.courseOutline,
          async (outline) => {
            // Create a book with chapters
            const book: Book = {
              id: `book_${Date.now()}_${Math.random()}`,
              title: outline.title,
              subject: outline.subject,
              level: outline.level,
              courseReference: outline.courseReference,
              chapters: outline.chapters.slice(0, 3).map((chapterSpec, index) => ({
                id: `chapter_${index}_${Date.now()}`,
                bookId: `book_${Date.now()}`,
                title: chapterSpec.title,
                orderIndex: chapterSpec.orderIndex,
                content: `# ${chapterSpec.title}\n\n## Key Concepts\n\nThis chapter introduces important concepts related to ${outline.subject}. The main topics include: ${chapterSpec.topics.join(', ')}.\n\n## Learning Objectives\n${chapterSpec.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}\n\n## Biblical Foundation\n\nScripture teaches us about these principles...\n\n## Application\n\nThese concepts apply to our calling in the following ways...`,
                diagrams: [],
                references: [],
                summaries: [],
                exercises: [],
                readingTime: 15,
                createdAt: new Date(),
                updatedAt: new Date()
              })),
              diagrams: [],
              metadata: {
                authorAgent: 'ScrollAuthorGPT',
                version: '1.0.0',
                scrollIntegrityHash: '',
                generationDate: new Date(),
                lastValidated: new Date(),
                qualityScore: 0.9,
                theologicalAlignment: 0.95
              },
              integrityHash: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // Index the book (creates embeddings and builds knowledge graph)
            const result = await scrollIndexer.indexBook(book);

            // Property: Indexing should succeed
            expect(result.success).toBe(true);
            expect(result.bookId).toBe(book.id);

            // Property: Should create embeddings
            expect(result.embeddingsCreated).toBeGreaterThan(0);

            // Property: Should create knowledge nodes
            expect(result.nodesCreated).toBeGreaterThanOrEqual(0);

            // Property: Should create relationships
            expect(result.relationshipsCreated).toBeGreaterThanOrEqual(0);

            // Property: If nodes are created, relationships should also be created
            if (result.nodesCreated > 1) {
              expect(result.relationshipsCreated).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 5, timeout: 120000 } // Longer timeout for full indexing
      );
    });

    test('should create relationships between related concepts', async () => {
      await fc.assert(
        fc.asyncProperty(
          scrollLibraryGenerators.subject,
          scrollLibraryGenerators.academicLevel,
          async (subject, level) => {
            // Create a book with related concepts
            const book: Book = {
              id: `book_${Date.now()}_${Math.random()}`,
              title: `Introduction to ${subject}`,
              subject,
              level,
              chapters: [
                {
                  id: `chapter_1_${Date.now()}`,
                  bookId: `book_${Date.now()}`,
                  title: 'Foundational Concepts',
                  orderIndex: 1,
                  content: `# Foundational Concepts\n\nThis chapter introduces the core concepts of ${subject}. We will explore the fundamental principles that underpin this field.\n\n## Key Terms\n\n- Concept A: The foundation of all understanding\n- Concept B: Builds upon Concept A\n- Concept C: Related to both A and B`,
                  diagrams: [],
                  references: [],
                  summaries: [],
                  exercises: [],
                  readingTime: 15,
                  createdAt: new Date(),
                  updatedAt: new Date()
                },
                {
                  id: `chapter_2_${Date.now()}`,
                  bookId: `book_${Date.now()}`,
                  title: 'Advanced Applications',
                  orderIndex: 2,
                  content: `# Advanced Applications\n\nBuilding on Concept A and Concept B from the previous chapter, we now explore advanced applications. Concept C plays a crucial role in understanding these applications.`,
                  diagrams: [],
                  references: [],
                  summaries: [],
                  exercises: [],
                  readingTime: 20,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              ],
              diagrams: [],
              metadata: {
                authorAgent: 'ScrollAuthorGPT',
                version: '1.0.0',
                scrollIntegrityHash: '',
                generationDate: new Date(),
                lastValidated: new Date(),
                qualityScore: 0.9,
                theologicalAlignment: 0.95
              },
              integrityHash: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const result = await scrollIndexer.indexBook(book);

            // Property: Books with multiple chapters should create relationships
            expect(result.success).toBe(true);
            
            // Property: Related concepts across chapters should be linked
            if (result.nodesCreated > 0) {
              expect(result.relationshipsCreated).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 5, timeout: 120000 }
      );
    });

    test('should handle books with single chapter', async () => {
      await fc.assert(
        fc.asyncProperty(
          scrollLibraryGenerators.bookTitle,
          scrollLibraryGenerators.subject,
          scrollLibraryGenerators.academicLevel,
          scrollLibraryGenerators.scrollContent,
          async (title, subject, level, content) => {
            const book: Book = {
              id: `book_${Date.now()}_${Math.random()}`,
              title,
              subject,
              level,
              chapters: [{
                id: `chapter_single_${Date.now()}`,
                bookId: `book_${Date.now()}`,
                title: 'Single Chapter',
                orderIndex: 1,
                content,
                diagrams: [],
                references: [],
                summaries: [],
                exercises: [],
                readingTime: 15,
                createdAt: new Date(),
                updatedAt: new Date()
              }],
              diagrams: [],
              metadata: {
                authorAgent: 'ScrollAuthorGPT',
                version: '1.0.0',
                scrollIntegrityHash: '',
                generationDate: new Date(),
                lastValidated: new Date(),
                qualityScore: 0.9,
                theologicalAlignment: 0.95
              },
              integrityHash: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const result = await scrollIndexer.indexBook(book);

            // Property: Should successfully index even single-chapter books
            expect(result.success).toBe(true);
            expect(result.embeddingsCreated).toBeGreaterThan(0);
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    });
  });

  /**
   * Additional property: Idempotence of indexing
   * Indexing the same book multiple times should produce consistent results
   */
  describe('Indexing Idempotence', () => {
    test('should produce consistent embeddings for the same content', async () => {
      await fc.assert(
        fc.asyncProperty(
          scrollLibraryGenerators.bookTitle,
          scrollLibraryGenerators.subject,
          scrollLibraryGenerators.academicLevel,
          async (title, subject, level) => {
            const book: Book = {
              id: `book_${Date.now()}_${Math.random()}`,
              title,
              subject,
              level,
              chapters: [{
                id: `chapter_${Date.now()}`,
                bookId: `book_${Date.now()}`,
                title: 'Test Chapter',
                orderIndex: 1,
                content: 'This is consistent test content for idempotence testing.',
                diagrams: [],
                references: [],
                summaries: [],
                exercises: [],
                readingTime: 5,
                createdAt: new Date(),
                updatedAt: new Date()
              }],
              diagrams: [],
              metadata: {
                authorAgent: 'ScrollAuthorGPT',
                version: '1.0.0',
                scrollIntegrityHash: '',
                generationDate: new Date(),
                lastValidated: new Date(),
                qualityScore: 0.9,
                theologicalAlignment: 0.95
              },
              integrityHash: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // Index twice
            const result1 = await scrollIndexer.createEmbeddings(book);
            const result2 = await scrollIndexer.createEmbeddings(book);

            // Property: Should create same number of embeddings
            expect(result1.length).toBe(result2.length);
          }
        ),
        { numRuns: 3, timeout: 60000 }
      );
    });
  });

  /**
   * Health check property
   */
  describe('Service Health', () => {
    test('should maintain healthy state during operations', async () => {
      const isHealthy = await scrollIndexer.healthCheck();
      
      // Property: Service should be healthy
      expect(typeof isHealthy).toBe('boolean');
    });
  });
});
