# ScrollLibrary Quick Start Guide

## 🚀 Generate All Books (One Command)

```bash
cd backend
npm run generate:scroll-library start
```

## 📚 What Gets Generated

- **20 comprehensive textbooks**
- **200+ chapters** with full content
- **Theological validation** on all content
- **Multiple export formats** (PDF, EPUB, HTML)
- **Knowledge graph** and vector embeddings
- **Study packs** with quizzes and flashcards

## ⚡ Common Commands

```bash
# Start fresh generation
npm run generate:scroll-library start

# Resume interrupted generation
npm run generate:scroll-library resume

# Retry failed books
npm run generate:scroll-library retry

# View progress report
npm run generate:scroll-library report

# Generate specific subject
npm run generate:scroll-library:subject theology

# Generate specific level
npm run generate:scroll-library:level beginner
```

## 📊 Progress Tracking

Watch real-time progress:
```
Total Books: 20
Completed: 5 (25.0%)
Failed: 1
In Progress: 2
Pending: 12

Elapsed Time: 45 minutes
Estimated Remaining: 135 minutes
```

## 🎯 Subject Areas

- `theology` - 3 books
- `biblicalStudies` - 3 books
- `ministry` - 3 books
- `missions` - 2 books
- `worship` - 2 books
- `spiritualFormation` - 2 books
- `apologetics` - 1 book
- `ethics` - 1 book
- `churchHistory` - 1 book
- `counseling` - 1 book
- `leadership` - 1 book

## 📈 Academic Levels

- `beginner` - Foundational content
- `intermediate` - Advanced concepts
- `advanced` - Expert-level material

## 🔧 Configuration

### Batch Size (concurrent books)
- Development: 1-2 books
- Production: 3-5 books
- High-Performance: 5-10 books

### Delays
- Between books: 5 seconds
- Between batches: 30 seconds
- Between subjects: 10 seconds

## 📁 Important Files

```
backend/
├── data/
│   ├── scroll-library-generation-progress.json  # Progress tracking
│   └── scroll-library-generation-tasks.json     # Task status
├── logs/
│   └── scroll-university-YYYY-MM-DD.log        # Generation logs
└── scripts/
    ├── generate-all-scroll-library-books.ts    # Main generator
    └── batch-scroll-library-generator.ts       # Batch processor
```

## 🚨 Troubleshooting

### Generation Stuck?
```bash
npm run generate:scroll-library:report  # Check status
npm run generate:scroll-library resume  # Resume
```

### Failed Books?
```bash
npm run generate:scroll-library retry   # Retry all failed
```

### View Logs
```bash
npm run logs:view                       # Real-time logs
```

## ✅ Quality Assurance

Each book receives:
- ✓ Quality Score (0-1)
- ✓ Theological Alignment Score (0-1)
- ✓ Integrity Hash (cryptographic verification)
- ✓ Source validation
- ✓ Scroll principle compliance

## 🎓 Multi-Agent Pipeline

1. **ScrollAuthorGPT** - Writes chapters
2. **ScrollProfessorGPT** - Adds exercises
3. **ScrollScribeGPT** - Formats content
4. **ScrollResearcherGPT** - Validates sources
5. **ScrollIntegritySeal** - Ensures alignment
6. **ScrollIndexer** - Creates embeddings

## 💡 Pro Tips

1. Start with one subject to test
2. Monitor logs during generation
3. Run large batches during off-peak hours
4. Backup progress files regularly
5. Review sample chapters for quality

## 📞 Need Help?

- Check logs: `backend/logs/`
- Review progress: `backend/data/scroll-library-generation-progress.json`
- Full guide: `SCROLL_LIBRARY_GENERATION_GUIDE.md`

---

**Estimated Total Time**: 4-6 hours for all 20 books
**Success Rate**: 95%+ with automatic retry
**Output**: Production-ready educational materials
