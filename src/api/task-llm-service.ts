/*
 * LLM Task Parser Service
 * Extracts task information from natural language input (Cantonese or English)
 * and returns structured task data for auto-filling forms.
 */

import { getAnthropicTextResponse } from "./chat-service";
import { TaskCategory, Priority, BillingStatus, Task } from "../types/buildtrack";

export interface TaskSuggestion {
  title?: string;
  description?: string;
  category?: TaskCategory;
  priority?: Priority;
  dueDate?: string; // ISO date string
  billingStatus?: BillingStatus;
  taskReference?: string;
}

/**
 * Parse relative date expressions in Cantonese/English to ISO date strings
 */
function parseRelativeDate(text: string): string | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Cantonese patterns
  const cantonesePatterns: Record<string, number | (() => number)> = {
    "明天": 1,
    "後天": 2,
    "下週": 7,
    "下星期": 7,
    "下個月": 30,
    "月底": () => {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    },
  };
  
  // English patterns
  const englishPatterns: Record<string, number | (() => number)> = {
    "tomorrow": 1,
    "day after tomorrow": 2,
    "next week": 7,
    "next month": 30,
    "end of month": () => {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    },
  };
  
  // Check Cantonese patterns
  for (const [pattern, days] of Object.entries(cantonesePatterns)) {
    if (text.includes(pattern)) {
      const daysToAdd = typeof days === "function" ? days() : days;
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return targetDate.toISOString();
    }
  }
  
  // Check English patterns
  for (const [pattern, days] of Object.entries(englishPatterns)) {
    if (text.toLowerCase().includes(pattern)) {
      const daysToAdd = typeof days === "function" ? days() : days;
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return targetDate.toISOString();
    }
  }
  
  return undefined;
}

/**
 * Map category keywords to TaskCategory enum
 */
function mapCategory(text: string): TaskCategory | undefined {
  const lowerText = text.toLowerCase();
  
  // Cantonese keywords
  const cantoneseMap: Record<string, TaskCategory> = {
    "安全": "safety",
    "電氣": "electrical",
    "電": "electrical",
    "水管": "plumbing",
    "水": "plumbing",
    "結構": "structural",
    "材料": "materials",
    "商業": "commercial",
    "一般": "general",
  };
  
  // English keywords
  const englishMap: Record<string, TaskCategory> = {
    "safety": "safety",
    "electrical": "electrical",
    "electric": "electrical",
    "plumbing": "plumbing",
    "structural": "structural",
    "materials": "materials",
    "commercial": "commercial",
    "general": "general",
  };
  
  // Check Cantonese
  for (const [keyword, category] of Object.entries(cantoneseMap)) {
    if (text.includes(keyword)) {
      return category;
    }
  }
  
  // Check English
  for (const [keyword, category] of Object.entries(englishMap)) {
    if (lowerText.includes(keyword)) {
      return category;
    }
  }
  
  return undefined;
}

/**
 * Map priority keywords to Priority enum
 */
function mapPriority(text: string): Priority | undefined {
  const lowerText = text.toLowerCase();
  
  // Cantonese keywords
  const cantoneseMap: Record<string, Priority> = {
    "緊急": "critical",
    "urgent": "critical",
    "重要": "high",
    "高": "high",
    "一般": "medium",
    "中": "medium",
    "不急": "low",
    "低": "low",
  };
  
  // English keywords
  const englishMap: Record<string, Priority> = {
    "critical": "critical",
    "urgent": "critical",
    "high": "high",
    "important": "high",
    "medium": "medium",
    "normal": "medium",
    "low": "low",
  };
  
  // Check Cantonese
  for (const [keyword, priority] of Object.entries(cantoneseMap)) {
    if (text.includes(keyword)) {
      return priority;
    }
  }
  
  // Check English
  for (const [keyword, priority] of Object.entries(englishMap)) {
    if (lowerText.includes(keyword)) {
      return priority;
    }
  }
  
  return undefined;
}

/**
 * Map billing status keywords to BillingStatus enum
 */
function mapBillingStatus(text: string): BillingStatus | undefined {
  const lowerText = text.toLowerCase();
  
  // Cantonese keywords
  const cantoneseMap: Record<string, BillingStatus> = {
    "可計費": "billable",
    "計費": "billable",
    "不可計費": "non_billable",
    "已計費": "billed",
  };
  
  // English keywords
  const englishMap: Record<string, BillingStatus> = {
    "billable": "billable",
    "non-billable": "non_billable",
    "non billable": "non_billable",
    "billed": "billed",
  };
  
  // Check Cantonese
  for (const [keyword, status] of Object.entries(cantoneseMap)) {
    if (text.includes(keyword)) {
      return status;
    }
  }
  
  // Check English
  for (const [keyword, status] of Object.entries(englishMap)) {
    if (lowerText.includes(keyword)) {
      return status;
    }
  }
  
  return undefined;
}

/**
 * Extract task information from natural language input using LLM
 * @param text - The transcribed text (Cantonese or English)
 * @param context - Optional existing task context when updating
 * @returns Task suggestion with extracted fields
 */
export async function extractTaskFromText(
  text: string,
  context?: Task
): Promise<TaskSuggestion> {
  try {
    const systemPrompt = `You are a task management assistant that understands Cantonese and English.
Extract task information from the user's input and return a JSON object with the following structure:
{
  "title": "string (required, concise task title)",
  "description": "string (optional, detailed description)",
  "category": "general|safety|electrical|plumbing|structural|materials|commercial (optional)",
  "priority": "low|medium|high|critical (optional, default: medium)",
  "dueDate": "ISO date string (optional, parse relative dates like 'tomorrow', 'next week', '明天', '下週')",
  "billingStatus": "billable|non_billable|billed (optional, default: non_billable)",
  "taskReference": "string (optional, any reference numbers mentioned)"
}

Guidelines:
- Extract the most important information as the title (keep it concise, under 50 characters)
- If updating an existing task, only include fields that should be changed
- Parse relative dates: "明天" = tomorrow, "下週" = next week, "月底" = end of month
- Map categories: "安全" = safety, "電氣" = electrical, "水管" = plumbing, "結構" = structural, "材料" = materials, "商業" = commercial
- Map priorities: "緊急" = critical, "重要" = high, "一般" = medium, "不急" = low
- If the input is unclear or incomplete, only extract what you can confidently identify
- Return only the JSON object, no additional text`;

    const userPrompt = context
      ? `Current task context:
Title: ${context.title}
Description: ${context.description}
Category: ${context.category}
Priority: ${context.priority}
Due Date: ${context.dueDate}
Billing Status: ${context.billingStatus || "non_billable"}

User wants to update: ${text}

Extract only the fields that should be changed.`
      : `Extract task information from: ${text}`;

    const response = await getAnthropicTextResponse(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: 500,
      }
    );

    // Parse JSON response
    let parsed: TaskSuggestion;
    try {
      // Try to extract JSON from response (in case LLM adds extra text)
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(response.content);
      }
    } catch (parseError) {
      console.error("Failed to parse LLM response:", response.content);
      // Fallback: try to extract fields using keyword matching
      return extractTaskFieldsFallback(text);
    }

    // Validate and normalize extracted fields
    const suggestion: TaskSuggestion = {};

    if (parsed.title) {
      suggestion.title = parsed.title.trim();
    }

    if (parsed.description) {
      suggestion.description = parsed.description.trim();
    }

    // Validate category
    const validCategories: TaskCategory[] = [
      "general",
      "safety",
      "electrical",
      "plumbing",
      "structural",
      "materials",
      "commercial",
    ];
    if (parsed.category && validCategories.includes(parsed.category)) {
      suggestion.category = parsed.category;
    } else if (parsed.category) {
      // Try keyword matching as fallback
      const mapped = mapCategory(text);
      if (mapped) suggestion.category = mapped;
    }

    // Validate priority
    const validPriorities: Priority[] = ["low", "medium", "high", "critical"];
    if (parsed.priority && validPriorities.includes(parsed.priority)) {
      suggestion.priority = parsed.priority;
    } else if (parsed.priority) {
      // Try keyword matching as fallback
      const mapped = mapPriority(text);
      if (mapped) suggestion.priority = mapped;
    }

    // Parse due date
    if (parsed.dueDate) {
      try {
        // If it's already an ISO string, validate it
        const date = new Date(parsed.dueDate);
        if (!isNaN(date.getTime())) {
          suggestion.dueDate = date.toISOString();
        }
      } catch (e) {
        // Try relative date parsing
        const relativeDate = parseRelativeDate(parsed.dueDate);
        if (relativeDate) {
          suggestion.dueDate = relativeDate;
        }
      }
    } else {
      // Try to extract from original text
      const relativeDate = parseRelativeDate(text);
      if (relativeDate) {
        suggestion.dueDate = relativeDate;
      }
    }

    // Validate billing status
    const validBillingStatuses: BillingStatus[] = [
      "billable",
      "non_billable",
      "billed",
    ];
    if (
      parsed.billingStatus &&
      validBillingStatuses.includes(parsed.billingStatus)
    ) {
      suggestion.billingStatus = parsed.billingStatus;
    } else if (parsed.billingStatus) {
      // Try keyword matching as fallback
      const mapped = mapBillingStatus(text);
      if (mapped) suggestion.billingStatus = mapped;
    }

    if (parsed.taskReference) {
      suggestion.taskReference = parsed.taskReference.trim();
    }

    return suggestion;
  } catch (error) {
    console.error("LLM task extraction error:", error);
    // Fallback to keyword-based extraction
    return extractTaskFieldsFallback(text);
  }
}

/**
 * Fallback extraction using keyword matching when LLM fails
 */
function extractTaskFieldsFallback(text: string): TaskSuggestion {
  const suggestion: TaskSuggestion = {};

  // Extract title (first sentence or first 50 chars)
  const sentences = text.split(/[。！？.!?]/);
  if (sentences.length > 0) {
    suggestion.title = sentences[0].trim().substring(0, 50);
  } else {
    suggestion.title = text.trim().substring(0, 50);
  }

  // Extract description (rest of text)
  if (text.length > 50) {
    suggestion.description = text.trim();
  }

  // Try to extract other fields using keyword matching
  const category = mapCategory(text);
  if (category) suggestion.category = category;

  const priority = mapPriority(text);
  if (priority) suggestion.priority = priority;

  const billingStatus = mapBillingStatus(text);
  if (billingStatus) suggestion.billingStatus = billingStatus;

  const dueDate = parseRelativeDate(text);
  if (dueDate) suggestion.dueDate = dueDate;

  return suggestion;
}



