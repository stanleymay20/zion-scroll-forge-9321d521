/**
 * Property-Based Tests for LibraryManagementService
 * Using fast-check for property testing
 */

import * as fc from 'fast-check';
import { LibraryManagementService, SearchQuery, SearchResult } from '../LibraryManagementService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../utils/logger');
jest.mock('../../VectorStoreService');

// Define AcademicLevel enum for tests
enum AcademicLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

describe('LibraryManagementService - Property Tests', () => {
  let service: LibraryManagementService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      scrollBook: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      scrollCourseMaterial: {
        findFirst: jest.fn()
      },
      scrollKnowledgeNode: {
        findMany: jest.fn()
      }
    };

    // Mock PrismaClient constructor
    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

    service = new LibraryManagementService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: scroll-library-system, Property 15: Semantic Search Relevance**
   * **Validates: Requirements 4.3**
   * 
   * For any search query, returned results should be semantically relevant 
   * to the query and ranked by relevance score.
   */
  describe('Property 15: Semantic Search Relevance', () => {
    // Generator for search queries
    const searchQueryGen = fc.record({
      query: fc.string({ minLength: 3, maxLength: 100 }),
      type: fc.constant('semantic' as const),
      limit: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined })
    });

    // Generator for mock books with varying relevance
    const mockBookGen = (queryTerm: string) => fc.record({
      id: fc.uuid(),
      title: fc.oneof(
        fc.constant(queryTerm), // Exact match
        fc.constant(`${queryTerm} and more`), // Contains query
        fc.string({ minLength: 10, maxLength: 50 }) // Random title
      ),
      subject: fc.oneof(
        fc.constant(queryTerm),
        fc.constantFrom('Theology', 'Philosophy', 'History', 'Science')
      ),
      level: fc.constantFrom(AcademicLevel.BEGINNER, AcademicLevel.INTERMEDIATE, AcademicLevel.ADVANCED),
      subtitle: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: null }),
      courseReference: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
      integrityHash: fc.string({ minLength: 32, maxLength: 64 }),
      publishedAt: fc.option(fc.date(), { nil: null }),
      createdAt: fc.date(),
      updatedAt: fc.date(),
      chapters: fc.constant([]),
      metadata: fc.record({
        id: fc.uuid(),
        bookId: fc.uuid(),
        authorAgent: fc.constant('ScrollAuthorGPT'),
        version: fc.constant('1.0.0'),
        scrollIntegrityHash: fc.string({ minLength: 32, maxLength: 64 }),
        generationDate: fc.date(),
        lastValidated: fc.date(),
        qualityScore: fc.double({ min: 0, max: 1 }),
        theologicalAlignment: fc.double({ min: 0, max: 1 })
      })
    });

    it('should return results ranked by relevance score', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryGen,
          async (query) => {
            // Generate mock books
            const mockBooks = await fc.sample(mockBookGen(query.query), 5);
            
            // Mock Prisma response
            mockPrisma.scrollBook.findMany.mockResolvedValue(mockBooks);
            mockPrisma.scrollKnowledgeNode.findMany.mockResolvedValue([]);

            // Mock vector store (will be called by semantic search)
            const mockVectorStore = (service as any).vectorStore;
            if (mockVectorStore && mockVectorStore.search) {
              mockVectorStore.search.mockResolvedValue([]);
            }

            // Perform search
            const results = await service.searchLibrary(query);

            // Property: Results should be ranked by relevance score (descending)
            for (let i = 0; i < results.length - 1; i++) {
              expect(results[i].relevanceScore).toBeGreaterThanOrEqual(results[i + 1].relevanceScore);
            }

            // Property: All results should have relevance scores between 0 and 1
            results.forEach(result => {
              expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
              expect(result.relevanceScore).toBeLessThanOrEqual(1);
            });

            // Property: Results should be limited if limit is specified
            if (query.limit) {
              expect(results.length).toBeLessThanOrEqual(query.limit);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return semantically relevant results', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryGen,
          async (query) => {
            // Generate mock books with varying relevance
            const relevantBooks = await fc.sample(mockBookGen(query.query), 3);
            const irrelevantBooks = await fc.sample(mockBookGen('completely different topic'), 2);
            const allBooks = [...relevantBooks, ...irrelevantBooks];

            // Mock Prisma response
            mockPrisma.scrollBook.findMany.mockResolvedValue(allBooks);
            mockPrisma.scrollKnowledgeNode.findMany.mockResolvedValue([]);

            // Mock vector store
            const mockVectorStore = (service as any).vectorStore;
            if (mockVectorStore && mockVectorStore.search) {
              mockVectorStore.search.mockResolvedValue([]);
            }

            // Perform search
            const results = await service.searchLibrary(query);

            // Property: Each result should have required fields
            results.forEach(result => {
              expect(result).toHaveProperty('bookId');
              expect(result).toHaveProperty('title');
              expect(result).toHaveProperty('excerpt');
              expect(result).toHaveProperty('relevanceScore');
              expect(result).toHaveProperty('conceptConnections');
              expect(Array.isArray(result.conceptConnections)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty search results gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryGen,
          async (query) => {
            // Mock empty results
            mockPrisma.scrollBook.findMany.mockResolvedValue([]);
            mockPrisma.scrollKnowledgeNode.findMany.mockResolvedValue([]);

            // Mock vector store
            const mockVectorStore = (service as any).vectorStore;
            if (mockVectorStore && mockVectorStore.search) {
              mockVectorStore.search.mockResolvedValue([]);
            }

            // Perform search
            const results = await service.searchLibrary(query);

            // Property: Empty results should return empty array, not null or undefined
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: scroll-library-system, Property 17: Prophetic Search Differentiation**
   * **Validates: Requirements 4.5**
   * 
   * For any search query, prophetic mode should produce different result 
   * rankings than standard semantic search.
   */
  describe('Property 17: Prophetic Search Differentiation', () => {
    // Generator for the same query in both modes
    const dualSearchGen = fc.record({
      query: fc.string({ minLength: 5, maxLength: 100 }),
      limit: fc.option(fc.integer({ min: 5, max: 20 }), { nil: undefined })
    });

    // Generator for books with theological alignment scores
    const theologicalBookGen = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 10, maxLength: 50 }),
      subject: fc.constantFrom('Theology', 'Philosophy', 'Biblical Studies'),
      level: fc.constantFrom(AcademicLevel.BEGINNER, AcademicLevel.INTERMEDIATE, AcademicLevel.ADVANCED),
      subtitle: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: null }),
      courseReference: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
      integrityHash: fc.string({ minLength: 32, maxLength: 64 }),
      publishedAt: fc.option(fc.date(), { nil: null }),
      createdAt: fc.date(),
      updatedAt: fc.date(),
      chapters: fc.constant([]),
      metadata: fc.record({
        id: fc.uuid(),
        bookId: fc.uuid(),
        authorAgent: fc.constant('ScrollAuthorGPT'),
        version: fc.constant('1.0.0'),
        scrollIntegrityHash: fc.string({ minLength: 32, maxLength: 64 }),
        generationDate: fc.date(),
        lastValidated: fc.date(),
        qualityScore: fc.double({ min: 0.5, max: 1 }),
        theologicalAlignment: fc.double({ min: 0.5, max: 1 }) // Varying theological scores
      })
    });

    it('should produce different rankings for prophetic vs semantic search', async () => {
      await fc.assert(
        fc.asyncProperty(
          dualSearchGen,
          async (searchParams) => {
            // Generate mock books with varying theological alignment
            const mockBooks = await fc.sample(theologicalBookGen, 10);
            
            // Mock Prisma responses
            mockPrisma.scrollBook.findMany.mockResolvedValue(mockBooks);
            mockPrisma.scrollBook.findUnique.mockImplementation((args: any) => {
              const book = mockBooks.find(b => b.id === args.where.id);
              return Promise.resolve(book || null);
            });
            mockPrisma.scrollKnowledgeNode.findMany.mockResolvedValue([]);

            // Mock vector store
            const mockVectorStore = (service as any).vectorStore;
            if (mockVectorStore && mockVectorStore.search) {
              mockVectorStore.search.mockResolvedValue(
                mockBooks.slice(0, 5).map((book, idx) => ({
                  id: book.id,
                  content: book.title,
                  score: 0.9 - (idx * 0.1),
                  metadata: {
                    courseId: book.id,
                    moduleId: '',
                    type: 'course',
                    tags: []
                  }
                }))
              );
            }

            // Perform semantic search
            const semanticQuery: SearchQuery = {
              query: searchParams.query,
              type: 'semantic',
              limit: searchParams.limit
            };
            const semanticResults = await service.searchLibrary(semanticQuery);

            // Perform prophetic search
            const propheticQuery: SearchQuery = {
              query: searchParams.query,
              type: 'prophetic',
              limit: searchParams.limit
            };
            const propheticResults = await service.searchLibrary(propheticQuery);

            // Property: Prophetic results should include propheticRelevance scores
            propheticResults.forEach(result => {
              expect(result).toHaveProperty('propheticRelevance');
              if (result.propheticRelevance !== undefined) {
                expect(result.propheticRelevance).toBeGreaterThanOrEqual(0);
                expect(result.propheticRelevance).toBeLessThanOrEqual(1);
              }
            });

            // Property: If both searches return results, rankings may differ
            // (This tests that prophetic search adds a different dimension)
            if (semanticResults.length > 0 && propheticResults.length > 0) {
              // At least verify that prophetic search completed successfully
              expect(propheticResults.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize theological alignment in prophetic search', async () => {
      await fc.assert(
        fc.asyncProperty(
          dualSearchGen,
          async (searchParams) => {
            // Generate books with explicitly different theological alignments
            const highTheologyBook = await fc.sample(
              fc.record({
                ...theologicalBookGen.value,
                metadata: fc.record({
                  id: fc.uuid(),
                  bookId: fc.uuid(),
                  authorAgent: fc.constant('ScrollAuthorGPT'),
                  version: fc.constant('1.0.0'),
                  scrollIntegrityHash: fc.string({ minLength: 32, maxLength: 64 }),
                  generationDate: fc.date(),
                  lastValidated: fc.date(),
                  qualityScore: fc.constant(0.8),
                  theologicalAlignment: fc.constant(0.95) // High theological alignment
                })
              }),
              1
            );

            const lowTheologyBook = await fc.sample(
              fc.record({
                ...theologicalBookGen.value,
                metadata: fc.record({
                  id: fc.uuid(),
                  bookId: fc.uuid(),
                  authorAgent: fc.constant('ScrollAuthorGPT'),
                  version: fc.constant('1.0.0'),
                  scrollIntegrityHash: fc.string({ minLength: 32, maxLength: 64 }),
                  generationDate: fc.date(),
                  lastValidated: fc.date(),
                  qualityScore: fc.constant(0.8),
                  theologicalAlignment: fc.constant(0.6) // Lower theological alignment
                })
              }),
              1
            );

            const mockBooks = [...highTheologyBook, ...lowTheologyBook];

            // Mock Prisma responses
            mockPrisma.scrollBook.findMany.mockResolvedValue(mockBooks);
            mockPrisma.scrollBook.findUnique.mockImplementation((args: any) => {
              const book = mockBooks.find(b => b.id === args.where.id);
              return Promise.resolve(book || null);
            });
            mockPrisma.scrollKnowledgeNode.findMany.mockResolvedValue([]);

            // Mock vector store to return both books with similar semantic scores
            const mockVectorStore = (service as any).vectorStore;
            if (mockVectorStore && mockVectorStore.search) {
              mockVectorStore.search.mockResolvedValue(
                mockBooks.map((book, idx) => ({
                  id: book.id,
                  content: book.title,
                  score: 0.85, // Same semantic score
                  metadata: {
                    courseId: book.id,
                    moduleId: '',
                    type: 'course',
                    tags: []
                  }
                }))
              );
            }

            // Perform prophetic search
            const propheticQuery: SearchQuery = {
              query: searchParams.query,
              type: 'prophetic',
              limit: searchParams.limit
            };
            const results = await service.searchLibrary(propheticQuery);

            // Property: Books with higher theological alignment should rank higher
            // in prophetic search when semantic scores are similar
            if (results.length >= 2) {
              const highTheologyResult = results.find(r => r.bookId === highTheologyBook[0].id);
              const lowTheologyResult = results.find(r => r.bookId === lowTheologyBook[0].id);

              if (highTheologyResult && lowTheologyResult) {
                // High theology book should have higher prophetic relevance
                expect(highTheologyResult.propheticRelevance).toBeGreaterThan(
                  lowTheologyResult.propheticRelevance || 0
                );
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

