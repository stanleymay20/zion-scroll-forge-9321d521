import { LibraryManagementService, BookInput, SearchQuery } from '../LibraryManagementService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../utils/logger');

describe('LibraryManagementService', () => {
  let service: LibraryManagementService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new LibraryManagementService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBook', () => {
    it('should create a new book successfully', async () => {
      // Arrange
      const bookData: BookInput = {
        title: 'Foundations of Faith',
        subtitle: 'A Biblical Worldview',
        subject: 'Theology',
        level: 'intermediate',
        courseReference: 'THEO-201'
      };

      // Act
      const result = await service.createBook(bookData);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(bookData.title);
      expect(result.subtitle).toBe(bookData.subtitle);
      expect(result.subject).toBe(bookData.subject);
      expect(result.level).toBe(bookData.level);
      expect(result.courseReference).toBe(bookData.courseReference);
      expect(result.metadata.authorAgent).toBe('ScrollAuthorGPT');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(logger.info).toHaveBeenCalledWith(
        'Creating new book',
        { bookData }
      );
    });

    it('should handle missing optional fields', async () => {
      // Arrange
      const bookData: BookInput = {
        title: 'Essential Book',
        subject: 'Philosophy',
        level: 'beginner'
      };

      // Act
      const result = await service.createBook(bookData);

      // Assert
      expect(result.title).toBe(bookData.title);
      expect(result.subtitle).toBeUndefined();
      expect(result.courseReference).toBeUndefined();
      expect(result.subject).toBe(bookData.subject);
      expect(result.level).toBe(bookData.level);
    });
  });

  describe('updateBook', () => {
    it('should update existing book', async () => {
      // Arrange
      const bookId = 'book_123';
      const updates = {
        title: 'Updated Title',
        subtitle: 'Updated Subtitle'
      };

      // Mock getBook to return existing book
      jest.spyOn(service, 'getBook').mockResolvedValue({
        id: bookId,
        title: 'Original Title',
        subject: 'Theology',
        level: 'intermediate',
        chapters: [],
        diagrams: [],
        metadata: {
          authorAgent: 'ScrollAuthorGPT',
          version: '1.0.0',
          scrollIntegrityHash: '',
          generationDate: new Date(),
          lastValidated: new Date(),
          qualityScore: 0.95,
          theologicalAlignment: 0.98
        },
        integrityHash: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      const result = await service.updateBook(bookId, updates);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(bookId);
      expect(result.title).toBe(updates.title);
      expect(result.subtitle).toBe(updates.subtitle);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(logger.info).toHaveBeenCalledWith(
        'Updating book',
        { bookId, updates }
      );
    });
  });

  describe('deleteBook', () => {
    it('should delete book successfully', async () => {
      // Arrange
      const bookId = 'book_456';

      // Act
      await service.deleteBook(bookId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Deleting book',
        { bookId }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Book deleted successfully',
        { bookId }
      );
    });
  });

  describe('getBook', () => {
    it('should retrieve book by ID', async () => {
      // Arrange
      const bookId = 'book_789';

      // Act
      const result = await service.getBook(bookId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(bookId);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.qualityScore).toBeGreaterThan(0);
      expect(result.metadata.theologicalAlignment).toBeGreaterThan(0);
      expect(logger.info).toHaveBeenCalledWith(
        'Retrieving book',
        { bookId }
      );
    });
  });

  describe('searchLibrary', () => {
    it('should perform semantic search', async () => {
      // Arrange
      const query: SearchQuery = {
        query: 'biblical worldview',
        type: 'semantic',
        limit: 10
      };

      // Act
      const results = await service.searchLibrary(query);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Searching library',
        { query }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Library search completed',
        expect.objectContaining({
          queryType: 'semantic',
          resultCount: expect.any(Number)
        })
      );
    });

    it('should perform prophetic search', async () => {
      // Arrange
      const query: SearchQuery = {
        query: 'divine calling',
        type: 'prophetic',
        filters: {
          subject: 'Theology',
          level: 'advanced'
        }
      };

      // Act
      const results = await service.searchLibrary(query);

      // Assert
      expect(results).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'Library search completed',
        expect.objectContaining({
          queryType: 'prophetic'
        })
      );
    });

    it('should perform keyword search', async () => {
      // Arrange
      const query: SearchQuery = {
        query: 'trinity doctrine',
        type: 'keyword',
        limit: 5
      };

      // Act
      const results = await service.searchLibrary(query);

      // Assert
      expect(results).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'Library search completed',
        expect.objectContaining({
          queryType: 'keyword'
        })
      );
    });
  });

  describe('getCourseMaterials', () => {
    it('should retrieve course materials', async () => {
      // Arrange
      const courseId = 'THEO-101';

      // Act
      const result = await service.getCourseMaterials(courseId);

      // Assert
      expect(result).toBeDefined();
      expect(result.courseId).toBe(courseId);
      expect(result.textbookId).toBeDefined();
      expect(result.lectureSlides).toBeDefined();
      expect(Array.isArray(result.lectureSlides)).toBe(true);
      expect(result.pastQuestions).toBeDefined();
      expect(result.readingList).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'Retrieving course materials',
        { courseId }
      );
    });
  });

  describe('indexContent', () => {
    it('should index book content for search', async () => {
      // Arrange
      const bookId = 'book_search_123';

      // Mock getBook
      jest.spyOn(service, 'getBook').mockResolvedValue({
        id: bookId,
        title: 'Test Book',
        subject: 'Theology',
        level: 'intermediate',
        chapters: [],
        diagrams: [],
        metadata: {
          authorAgent: 'ScrollAuthorGPT',
          version: '1.0.0',
          scrollIntegrityHash: '',
          generationDate: new Date(),
          lastValidated: new Date(),
          qualityScore: 0.95,
          theologicalAlignment: 0.98
        },
        integrityHash: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      await service.indexContent(bookId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Indexing book content',
        { bookId }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Content indexing completed',
        { bookId }
      );
    });
  });

  describe('validateContent', () => {
    it('should validate content integrity', async () => {
      // Arrange
      const bookId = 'book_validate_456';

      // Mock getBook
      jest.spyOn(service, 'getBook').mockResolvedValue({
        id: bookId,
        title: 'Validation Test Book',
        subject: 'Theology',
        level: 'advanced',
        chapters: [],
        diagrams: [],
        metadata: {
          authorAgent: 'ScrollAuthorGPT',
          version: '1.0.0',
          scrollIntegrityHash: 'valid_hash',
          generationDate: new Date(),
          lastValidated: new Date(),
          qualityScore: 0.92,
          theologicalAlignment: 0.96
        },
        integrityHash: 'valid_hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      const result = await service.validateContent(bookId);

      // Assert
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Validating content',
        { bookId }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Content validation completed',
        { bookId, isValid: true }
      );
    });
  });
});