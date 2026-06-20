# AI Agent for Task Automation & External Platform Integration

## Executive Summary

**Yes, it is absolutely possible** to create an AI agent for this app that can automatically receive and dispatch tasks while interfacing with other construction management platforms. The app already has a solid foundation with Supabase backend, realtime sync, and existing AI services.

---

## 1. Feasibility Assessment

### ✅ **Current Infrastructure (Already in Place)**

1. **Backend Architecture**:
   - Supabase PostgreSQL database with well-defined task schema
   - Realtime subscriptions via `RealtimeSyncManager`
   - RESTful API structure through Supabase client
   - Activity logging system (`task_activities` table)

2. **Existing AI Services**:
   - `task-llm-service.ts` - Natural language task parsing
   - `chat-service.ts` - AI chat integration (Anthropic/OpenAI)
   - `grok.ts`, `openai.ts`, `anthropic.ts` - Multiple AI provider support

3. **Task Management**:
   - Complete CRUD operations (`createTask`, `updateTask`, `assignTask`)
   - Task status workflow (new → accepted → in_progress → submitted_for_review → approved)
   - Activity tracking and audit trail

4. **Integration Points**:
   - File upload service for attachments
   - User management and authentication
   - Project-based organization

### 🎯 **What Needs to Be Built**

1. **AI Agent Service** - Core automation engine
2. **Webhook Receiver** - Incoming task handler
3. **External Platform Adapters** - Connectors for other construction platforms
4. **Task Dispatcher** - Intelligent task assignment logic
5. **Integration API** - REST endpoints for external systems

---

## 2. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Platforms                        │
│  (Procore, Autodesk, PlanGrid, BuilderTREND, etc.)          │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ Webhooks / REST API
                        │
┌───────────────────────▼───────────────────────────────────────┐
│              AI Agent Service (Backend)                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Webhook Receiver  │  Task Parser  │  Task Dispatcher  │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  External Platform Adapters                              │  │
│  │  - Procore Adapter                                        │  │
│  │  - Autodesk Adapter                                      │  │
│  │  - Generic REST Adapter                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  AI Decision Engine                                      │  │
│  │  - Task Classification                                   │  │
│  │  - Priority Assessment                                  │  │
│  │  - User Assignment Logic                                │  │
│  │  - Due Date Estimation                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ Supabase Client
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                    Supabase Backend                           │
│  - tasks table                                                │
│  - task_activities table                                      │
│  - users table                                                │
│  - projects table                                             │
│  - Realtime subscriptions                                     │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ Realtime Sync
                        │
┌───────────────────────▼───────────────────────────────────────┐
│              Mobile App (React Native)                        │
│  - Task Store (Zustand)                                       │
│  - RealtimeSyncManager                                        │
│  - Task UI Components                                         │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Approach

### Option A: Supabase Edge Functions (Recommended)

**Pros:**
- Serverless, scalable
- Built into Supabase infrastructure
- Automatic authentication handling
- Easy webhook endpoints
- TypeScript support

**Implementation:**
```typescript
// supabase/functions/ai-agent/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle webhook from external platform
  const payload = await req.json()
  
  // Parse task using AI
  const taskData = await parseTaskWithAI(payload)
  
  // Create task in Supabase
  const supabase = createClient(...)
  await supabase.from('tasks').insert(taskData)
  
  return new Response(JSON.stringify({ success: true }))
})
```

### Option B: Separate Backend Service (Node.js/Python)

**Pros:**
- More control over infrastructure
- Can use any AI provider
- Easier to scale independently
- Better for complex integrations

**Implementation:**
- Express.js or FastAPI service
- Runs on separate server/container
- Connects to Supabase via REST API or direct PostgreSQL

### Option C: Hybrid Approach (Recommended for Production)

**Architecture:**
- **Supabase Edge Functions** for webhook receivers (lightweight)
- **Separate service** for complex AI processing (heavy computation)
- **Supabase Realtime** for real-time updates to mobile app

---

## 4. Core Components

### 4.1 Webhook Receiver

**Purpose**: Receive tasks from external platforms via webhooks

**Location**: `supabase/functions/webhook-receiver/index.ts`

**Features:**
- Validate webhook signatures
- Normalize different platform formats
- Queue tasks for processing
- Return immediate acknowledgment

**Example:**
```typescript
export async function handleWebhook(
  platform: 'procore' | 'autodesk' | 'generic',
  payload: any,
  signature?: string
): Promise<{ taskId: string }> {
  // 1. Validate signature
  if (!validateWebhookSignature(platform, payload, signature)) {
    throw new Error('Invalid webhook signature');
  }
  
  // 2. Normalize payload to common format
  const normalizedTask = normalizeTaskPayload(platform, payload);
  
  // 3. Queue for AI processing
  const taskId = await queueTaskForProcessing(normalizedTask);
  
  return { taskId };
}
```

### 4.2 AI Task Parser

**Purpose**: Extract structured task data from unstructured input

**Location**: `src/api/ai-task-parser.ts` (enhance existing `task-llm-service.ts`)

**Features:**
- Parse natural language descriptions
- Extract task metadata (priority, category, due date)
- Identify required skills/resources
- Suggest assignees based on workload

**Example:**
```typescript
export interface ParsedTask {
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  dueDate: string;
  estimatedDuration?: number;
  requiredSkills?: string[];
  suggestedAssignees?: string[];
  billingStatus: BillingStatus;
}

export async function parseTaskWithAI(
  rawTask: string | object,
  context?: {
    projectId?: string;
    companyId?: string;
    availableUsers?: User[];
  }
): Promise<ParsedTask> {
  // Use existing LLM service or enhance it
  const prompt = buildTaskParsingPrompt(rawTask, context);
  const response = await getAnthropicTextResponse(prompt);
  
  // Parse structured response
  return JSON.parse(response);
}
```

### 4.3 Task Dispatcher

**Purpose**: Intelligently assign tasks to users

**Location**: `src/api/task-dispatcher.ts`

**Features:**
- Analyze user workload
- Match task requirements to user skills
- Consider user availability
- Respect project assignments
- Handle multi-user assignments

**Example:**
```typescript
export interface DispatchResult {
  assignedTo: string[];
  confidence: number;
  reasoning: string;
}

export async function dispatchTask(
  task: ParsedTask,
  options?: {
    projectId?: string;
    forceAssignTo?: string[];
    excludeUsers?: string[];
  }
): Promise<DispatchResult> {
  // 1. Get available users
  const availableUsers = await getAvailableUsers({
    projectId: options?.projectId,
    excludeIds: options?.excludeUsers,
  });
  
  // 2. Score users based on:
  //    - Current workload
  //    - Skill match
  //    - Availability
  //    - Project history
  const scoredUsers = await scoreUsersForTask(task, availableUsers);
  
  // 3. Select best matches
  const selectedUsers = selectBestUsers(scoredUsers, {
    minConfidence: 0.7,
    maxUsers: 3,
  });
  
  return {
    assignedTo: selectedUsers.map(u => u.id),
    confidence: selectedUsers[0]?.score || 0,
    reasoning: selectedUsers.map(u => 
      `${u.name}: ${u.reason}`
    ).join('; '),
  };
}
```

### 4.4 External Platform Adapters

**Purpose**: Normalize different platform formats to common structure

**Location**: `src/api/integrations/`

**Structure:**
```
src/api/integrations/
  ├── base-adapter.ts          # Base interface
  ├── procore-adapter.ts       # Procore integration
  ├── autodesk-adapter.ts      # Autodesk Construction Cloud
  ├── plangrid-adapter.ts      # PlanGrid
  ├── buildertrend-adapter.ts   # BuilderTREND
  └── generic-rest-adapter.ts   # Generic REST API
```

**Example:**
```typescript
export interface PlatformAdapter {
  name: string;
  normalizeTask(payload: any): NormalizedTask;
  validateWebhook(payload: any, signature: string): boolean;
  fetchTaskDetails(taskId: string): Promise<any>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
}

export class ProcoreAdapter implements PlatformAdapter {
  normalizeTask(procoreTask: ProcoreTaskPayload): NormalizedTask {
    return {
      title: procoreTask.title,
      description: procoreTask.description,
      dueDate: procoreTask.due_date,
      priority: mapProcorePriority(procoreTask.priority),
      category: mapProcoreCategory(procoreTask.category),
      externalId: procoreTask.id,
      externalPlatform: 'procore',
      attachments: procoreTask.attachments?.map(a => a.url) || [],
    };
  }
  
  // ... other methods
}
```

---

## 5. Integration Flow

### 5.1 Incoming Task Flow (External → App)

```
1. External Platform → Webhook → Supabase Edge Function
2. Edge Function → Validate & Normalize → Queue Task
3. AI Agent Service → Parse Task → Extract Metadata
4. Task Dispatcher → Assign Users → Create Task
5. Supabase → Insert Task → Trigger Realtime Event
6. Mobile App → Receive Realtime Update → Display Task
```

### 5.2 Outgoing Task Flow (App → External)

```
1. User Updates Task → Supabase → Task Activity Logged
2. Webhook Sender → Detect Status Change → Format for Platform
3. External Platform Adapter → Transform Data → Send Update
4. External Platform → Receive Update → Sync Status
```

### 5.3 Bidirectional Sync

```
1. Periodic Sync Job → Check Both Platforms
2. Compare Task States → Identify Conflicts
3. Conflict Resolution → Apply Rules (App wins / External wins / Manual)
4. Update Both Platforms → Maintain Consistency
```

---

## 6. Database Schema Extensions

### New Tables Needed

```sql
-- External platform integrations
CREATE TABLE platform_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  platform_name TEXT NOT NULL, -- 'procore', 'autodesk', etc.
  api_key TEXT NOT NULL,
  api_secret TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  config JSONB, -- Platform-specific configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- External task mappings
CREATE TABLE external_task_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  platform_name TEXT NOT NULL,
  external_task_id TEXT NOT NULL, -- ID in external platform
  external_project_id TEXT,
  sync_direction TEXT DEFAULT 'bidirectional', -- 'incoming', 'outgoing', 'bidirectional'
  last_synced_at TIMESTAMP,
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'error'
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform_name, external_task_id)
);

-- AI agent processing queue
CREATE TABLE ai_agent_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  platform_name TEXT,
  raw_payload JSONB,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  ai_parsed_data JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- AI agent decisions log
CREATE TABLE ai_agent_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  decision_type TEXT, -- 'assignment', 'priority', 'category', 'due_date'
  decision_value TEXT,
  confidence_score FLOAT,
  reasoning TEXT,
  model_used TEXT, -- 'claude', 'gpt-4', etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Extend Existing Tables

```sql
-- Add to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS external_platform TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_assigned BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_synced BOOLEAN DEFAULT false;
```

---

## 7. AI Agent Decision Logic

### 7.1 Task Classification

```typescript
export async function classifyTask(
  description: string,
  context: ProjectContext
): Promise<{
  category: TaskCategory;
  priority: Priority;
  estimatedDuration: number;
}> {
  const prompt = `
    Analyze this construction task and classify it:
    
    Task: ${description}
    Project Type: ${context.projectType}
    Current Phase: ${context.currentPhase}
    
    Determine:
    1. Category (safety, electrical, plumbing, structural, materials, commercial, general)
    2. Priority (critical, high, medium, low)
    3. Estimated duration in hours
    
    Return JSON format.
  `;
  
  const response = await getAnthropicTextResponse(prompt);
  return JSON.parse(response);
}
```

### 7.2 User Assignment Logic

```typescript
export async function assignTaskIntelligently(
  task: ParsedTask,
  availableUsers: User[]
): Promise<AssignmentResult> {
  // Score each user based on:
  const scores = await Promise.all(
    availableUsers.map(async (user) => {
      const workload = await getUserWorkload(user.id);
      const skillMatch = calculateSkillMatch(task, user);
      const availability = await checkAvailability(user.id, task.dueDate);
      const projectHistory = await getProjectHistory(user.id, task.projectId);
      
      return {
        userId: user.id,
        score: (
          skillMatch * 0.4 +
          availability * 0.3 +
          (1 - workload / 100) * 0.2 +
          projectHistory * 0.1
        ),
        reasoning: {
          skillMatch,
          availability,
          workload,
          projectHistory,
        },
      };
    })
  );
  
  // Select top candidates
  const topCandidates = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, task.requiredUsers || 1);
  
  return {
    assignedTo: topCandidates.map(c => c.userId),
    confidence: topCandidates[0].score,
    reasoning: topCandidates.map(c => 
      `${c.userId}: ${JSON.stringify(c.reasoning)}`
    ).join('; '),
  };
}
```

### 7.3 Due Date Estimation

```typescript
export async function estimateDueDate(
  task: ParsedTask,
  context: {
    projectTimeline: Date[];
    similarTasks: Task[];
    currentWorkload: number;
  }
): Promise<string> {
  // Use AI to estimate based on:
  // - Task complexity
  // - Similar historical tasks
  // - Current team workload
  // - Project timeline constraints
  
  const prompt = `
    Estimate a realistic due date for this task:
    ${JSON.stringify({ task, context })}
    
    Consider:
    - Task complexity: ${task.estimatedDuration} hours
    - Similar tasks took: ${context.similarTasks.map(t => t.completionTime)}
    - Current workload: ${context.currentWorkload}%
    - Project deadline: ${context.projectTimeline[context.projectTimeline.length - 1]}
  `;
  
  const response = await getAnthropicTextResponse(prompt);
  return parseDateFromResponse(response);
}
```

---

## 8. Security & Authentication

### 8.1 Webhook Security

```typescript
// Validate webhook signatures
export function validateWebhookSignature(
  platform: string,
  payload: any,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 8.2 API Key Management

- Store platform API keys in Supabase Vault or environment variables
- Use Row Level Security (RLS) to restrict access
- Rotate keys periodically
- Log all API access

### 8.3 Rate Limiting

- Implement rate limiting per platform
- Queue requests during high load
- Retry failed requests with exponential backoff

---

## 9. Error Handling & Monitoring

### 9.1 Error Handling Strategy

```typescript
export async function processTaskWithRetry(
  taskId: string,
  maxRetries: number = 3
): Promise<void> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await processTask(taskId);
      return;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        await logError(taskId, error);
        await notifyAdmin(taskId, error);
        throw error;
      }
      await sleep(Math.pow(2, retries) * 1000); // Exponential backoff
    }
  }
}
```

### 9.2 Monitoring & Logging

- Log all AI decisions with confidence scores
- Track processing times
- Monitor webhook success/failure rates
- Alert on repeated failures
- Dashboard for AI agent performance

---

## 10. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Supabase Edge Functions
- [ ] Create webhook receiver endpoint
- [ ] Implement basic task normalization
- [ ] Add external platform mapping tables

### Phase 2: AI Integration (Weeks 3-4)
- [ ] Enhance task-llm-service for external tasks
- [ ] Implement task classification
- [ ] Build user assignment logic
- [ ] Add confidence scoring

### Phase 3: Platform Adapters (Weeks 5-6)
- [ ] Create base adapter interface
- [ ] Implement Procore adapter
- [ ] Implement generic REST adapter
- [ ] Add webhook validation

### Phase 4: Task Dispatcher (Weeks 7-8)
- [ ] Build workload analysis
- [ ] Implement skill matching
- [ ] Create assignment algorithm
- [ ] Add manual override capability

### Phase 5: Bidirectional Sync (Weeks 9-10)
- [ ] Implement outgoing webhooks
- [ ] Add status sync logic
- [ ] Handle conflict resolution
- [ ] Create sync monitoring

### Phase 6: Testing & Refinement (Weeks 11-12)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] User feedback integration

---

## 11. Example Use Cases

### Use Case 1: Procore Integration

**Scenario**: Task created in Procore automatically appears in app

```
1. PM creates task in Procore
2. Procore sends webhook to your app
3. AI agent parses task description
4. Agent classifies: "Electrical inspection" → category: electrical, priority: high
5. Agent assigns to electrician based on workload
6. Task appears in app for assigned user
7. User completes task in app
8. Status syncs back to Procore
```

### Use Case 2: Autodesk Construction Cloud

**Scenario**: RFI from Autodesk becomes a task

```
1. RFI submitted in Autodesk
2. Webhook triggers task creation
3. AI extracts: question, urgency, related documents
4. Agent assigns to appropriate team member
5. Task includes link back to Autodesk RFI
6. Response in app syncs to Autodesk
```

### Use Case 3: Multi-Platform Aggregation

**Scenario**: Tasks from multiple platforms unified in one app

```
1. Tasks come from Procore, Autodesk, PlanGrid
2. All normalized to common format
3. Unified view in app
4. User can filter by source platform
5. Updates sync back to original platform
```

---

## 12. Cost Considerations

### AI API Costs
- **Anthropic Claude**: ~$0.003 per task parse
- **OpenAI GPT-4**: ~$0.01 per task parse
- **Estimated**: 1000 tasks/month = $3-10/month

### Infrastructure Costs
- **Supabase Edge Functions**: Free tier (500K invocations/month)
- **Additional compute**: ~$20-50/month for separate service (if needed)
- **Database storage**: Minimal increase

### Total Estimated Cost
- **Small scale** (< 1000 tasks/month): ~$25-50/month
- **Medium scale** (1000-10000 tasks/month): ~$100-200/month
- **Large scale** (> 10000 tasks/month): ~$500+/month

---

## 13. Technical Requirements

### Required Services
- Supabase account (for database and edge functions)
- AI provider account (Anthropic, OpenAI, or both)
- Webhook endpoint (Supabase Edge Functions or separate service)

### Required Skills
- TypeScript/JavaScript
- Supabase/PostgreSQL
- AI/LLM integration
- REST API design
- Webhook handling

### Optional but Recommended
- Docker (for local development)
- CI/CD pipeline
- Monitoring service (Sentry, Datadog)
- Analytics dashboard

---

## 14. Next Steps

1. **Choose Architecture**: Supabase Edge Functions vs. Separate Service
2. **Select AI Provider**: Anthropic (existing) or OpenAI
3. **Design API Contracts**: Define webhook payload formats
4. **Create MVP**: Start with one platform (e.g., generic REST)
5. **Test with Real Data**: Use staging environment
6. **Iterate**: Add more platforms and features

---

## 15. Conclusion

Creating an AI agent for automatic task reception and dispatch is **highly feasible** given your current infrastructure. The app already has:

✅ Solid backend (Supabase)  
✅ Existing AI services  
✅ Realtime sync capabilities  
✅ Well-defined task structure  

The main work involves:
1. Building webhook receivers
2. Creating platform adapters
3. Implementing AI decision logic
4. Setting up bidirectional sync

**Recommended Approach**: Start with Supabase Edge Functions for webhooks, enhance existing AI services, and build platform adapters incrementally. This allows for rapid iteration and testing while maintaining the existing app architecture.

---

## Appendix: Code Examples

### Example: Simple Webhook Receiver (Supabase Edge Function)

```typescript
// supabase/functions/webhook-receiver/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get platform from header or query
    const platform = req.headers.get('x-platform') || 'generic'
    const payload = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Normalize task (simplified)
    const normalizedTask = {
      title: payload.title || payload.name,
      description: payload.description || payload.notes,
      external_id: payload.id,
      external_platform: platform,
    }

    // Queue for AI processing
    const { data, error } = await supabase
      .from('ai_agent_queue')
      .insert({
        raw_payload: payload,
        platform_name: platform,
        processing_status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, queueId: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Example: AI Task Processor

```typescript
// supabase/functions/ai-task-processor/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAnthropicTextResponse } from '../shared/chat-service.ts'

serve(async (req) => {
  const supabase = createClient(...)
  
  // Get pending tasks
  const { data: pendingTasks } = await supabase
    .from('ai_agent_queue')
    .select('*')
    .eq('processing_status', 'pending')
    .limit(10)

  for (const queuedTask of pendingTasks) {
    try {
      // Update status
      await supabase
        .from('ai_agent_queue')
        .update({ processing_status: 'processing' })
        .eq('id', queuedTask.id)

      // Parse with AI
      const parsedTask = await parseTaskWithAI(queuedTask.raw_payload)
      
      // Dispatch task
      const assignment = await dispatchTask(parsedTask)
      
      // Create task
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          ...parsedTask,
          assigned_to: assignment.assignedTo,
          ai_assigned: true,
          ai_confidence: assignment.confidence,
        })
        .select()
        .single()

      // Mark as completed
      await supabase
        .from('ai_agent_queue')
        .update({
          processing_status: 'completed',
          ai_parsed_data: parsedTask,
          processed_at: new Date().toISOString(),
        })
        .eq('id', queuedTask.id)

    } catch (error) {
      // Handle error
      await supabase
        .from('ai_agent_queue')
        .update({
          processing_status: 'failed',
          error_message: error.message,
          retry_count: queuedTask.retry_count + 1,
        })
        .eq('id', queuedTask.id)
    }
  }
})
```

---

**Ready to start?** Begin with Phase 1: Set up a simple webhook receiver and test with a generic REST API integration.

