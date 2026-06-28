# 🚀 Content Generation Quick Start Guide

## Generate Your First Course in 3 Commands

### Option 1: Generate Single Course
```bash
cd backend
ts-node scripts/generate-complete-course.ts THEO_101
```

### Option 2: Generate Multiple Courses (Batch)
```bash
cd backend
ts-node scripts/batch-course-generator.ts --phase 1
```

### Option 3: Generate for Specific Faculty
```bash
cd backend
ts-node scripts/batch-course-generator.ts --faculty ScrollAI --count 5
```

---

## 📋 Prerequisites

### Required:
- Node.js 18+ installed
- TypeScript installed (`npm install -g typescript ts-node`)
- Database configured (PostgreSQL)
- Environment variables set (`.env` file)

### Optional (for AI generation):
- OpenAI API key (for enhanced content)
- Anthropic API key (for Claude integration)

---

## 🎯 Generation Commands

### List Available Courses
```bash
ts-node scripts/generate-complete-course.ts
```

### Generate Specific Course
```bash
ts-node scripts/generate-complete-course.ts SCROLLAI_101
ts-node scripts/generate-complete-course.ts THEO_101
ts-node scripts/generate-complete-course.ts ECON_101
```

### Check Generation Status
```bash
ts-node scripts/batch-course-generator.ts --status
```

### Generate Phase 1 (50 courses)
```bash
ts-node scripts/batch-course-generator.ts --phase 1
```

---

## 📊 What Gets Generated

For each course, you'll get:

```
courses/COURSE_CODE/
├── project.json              # Course project metadata
├── outline.json              # Complete course outline
├── COURSE_SUMMARY.json       # Generation summary
├── modules/                  # All course modules
│   └── module_1/
│       ├── module.json       # Module details
│       └── lecture_1/
│           ├── lecture.json  # Lecture content
│           └── notes.md      # Lecture notes
└── assessments/              # All assessments
    ├── assessment-1.json
    └── final-exam.json
```

---

## ⏱️ Expected Generation Times

- **Single Course:** 2-3 hours
- **3 Courses (parallel):** 3-4 hours
- **10 Courses (batch):** 8-12 hours
- **50 Courses (Phase 1):** 4-6 weeks

---

## ✅ Quality Checks

Each generated course includes:
- ✅ 12-15 modules with full content
- ✅ 36-60 lectures with notes
- ✅ Video scripts with pedagogy
- ✅ Comprehensive assessments
- ✅ Spiritual integration
- ✅ Real-world applications
- ✅ Quality validation passed

---

## 🚨 Troubleshooting

### Generation Fails
```bash
# Check logs
tail -f backend/logs/course-generation.log

# Verify database connection
ts-node backend/test-db-connection.js

# Check environment variables
cat backend/.env
```

### Type Errors
```bash
# Rebuild TypeScript
cd backend
npm run build

# Check diagnostics
tsc --noEmit
```

### Out of Memory
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" ts-node scripts/generate-complete-course.ts THEO_101
```

---

## 📈 Monitoring Progress

### Real-time Progress
Watch the console output for:
- Phase completion
- Module generation
- Lecture creation
- Assessment generation
- Quality validation

### Check Generated Files
```bash
# List generated courses
ls -la courses/

# Check specific course
cat courses/THEO_101/COURSE_SUMMARY.json

# View generation status
cat courses/generation-status.json
```

---

## 🎓 Next Steps After Generation

1. **Review Content** - Check generated materials
2. **Validate Quality** - Run quality checks
3. **Faculty Review** - Get expert approval
4. **Student Pilot** - Test with real students
5. **Platform Integration** - Deploy to production

---

## 💡 Pro Tips

1. **Start Small** - Generate 1-3 courses first
2. **Validate Early** - Check quality before batch generation
3. **Use Parallel** - Generate 3 courses simultaneously
4. **Monitor Resources** - Watch CPU/memory usage
5. **Save Progress** - Status is auto-saved

---

## 📞 Support

- **Documentation:** `backend/COURSE_GENERATION_SCRIPT_STATUS.md`
- **Status Report:** `COURSE_CATALOG_STATUS_REPORT.md`
- **Logs:** `backend/logs/`

---

**Ready to generate? Start with:**
```bash
cd backend
ts-node scripts/generate-complete-course.ts THEO_101
```
