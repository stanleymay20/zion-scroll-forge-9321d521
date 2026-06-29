# AI Tutor Service API Documentation

## Overview

The AI Tutor Service provides comprehensive, world-class tutoring powered by GPT-4o+ with specialized personalities for different academic domains. The service includes:

- **Real-time interaction** with streaming responses
- **Conversation context management** using Redis caching
- **Multiple tutor personalities** (General, Math, Science, Theology, Programming, Business, Engineering)
- **Session analytics** tracking response time, satisfaction, and effectiveness
- **Persistent conversation history** for continuity across sessions

## Architecture

### Components

1. **AITutorService** - Core service handling AI interactions
2. **Redis Cache** - Fast conversation context storage
3. **PostgreSQL** - Persistent session and analytics storage
4. **OpenAI GPT-4o+** - AI model for tutoring responses

### Data Flow

```
Client Request → API Route → AITutorService → Redis (context) → OpenAI API
                                            ↓
                                      PostgreSQL (persistence)
```

## API Endpoints

### Base URL
```
/api/ai-tutor
```

### Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Start Tutoring Session

**POST** `/sessions/start`

Start a new AI tutoring session with optional course context and learning objectives.

#### Request Body
```json
{
  "tutorType": "general",
  "courseId": "course-uuid",
  "learningObjectives": [
    "Understand calculus fundamentals",
    "Apply derivatives to real-world problems"
  ]
}
```

#### Parameters
- `tutorType` (required): Type of tutor - `general`, `math`, `science`, `theology`, `programming`, `business`, `engineering`
- `courseId` (optional): UUID of the course for context
- `learningObjectives` (optional): Array of learning goals for the session

#### Response
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "userId": "user-uuid",
    "courseId": "course-uuid",
    "tutorType": "math",
    "conversationHistory": [],
    "metadata": {
      "startedAt": "2024-01-15T10:00:00Z",
      "lastActivityAt": "2024-01-15T10:00:00Z",
      "messageCount": 0,
      "topicsDiscussed": [],
      "learningObjectives": ["..."]
    },
    "analytics": {
      "totalResponseTime": 0,
      "averageResponseTime": 0,
      "totalTokensUsed": 0,
      "questionsAnswered": 0,
      "clarificationsNeeded": 0
    }
  }
}
```

---

### 2. Continue Session

**POST** `/sessions/:sessionId/continue`

Resume an existing tutoring session.

#### Response
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "conversationHistory": [...],
    "metadata": {...},
    "analytics": {...}
  }
}
```

---

### 3. Send Message

**POST** `/sessions/:sessionId/message`

Send a message to the AI tutor and receive a complete response.

#### Request Body
```json
{
  "message": "Can you explain the concept of derivatives?"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "message": "Certainly! A derivative represents the rate of change...",
    "suggestions": [
      "Can you provide another example?",
      "What practice problems do you recommend?",
      "Can you show me the step-by-step solution?"
    ],
    "resources": [],
    "needsClarification": false,
    "confidence": 0.95,
    "responseTime": 1234,
    "tokensUsed": 450
  }
}
```

#### Response Fields
- `message`: The AI tutor's response
- `suggestions`: Follow-up question suggestions
- `resources`: Relevant learning resources (if available)
- `needsClarification`: Whether the AI needs more information
- `confidence`: Confidence score (0-1)
- `responseTime`: Response time in milliseconds
- `tokensUsed`: Number of tokens consumed

---

### 4. Send Message with Streaming

**POST** `/sessions/:sessionId/message/stream`

Send a message and receive a streaming response for real-time interaction.

#### Request Body
```json
{
  "message": "Explain quantum mechanics"
}
```

#### Response
Server-Sent Events (SSE) stream:
```
data: {"delta": "Quantum", "done": false}

data: {"delta": " mechanics", "done": false}

data: {"delta": " is the", "done": false}

...

data: {"delta": "", "done": true}
```

#### Usage Example (JavaScript)
```javascript
const eventSource = new EventSource('/api/ai-tutor/sessions/session-id/message/stream');

eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  if (chunk.done) {
    eventSource.close();
  } else {
    // Append chunk.delta to display
  }
};
```

---

### 5. End Session

**POST** `/sessions/:sessionId/end`

End a tutoring session and receive final analytics.

#### Request Body
```json
{
  "satisfactionRating": 5,
  "feedback": "Excellent tutoring session! Very helpful."
}
```

#### Parameters
- `satisfactionRating` (optional): Rating from 1-5
- `feedback` (optional): Text feedback

#### Response
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalResponseTime": 15000,
      "averageResponseTime": 2500,
      "totalTokensUsed": 2500,
      "questionsAnswered": 6,
      "clarificationsNeeded": 1,
      "satisfactionRating": 5,
      "effectiveness": 0.92
    }
  }
}
```

---

### 6. Get Session History

**GET** `/sessions/:sessionId/history`

Retrieve the complete conversation history for a session.

#### Response
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "role": "user",
        "content": "What is calculus?",
        "timestamp": "2024-01-15T10:05:00Z",
        "tokens": 10,
        "responseTime": 1200
      },
      {
        "role": "assistant",
        "content": "Calculus is the mathematical study...",
        "timestamp": "2024-01-15T10:05:01Z",
        "tokens": 150,
        "responseTime": 1200
      }
    ],
    "analytics": {...},
    "metadata": {...}
  }
}
```

---

### 7. Get User Analytics

**GET** `/analytics`

Get comprehensive tutoring analytics for the authenticated user.

#### Response
```json
{
  "success": true,
  "data": {
    "totalSessions": 15,
    "totalMessages": 120,
    "averageSatisfaction": 4.7,
    "averageEffectiveness": 0.88,
    "totalTokensUsed": 25000,
    "averageResponseTime": 2100,
    "topTopics": [
      "calculus",
      "algorithms",
      "theology",
      "programming"
    ],
    "tutorTypeUsage": {
      "math": 6,
      "programming": 5,
      "theology": 4
    }
  }
}
```

---

### 8. Get Tutor Types

**GET** `/tutor-types`

Get list of available tutor types and their descriptions.

#### Response
```json
{
  "success": true,
  "data": {
    "tutorTypes": [
      {
        "id": "general",
        "name": "General ScrollDean",
        "description": "World-class general education tutor...",
        "icon": "🎓"
      },
      {
        "id": "math",
        "name": "Mathematics ScrollDean",
        "description": "Expert in rigorous mathematical reasoning...",
        "icon": "📐"
      }
    ]
  }
}
```

---

## Tutor Personalities

### General ScrollDean
World-class general education combining academic excellence with spiritual wisdom. Uses Socratic method and interdisciplinary connections.

### Mathematics ScrollDean
Specializes in:
- Rigorous proof-based reasoning
- Intuitive geometric understanding
- Multiple solution methods
- Real-world applications

### Science ScrollDean
Focuses on:
- Scientific method and critical thinking
- Experimental methodology
- God's design in creation
- Latest research awareness

### Theology ScrollDean
Expertise in:
- Deep biblical scholarship (Hebrew, Greek, Aramaic)
- Systematic theological framework
- Church history
- Practical ministry application

### Programming ScrollDean
Specializes in:
- Algorithms and data structures
- Software engineering best practices
- System design and architecture
- Kingdom applications of technology

### Business ScrollDean
Focuses on:
- Economic theory and market analysis
- Strategic management
- Kingdom economics and stewardship
- Entrepreneurship

### Engineering ScrollDean
Expertise in:
- First principles and fundamental laws
- Professional engineering standards
- Design thinking and problem-solving
- Appropriate technology for underserved communities

---

## Analytics Metrics

### Session Analytics
- **Response Time**: Time taken to generate responses (ms)
- **Token Usage**: Number of AI tokens consumed
- **Questions Answered**: Count of user questions
- **Clarifications Needed**: Times AI needed more information
- **Satisfaction Rating**: User rating (1-5)
- **Effectiveness**: Calculated score based on multiple factors

### Effectiveness Calculation
```
Effectiveness = (0.4 × satisfaction) + 
                (0.2 × response_speed) + 
                (0.2 × (1 - clarification_ratio)) + 
                (0.2 × engagement)
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common Error Codes
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (accessing another user's session)
- `404` - Not Found (session doesn't exist)
- `500` - Internal Server Error

---

## Rate Limiting

- **General API**: 100 requests per hour per user
- **Streaming**: 50 concurrent streams per user
- **Message Length**: Maximum 5000 characters per message

---

## Best Practices

### 1. Session Management
- Start a new session for each distinct learning topic
- End sessions when switching contexts
- Provide learning objectives for better tutoring

### 2. Message Formatting
- Be specific and clear in questions
- Provide context when needed
- Use follow-up suggestions for deeper learning

### 3. Streaming vs Standard
- Use streaming for real-time interaction
- Use standard for batch processing or logging
- Streaming provides better user experience

### 4. Analytics Usage
- Review analytics to track learning progress
- Use effectiveness scores to identify areas for improvement
- Monitor token usage for cost optimization

---

## Example Usage

### Complete Session Flow

```javascript
// 1. Start session
const session = await fetch('/api/ai-tutor/sessions/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tutorType: 'math',
    learningObjectives: ['Master calculus derivatives']
  })
});

const { data: sessionData } = await session.json();
const sessionId = sessionData.id;

// 2. Send messages
const response = await fetch(`/api/ai-tutor/sessions/${sessionId}/message`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'What is a derivative?'
  })
});

const { data: tutorResponse } = await response.json();
console.log(tutorResponse.message);

// 3. End session
await fetch(`/api/ai-tutor/sessions/${sessionId}/end`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    satisfactionRating: 5,
    feedback: 'Great session!'
  })
});
```

---

## Performance Considerations

### Caching Strategy
- Conversation context cached in Redis (1 hour TTL)
- Session data cached (2 hours TTL)
- Automatic cache invalidation on session end

### Optimization Tips
1. Reuse sessions for related questions
2. Limit message length to reduce token usage
3. Use streaming for better perceived performance
4. Monitor analytics to optimize learning paths

---

## Support

For issues or questions:
- Technical Support: support@scrolluniversity.org
- API Documentation: https://docs.scrolluniversity.org/ai-tutor
- Status Page: https://status.scrolluniversity.org
