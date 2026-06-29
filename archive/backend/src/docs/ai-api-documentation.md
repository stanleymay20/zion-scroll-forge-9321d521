# ScrollUniversity AI API Documentation
**"The Spirit of truth will guide you into all truth" - John 16:13**

## Overview

The ScrollUniversity AI API provides unified access to 15 AI automation services through a consistent RESTful interface. All endpoints require authentication and implement rate limiting for cost control and security.

## Base URL

```
Production: https://api.scrolluniversity.com/api/ai-unified
Development: http://localhost:3001/api/ai-unified
```

## Authentication

All API requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting

- **Default Limit**: 100 requests per hour per user
- **Response Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

## Standard Response Format

All endpoints return responses in this format:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    service: string;
    confidence?: number;
    cost?: number;
    processingTime?: number;
    humanReviewRequired?: boolean;
  };
}
```

## Available Services

### 1. Student Support Chatbot

#### POST /chatbot/query
Handle student support queries with 24/7 AI assistance.

**Request:**
```json
{
  "query": "How do I reset my password?",
  "conversationId": "optional-conversation-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "To reset your password, visit...",
    "confidence": 0.95,
    "sources": ["Policy Document", "FAQ"],
    "suggestedActions": ["Reset Password Link"],
    "needsEscalation": false
  },
  "metadata": {
    "service": "chatbot",
    "confidence": 0.95,
    "processingTime": 1200,
    "humanReviewRequired": false
  }
}
```

### 2. Automated Grading

#### POST /grading/submit
Submit assignments for AI-powered grading.

**Request:**
```json
{
  "assignmentId": "assignment-123",
  "submission": "student code or essay content",
  "type": "code" | "essay" | "math"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": 85,
    "correctness": 90,
    "style": 80,
    "feedback": "Detailed feedback...",
    "confidence": 0.92
  },
  "metadata": {
    "service": "grading",
    "confidence": 0.92,
    "processingTime": 3500,
    "humanReviewRequired": false
  }
}
```

### 3. Content Creation

#### POST /content/generate-lecture
Generate comprehensive lecture content (Faculty only).

**Request:**
```json
{
  "outline": "Introduction to AI Ethics",
  "objectives": ["Understand AI bias", "Learn ethical frameworks"],
  "courseId": "course-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "introduction": "...",
    "mainContent": [...],
    "examples": [...],
    "biblicalIntegration": {...},
    "discussionQuestions": [...]
  },
  "metadata": {
    "service": "content-creation",
    "processingTime": 8000,
    "humanReviewRequired": true
  }
}
```

#### POST /content/generate-assessment
Generate unique assessments (Faculty only).

**Request:**
```json
{
  "topic": "Machine Learning Basics",
  "difficulty": "intermediate",
  "count": 10,
  "type": "multiple-choice"
}
```

### 4. Personalized Learning

#### GET /personalization/profile
Get student's learning profile and analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "strengths": ["Mathematics", "Critical Thinking"],
    "weaknesses": ["Writing", "Time Management"],
    "learningStyle": "visual",
    "pace": "moderate",
    "riskLevel": "low"
  }
}
```

#### POST /personalization/recommendations
Get personalized resource recommendations.

**Request:**
```json
{
  "topic": "Data Structures",
  "courseId": "cs-101"
}
```

### 5. Academic Integrity

#### POST /integrity/check
Check submission for plagiarism, AI content, and collusion (Faculty only).

**Request:**
```json
{
  "submissionId": "sub-123",
  "content": "submission text",
  "studentId": "student-456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallSimilarity": 15,
    "aiContentProbability": 0.05,
    "recommendation": "clear",
    "flaggedSections": []
  },
  "metadata": {
    "service": "integrity",
    "processingTime": 5000,
    "humanReviewRequired": false
  }
}
```

### 6. Admissions Processing

#### POST /admissions/score
Score admissions application (Admissions staff only).

**Request:**
```json
{
  "applicationId": "app-789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "academicScore": 85,
    "spiritualMaturityScore": 90,
    "leadershipScore": 75,
    "overallScore": 83,
    "recommendation": "accept",
    "reasoning": [...]
  }
}
```

### 7. Research Assistant

#### POST /research/literature-review
Conduct AI-powered literature review.

**Request:**
```json
{
  "topic": "Quantum Computing Applications",
  "scope": "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "keyPapers": [...],
    "researchGaps": [...],
    "methodologies": [...],
    "synthesisMap": {...}
  }
}
```

### 8. Course Recommendations

#### POST /courses/recommend
Get personalized course recommendations.

**Request:**
```json
{
  "semester": "Fall 2024",
  "major": "Computer Science",
  "goals": ["Graduate in 4 years", "Prepare for AI career"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "course": {...},
      "relevanceScore": 0.95,
      "difficultyMatch": 0.88,
      "reasoning": "..."
    }
  ]
}
```

### 9. Faculty Support

#### POST /faculty/answer-question
AI teaching assistant answers student questions (Faculty only).

**Request:**
```json
{
  "question": "What is the difference between supervised and unsupervised learning?",
  "courseId": "ml-101"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Detailed answer...",
    "confidence": 0.93,
    "sources": [...],
    "professorReviewNeeded": false
  }
}
```

### 10. Translation & Localization

#### POST /translation/translate
Translate content to target language.

**Request:**
```json
{
  "content": "Welcome to ScrollUniversity",
  "targetLanguage": "es",
  "contentType": "course-material"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translatedText": "Bienvenido a ScrollUniversity",
    "confidence": 0.98,
    "reviewRequired": false
  }
}
```

### 11. Spiritual Formation

#### POST /spiritual/analyze-checkin
Analyze spiritual check-in responses.

**Request:**
```json
{
  "checkIn": {
    "mood": "peaceful",
    "prayerLife": "consistent",
    "struggles": "time management",
    "breakthroughs": "deeper understanding of grace"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "growthAreas": [...],
    "struggles": [...],
    "recommendedScripture": [...],
    "advisorAlert": false
  }
}
```

### 12. Fundraising & Donor Management

#### POST /fundraising/analyze-donor
Analyze donor giving patterns (Admin only).

**Request:**
```json
{
  "donorId": "donor-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "givingCapacity": "high",
    "interests": ["scholarships", "technology"],
    "optimalAskAmount": 50000,
    "nextSteps": [...]
  }
}
```

### 13. Career Services

#### POST /career/match
Match student to career paths.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "career": "AI Engineer",
      "matchScore": 0.92,
      "requiredSkills": [...],
      "skillGaps": [...],
      "salaryRange": "$80k-$150k"
    }
  ]
}
```

### 14. Content Moderation

#### POST /moderation/check
Check content for policy violations (Staff only).

**Request:**
```json
{
  "content": "user post content",
  "contentType": "discussion-post"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "approved": true,
    "violations": [],
    "severity": "low",
    "recommendedAction": "approve"
  }
}
```

### 15. Accessibility Compliance

#### POST /accessibility/generate-alt-text
Generate alt text for images.

**Request:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "context": "course diagram"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "altText": "Diagram showing the relationship between...",
    "confidence": 0.95
  }
}
```

## Health Check

#### GET /health
Check health status of all AI services.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "openai": "operational",
      "vectorStore": "operational",
      "cache": "operational"
    },
    "uptime": 99.9
  }
}
```

## Error Codes

- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions for requested operation
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side error occurred
- **503 Service Unavailable**: AI service temporarily unavailable

## Best Practices

1. **Always check `humanReviewRequired`**: Some responses require human oversight
2. **Handle rate limits gracefully**: Implement exponential backoff
3. **Cache responses when appropriate**: Reduce costs and improve performance
4. **Monitor confidence scores**: Low confidence may indicate need for human review
5. **Respect theological alignment**: All content is reviewed for doctrinal accuracy

## Cost Management

- Monitor `metadata.cost` in responses to track AI spending
- Use caching to reduce redundant API calls
- Implement batch processing for bulk operations
- Set budget alerts at organizational level

## Support

For API support, contact:
- Technical Support: tech@scrolluniversity.com
- Documentation: https://docs.scrolluniversity.com/ai-api
- Status Page: https://status.scrolluniversity.com
