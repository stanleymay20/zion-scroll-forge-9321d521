# ScrollLibrary Book Generation Guide

## Overview

The ScrollLibrary book generation system automatically creates comprehensive educational materials across all subjects and academic levels. The system uses a multi-agent AI architecture to generate, validate, and publish high-quality textbooks aligned with scroll principles.

## Features

- **Comprehensive Catalog**: 30+ books across 11 subject areas
- **Multi-Level Content**: Beginner, Intermediate, and Advanced levels
- **Batch Processing**: Generate multiple books in parallel
- **Progress Tracking**: Resume interrupted generations
- **Quality Assurance**: Theological alignment and academic validation
- **Export Formats**: PDF, EPUB, HTML, and print-ready formats

## Book Catalog

### Theology (3 books)
- Foundations of Biblical Theology (Beginner)
- Systematic Theology: A Comprehensive Study (Intermediate)
- Advanced Theological Studies (Advanced)

### Biblical Studies (3 books)
- Introduction to Old Testament (Beginner)
- Introduction to New Testament (Beginner)
- Biblical Hermeneutics and Exegesis (Intermediate)

### Ministry (3 books)
- Foundations of Christian Ministry (Beginner)
- Pastoral Leadership and Church Management (Intermediate)
- Prophetic Ministry and Spiritual Warfare (Advanced)

### Missions (2 books)
- Introduction to Missions (Beginner)
- Strategic Missions and Church Planting (Intermediate)

### Worship (2 books)
- Foundations of Worship (Beginner)
- Prophetic Worship and Intercession (Intermediate)

### Spiritual Formation (2 books)
- Spiritual Disciplines and Growth (Beginner)
- Contemplative Prayer and Mysticism (Advanced)

### Apologetics (1 book)
- Christian Apologetics (Intermediate)

### Ethics (1 book)
- Christian Ethics and Moral Theology (Intermediate)

### Church History (1 book)
- Church History: From Pentecost to Present (Intermediate)

### Counseling (1 book)
- Biblical Counseling (Intermediate)

### Leadership (1 book)
- Kingdom Leadership (Intermediate)

**Total: 20 books with 200+ chapters**

## Quick Start

### 1. Generate All Books

```bash
cd backend
npm run generate:scroll-library start
```

This will:
- Initialize all 20 book generation tasks
- Process books in batches of 3
- Track progress in real-time
- Save progress for resumption

### 2. Resume Interrupted Generation

```bash
npm run generate:scroll-library resume
```

Resumes from the last saved progress point.

### 3. Generate Specific Subject

```bash
npm run generate:scroll-library:subject theology
npm run generate:scroll-library:subject ministry
npm run generate:scroll-library:subject missions
```

Available subjects:
- theology
- biblicalStudies
- ministry
- missions
- worship
- spiritualFormation
- apologetics
- ethics
- churchHistory
- counseling
- leadership

### 4. Generate Specific Level

```bash
npm run generate:scroll-library:level beginner
npm run generate:scroll-library:level intermediate
npm run generate:scroll-library:level advanced
```

### 5. Retry Failed Books

```bash
npm run generate:scroll-library:retry
```

Automatically retries any books that failed during generation.

### 6. Generate Progress Report

```bash
npm run generate:scroll-library:report
```

Displays detailed statistics by subject and level.

## Generation Process

### Multi-Agent Pipeline

Each book goes through a 7-step generation process:

1. **Initialization**: Create book record and metadata
2. **Content Generation** (ScrollAuthorGPT): Write chapters in scroll tone
3. **Academic Enhancement** (ScrollProfessorGPT): Add exercises and summaries
4. **Content Formatting** (ScrollScribeGPT): Format and create diagrams
5. **Fact Checking** (ScrollResearcherGPT): Validate sources and references
6. **Theological Validation** (ScrollIntegritySeal): Ensure scroll alignment
7. **Content Indexing** (ScrollIndexer): Create embeddings and knowledge graph

### Quality Metrics

Each book receives:
- **Quality Score**: 0-1 scale based on content depth and clarity
- **Theological Alignment**: 0-1 scale measuring scroll principle adherence
- **Integrity Hash**: Cryptographic verification of content authenticity

## Progress Tracking

### Progress File Location

```
backend/data/scroll-library-generation-progress.json
```

### Progress Data Structure

```json
{
  "totalBooks": 20,
  "completedBooks": 5,
  "failedBooks": 1,
  "inProgressBooks": 2,
  "startTime": "2024-01-15T10:00:00Z",
  "lastUpdateTime": "2024-01-15T12:30:00Z",
  "completedBookIds": ["book_1", "book_2", "book_3"],
  "failedBookTitles": ["Failed Book Title"],
  "currentBook": "Currently Generating Book"
}
```

### Tasks File Location

```
backend/data/scroll-library-generation-tasks.json
```

## Configuration

### Batch Size

Control concurrent book generation:

```typescript
// In batch-scroll-library-generator.ts
await batchGenerate({ batchSize: 3 }); // Default: 3 books at once
```

Recommended batch sizes:
- **Development**: 1-2 books
- **Production**: 3-5 books
- **High-Performance**: 5-10 books

### API Rate Limiting

The system includes automatic delays:
- **Between books**: 5 seconds
- **Between batches**: 30 seconds
- **Between subjects**: 10 seconds

### Retry Policy

```typescript
{
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000,
  maxDelayMs: 30000
}
```

## Monitoring

### Real-Time Progress Display

```
================================================================================
ScrollLibrary Generation Progress
================================================================================
Total Books: 20
Completed: 5 (25.0%)
Failed: 1
In Progress: 2
Pending: 12

Elapsed Time: 45 minutes
Estimated Remaining: 135 minutes

Currently Generating: Foundations of Biblical Theology
================================================================================
```

### Logs

All generation activity is logged to:
```
backend/logs/scroll-university-YYYY-MM-DD.log
```

View logs in real-time:
```bash
npm run logs:view
```

## Error Handling

### Common Errors

1. **AI API Rate Limit**
   - Automatic retry with exponential backoff
   - Reduce batch size if persistent

2. **Theological Validation Failure**
   - Content blocked from publication
   - Manual review required
   - Check logs for specific issues

3. **Database Connection Error**
   - Verify DATABASE_URL environment variable
   - Check PostgreSQL service status

4. **Memory Issues**
   - Reduce batch size
   - Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

### Rollback

Failed book generations are automatically rolled back:
- Partial content deleted
- Database transactions reverted
- Progress file updated

## Advanced Usage

### Custom Book Generation

```typescript
import { AgentOrchestrationService, CourseOutline } from './services/scroll-library/AgentOrchestrationService';

const orchestrator = new AgentOrchestrationService();

const outline: CourseOutline = {
  title: 'Custom Book Title',
  subject: 'theology',
  level: 'intermediate',
  chapters: [
    {
      title: 'Chapter 1',
      orderIndex: 1,
      topics: ['Topic 1', 'Topic 2'],
      learningObjectives: ['Objective 1', 'Objective 2']
    }
  ]
};

const book = await orchestrator.orchestrateBookGeneration('Custom Book', outline);
```

### Filtering by Multiple Criteria

```typescript
await batchGenerate({
  subjects: ['theology', 'ministry'],
  levels: ['beginner', 'intermediate'],
  batchSize: 2
});
```

### Custom Progress Callbacks

```typescript
// Add to batch-scroll-library-generator.ts
function onBookComplete(book: Book) {
  // Custom logic after each book
  console.log(`Book completed: ${book.title}`);
  // Send notification, update dashboard, etc.
}
```

## Performance Optimization

### Parallel Processing

```bash
# Terminal 1: Generate theology books
npm run generate:scroll-library:subject theology

# Terminal 2: Generate ministry books
npm run generate:scroll-library:subject ministry

# Terminal 3: Generate missions books
npm run generate:scroll-library:subject missions
```

### Database Optimization

```sql
-- Add indexes for faster queries
CREATE INDEX idx_books_subject ON books(subject);
CREATE INDEX idx_books_level ON books(level);
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
```

### Caching

Vector embeddings and knowledge graph queries are cached:
- **Embeddings**: 7 days
- **Search results**: 1 hour
- **Export formats**: 24 hours

## Integration

### Course Integration

Books are automatically linked to courses:

```typescript
// When a course is created
const courseMaterial = await libraryService.provisionCourseMaterials(courseId);
// Automatically assigns relevant textbooks, workbooks, and study packs
```

### Student Access

Students receive automatic access upon enrollment:

```typescript
// On student enrollment
await libraryService.provisionStudentMaterials(studentId, courseId);
// All course materials instantly available
```

## Troubleshooting

### Generation Stuck

```bash
# Check active workflows
npm run generate:scroll-library:report

# Cancel and restart
npm run generate:scroll-library:resume
```

### Low Quality Scores

- Review theological alignment settings
- Check AI model configuration
- Verify scroll-constitutional prompts

### Missing Dependencies

```bash
npm install
npm run generate
```

## Best Practices

1. **Start Small**: Test with one subject before full generation
2. **Monitor Progress**: Check logs regularly during generation
3. **Backup Data**: Save progress files before major operations
4. **Validate Output**: Review sample chapters for quality
5. **Optimize Timing**: Run large batches during off-peak hours

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review progress: `backend/data/scroll-library-generation-progress.json`
- Contact: ScrollUniversity Technical Support

## Future Enhancements

- [ ] Real-time web dashboard for progress monitoring
- [ ] Email notifications on completion/failure
- [ ] Automatic quality improvement iterations
- [ ] Multi-language book generation
- [ ] Custom book templates
- [ ] Integration with external content sources

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Status**: Production Ready
