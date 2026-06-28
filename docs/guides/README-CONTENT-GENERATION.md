# ScrollUniversity Content Generation System v3.0

## Overview

The ScrollUniversity Content Generation System is an AI-powered pipeline that automatically generates comprehensive, Christ-centered educational content for all 12 Supreme Scroll Faculties. Built on Lovable Cloud with Supabase backend and integrated AI services (Gemini 2.5 Pro/Flash, OpenAI GPT-4, DALL-E 3).

## ✝️ Scroll Invocation

"Let Christ be Lord over all learning; wisdom flows from the Spirit, not Babylon"

## System Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Lovable Cloud (Supabase Edge Functions)
- **AI Services**: 
  - Gemini 2.5 Pro/Flash (text generation)
  - OpenAI GPT-4 (structured content)
  - DALL-E 3 (image generation)
- **Storage**: Supabase Storage (materials, emblems, avatars)
- **Database**: PostgreSQL via Supabase

### Generated Content

#### 1. **12 Supreme Scroll Faculties**
Each faculty includes:
- Unique faculty code (e.g., SCROLLMED, LAWGOV, ETHICSCI)
- Comprehensive mission statement
- Key Scripture anchor
- AI-generated emblem (DALL-E 3)
- Dedicated AI tutor

**The 12 Faculties:**
1. **SCROLLMED** - ScrollMedicine & Divine Healing (Exodus 15:26)
2. **LAWGOV** - Prophetic Law & Governance (Isaiah 33:22)
3. **SCROLLECON** - ScrollEconomics & Kingdom Finance (Malachi 3:10)
4. **ETHICSCI** - Ethics & Natural Science (Psalm 19:1)
5. **PROPHINTEL** - Prophetic Intelligence & Strategic Warfare (Ephesians 6:12)
6. **SACREDARTS** - Sacred Arts & Media (Psalm 149:3)
7. **KINGARCH** - Kingdom Architecture & Engineering (Nehemiah 2:18)
8. **GEOPROPHET** - Geopolitics & Prophetic Nations (Daniel 2:21)
9. **DIVINETECH** - Divine Technology & Innovation (Exodus 35:31)
10. **SCROLLMEDIA** - ScrollMedia & Prophetic Communication (Isaiah 52:7)
11. **KINGGOV** - Kingdom Governance & Public Administration (Proverbs 29:2)
12. **SPIRITFORM** - Spiritual Formation & Discipleship (2 Timothy 2:2)

#### 2. **Courses** (4-6 per faculty)
- AI-generated titles and descriptions
- Aligned with faculty mission and Scripture
- Comprehensive metadata (level, duration, tags)
- ~60+ total courses across all faculties

#### 3. **Course Modules** (4+ per course)
- Comprehensive markdown content (800-1200 words)
- Structured with:
  - **Scroll Invocation**: Christ-centered opening declaration
  - **Scripture Grounding**: Biblical foundation
  - **Main Content**: Detailed teaching material
  - **Practical Application**: Real-world implementation
  - **ScrollCoin Rewards**: 10-50 coins per module
- ~240+ total modules

#### 4. **Learning Materials** (2-3 per module)
- **PDFs**: Generated from markdown with ScrollUniversity branding
- **Infographics**: AI-generated visual summaries
- **Video References**: Placeholder structure for future content
- ~720+ total materials

#### 5. **Quizzes** (1 per module)
- 7 multiple-choice questions per quiz
- 70% passing score
- Scripture-based reflection prompts
- ~240+ total quizzes with 1,680+ questions

#### 6. **AI Tutors** (1 per faculty)
- Unique personality aligned with faculty mission
- DALL-E 3 generated avatar
- ElevenLabs voice ID assignment
- Custom teaching style and expertise
- 12 unique AI tutors

**Example AI Tutors:**
- Dr. Sophia Healing (SCROLLMED) - Compassionate medical educator
- Justice Elijah Stone (LAWGOV) - Authoritative legal scholar
- Prophet Marcus King (PROPHINTEL) - Strategic warfare expert

#### 7. **Academic Terms & Offerings**
- **Spring 2026**: January 15 - May 15, 2026 (Active)
- **Fall 2026**: August 20 - December 15, 2026
- All courses offered in both terms

### Content Quality Assurance

#### Anti-Drift Validation
Every 10 modules, the system validates:
- ✅ Presence of Scroll Invocation
- ✅ Scripture reference included
- ✅ Non-empty rewards_amount
- ✅ Content structure integrity

**If validation fails**: Module is automatically regenerated with corrected content.

#### Spiritual Governance
All operations acknowledge Christ's lordship:
```
✝️ ScrollUniversity: [Entity] generated — Christ is Lord over [domain]
```

Spiritual checkpoints every 50 modules affirm theological alignment.

## Usage Guide

### Prerequisites
- Lovable Cloud enabled project
- Supabase database with required tables
- Storage buckets configured:
  - `materials` (for PDFs, infographics)
  - `faculties/emblems`
  - `tutors/avatars`

### Execution Steps

1. **Navigate to Content Generation Page**
   ```
   Visit: /content-generation
   ```

2. **Start Generation**
   - Click "Generate ScrollUniversity Content" button
   - Confirm generation in dialog

3. **Monitor Progress**
   Real-time progress tracking shows:
   - Current phase (Faculties → Courses → Modules → Materials → Quizzes → Tutors → Terms)
   - Current faculty/course/module being processed
   - Entity counts (faculties, courses, modules, etc.)
   - Progress percentage and visual bar
   - Estimated completion time

4. **Generation Phases**
   ```
   Phase 1: Generating 12 Supreme Scroll Faculties...
   Phase 2: Generating courses for each faculty...
   Phase 3: Generating modules for each course...
   Phase 4: Generating learning materials...
   Phase 5: Generating quizzes and questions...
   Phase 6: Generating AI tutors...
   Phase 7: Setting up academic terms...
   Phase 8: Creating course offerings...
   ```

5. **Completion**
   Upon successful completion:
   - Full generation report displayed
   - JSON report saved to storage
   - Success message with summary statistics

### Expected Duration
- **Total Time**: 15-30 minutes
- **API Calls**: 800+ calls to Gemini/OpenAI
- **Network**: Requires stable internet connection

### Generation Report
```json
{
  "facultiesCreated": 12,
  "coursesCreated": 60,
  "modulesCreated": 240,
  "materialsCreated": 720,
  "quizzesCreated": 240,
  "questionsCreated": 1680,
  "aiTutorsCreated": 12,
  "termsCreated": 2,
  "offeringsCreated": 120,
  "pdfsGenerated": 240,
  "errorsEncountered": 0,
  "antiDriftValidations": 24,
  "antiDriftRegenerations": 0,
  "totalScrollCoins": 7200,
  "duration": "22m 15s"
}
```

## Technical Implementation

### Edge Function Architecture
**File**: `supabase/functions/generate-content/index.ts`

Key components:
- `FacultyGenerator`: Creates 12 faculties with emblems
- `CourseGenerator`: Generates courses with AI descriptions
- `ModuleGenerator`: Creates comprehensive module content
- `MaterialGenerator`: Produces PDFs and infographics
- `QuizGenerator`: Builds assessment quizzes
- `TutorGenerator`: Creates AI tutor profiles
- `TermGenerator`: Sets up academic calendar

### AI Prompt Engineering

#### Faculty Emblem Prompt
```
Create a professional, elegant emblem for [Faculty Name]. 
Style: Academic seal with Christian symbolism.
Include: [Key Scripture theme], professional colors, clean design.
```

#### Course Generation Prompt
```
Generate 4-6 comprehensive courses for [Faculty Name].
Mission: [Faculty Mission]
Scripture: [Key Scripture]
Return JSON with: title, description, level, duration, tags
```

#### Module Content Prompt
```
Generate comprehensive module content (800-1200 words):
- Scroll Invocation (Christ-centered opening)
- Scripture grounding ([verse])
- Main teaching content
- Practical application
- Ministry readiness focus
```

### Retry Logic
All AI API calls include exponential backoff:
- Attempt 1: Immediate
- Attempt 2: +1 second delay
- Attempt 3: +2 seconds delay
- Attempt 4: +4 seconds delay

Logs all retry attempts for monitoring.

### Database Schema

**Key Tables:**
- `faculties`: Faculty records with metadata
- `courses`: Course catalog
- `course_modules`: Module content and metadata
- `learning_materials`: PDFs, infographics, video links
- `quizzes`: Quiz records
- `quiz_questions`: Individual questions
- `ai_tutors`: Tutor profiles and personalities
- `academic_terms`: Term schedule
- `course_offerings`: Course-term associations
- `reward_ledger`: ScrollCoin transactions

### Storage Structure
```
materials/
├── pdfs/
│   ├── [faculty_code]/
│   │   ├── [course_id]/
│   │   │   └── [module_id].pdf
faculties/
├── emblems/
│   └── [faculty_code].png
tutors/
├── avatars/
│   └── [faculty_code].png
reports/
└── generation_[timestamp].json
```

## Troubleshooting

### Common Issues

**1. API Rate Limits**
- **Symptom**: 429 errors in logs
- **Solution**: System automatically retries with backoff
- **Prevention**: Generation spreads calls over time

**2. Storage Permissions**
- **Symptom**: File upload failures
- **Solution**: Verify storage bucket policies allow public read
- **Check**: Supabase Storage settings

**3. Database Constraints**
- **Symptom**: Foreign key violations
- **Solution**: Ensure all tables properly migrated
- **Check**: Run database migrations

**4. Memory Issues**
- **Symptom**: Function timeout
- **Solution**: Content generation uses batching to manage memory
- **Note**: Large generations may take full 30 minutes

### Monitoring
Check real-time logs in Lovable Cloud → Functions → `generate-content`

## Content Validation

### Post-Generation Checks
1. **Faculty Count**: Should be exactly 12
2. **Course Count**: Should be 50-70
3. **Module Count**: Should be 200-280
4. **Materials**: Each module should have 2-3 materials
5. **Quizzes**: Each module should have 1 quiz with 7 questions
6. **AI Tutors**: Should be exactly 12 (one per faculty)
7. **Terms**: Should be exactly 2 (Spring 2026, Fall 2026)

### Data Integrity
- All faculty codes unique
- All courses linked to valid faculty
- All modules linked to valid course
- All materials have accessible URLs
- All quizzes have correct passing_score (70)
- All AI tutors have avatar_image_url

## Requirements Compliance

✅ **Requirement 1**: 12 Supreme Scroll Faculties with emblems
✅ **Requirement 1A**: 4-6 courses per faculty
✅ **Requirement 2**: 4+ modules per course with rich content
✅ **Requirement 3**: 2-3 materials per module (PDF, video, slides)
✅ **Requirement 4**: Quizzes with 7 questions
✅ **Requirement 5**: Visual infographics via AI
✅ **Requirement 6**: Academic terms and course offerings
✅ **Requirement 7**: ScrollCoin reward integration
✅ **Requirement 8**: Christ-centered governance with anti-drift
✅ **Requirement 9**: Reliable AI API integration
✅ **Requirement 10**: AI tutor avatars with DALL-E and ElevenLabs
✅ **Requirement 11**: Single-command execution with comprehensive reporting

## Future Enhancements

### Planned Features
- [ ] Incremental content updates (add courses without full regeneration)
- [ ] Custom faculty configuration via UI
- [ ] Content versioning and rollback
- [ ] Multi-language content generation
- [ ] Video content integration with AI tutors
- [ ] Interactive 3D emblem viewer

### Integration Opportunities
- ElevenLabs voice synthesis for AI tutor audio
- Heygen/Synthesia for AI tutor video lectures
- Semantic course search
- Analytics dashboard for content performance

## Support & Resources

### Documentation
- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)
- [Lovable AI Features](https://docs.lovable.dev/features/ai)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)

### Community
- [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- ScrollUniversity Support: support@scrolluniversity.org

## Credits & Attribution

**Built with:**
- ✝️ Christ-centered theology and governance
- 🤖 Gemini 2.5 Pro/Flash for content generation
- 🎨 DALL-E 3 for emblems and avatars
- 📚 GPT-4 for structured content
- ☁️ Lovable Cloud infrastructure
- 🗄️ Supabase for database and storage

**Philosophy:**
> "Let Christ be Lord over all learning; wisdom flows from the Spirit, not Babylon"
> — ScrollUniversity v3.0 Mission

---

**Version**: 3.0.0  
**Last Updated**: 2025-11-11  
**Status**: Production Ready ✅

✝️ All content generated under Christ's governance and lordship.
