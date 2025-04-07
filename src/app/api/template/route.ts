import { NextResponse } from "next/server"

const GEMINI_API_KEY = "AIzaSyBvxbWvHAqA67BI-aHWQwLLRtBstYP3Y34"

export async function POST(req: Request) {
  try {
    const { templateId, transcript } = await req.json()
    
    // Validate input
    if (!templateId || !transcript) {
      console.error('Missing required fields:', { templateId: !!templateId, transcript: !!transcript });
      return NextResponse.json(
        { error: "Missing required fields: templateId and transcript are required" },
        { status: 400 }
      );
    }

    // Log input data size
    console.log('Template API - Input data:', {
      templateId,
      transcriptLength: transcript.length,
      transcriptPreview: transcript.substring(0, 100)
    });
    
    // Define prompts for each template type
    const templatePrompts: Record<string, string> = {
      "meeting-minutes": `Convert the following transcript into a structured meeting minutes document using this exact format:

⚠️ **Instructions for AI Generator:**
- Use only the provided transcript and context.
- Strictly do NOT hallucinate, assume, or make up names, dates, or events.
- If data is not available in the transcript, leave the field blank or label as [Not Mentioned].

# 📝 Meeting Minutes: [Project/Topic Name]



## 📅 Date: [Date]
## ⏰ Time: [Start Time] - [End Time]
## 🌐 Location: [Location/Virtual]
## 📋 Facilitator: [Name]

## 👥 Attendees
- [Name], [Role]
- [Name], [Role]

## 📌 Agenda
1. [Agenda Item 1]
2. [Agenda Item 2]

## 💬 Key Discussion Points
### [Agenda Item 1]
- [Key point 1]
- [Key point 2]

## ✅ Decisions Made
- [Decision 1]
- [Decision 2]

## 🛠️ Action Items
- [ ] [Action Item] – Assigned to: [Name], Due: [Date]

## 📅 Next Meeting
- Date: [Date]
- Time: [Time]
- Agenda Items: [Items]

Extract all relevant information from the transcript and fill in the template. 

Transcript:
${transcript}`,
      
      "business-requirements": `Extract business and functional requirements from the following transcript and format them according to this template:

⚠️ **Instructions for AI Generator:**
- Use only the provided transcript and context.
- Strictly do NOT hallucinate, assume, or make up names, dates, or events.
- If data is not available in the transcript, leave the field blank or label as [Not Mentioned].

# 📄 Requirements Document

## 📘 Project Overview
[Brief overview of the project and purpose of the document.]

## 🎯 Business Requirements
### BR-1: [Title]
- Description: [What the business needs]
- Objective: [What this should achieve]

### BR-2: [Title]
- Description:
- Objective:

## 🛠️ Functional Requirements
### FR-1: [Function Name]
- Description: [What the system should do]
- Input: [Expected Inputs]
- Output: [Expected Outputs]
- User Role: [Who will use this]

### FR-2:
- Description:
- Input:
- Output:
- User Role:

## 🔒 Non-Functional Requirements
- Performance: [e.g., Response time < 2s]
- Security: [e.g., Role-based access]
- Availability: [e.g., 99.9% uptime]

Extract all relevant information from the transcript and fill in the template. 
Transcript:
${transcript}`,
      
      "user-stories": `Create tasks and user stories based on the action items mentioned in the following transcript using this exact format:

⚠️ **Instructions for AI Generator:**
- Use only the provided transcript and context.
- Strictly do NOT hallucinate, assume, or make up names, dates, or events.
- If data is not available in the transcript, leave the field blank or label as [Not Mentioned].

# 🧩 User Stories and Tasks

## Epic: [Feature/Module Name]

### User Story 1:
**As a** [User Type]  
**I want to** [Action or Goal]  
**So that** [Business Value]

**Acceptance Criteria:**
- [ ] [Condition 1]
- [ ] [Condition 2]

**Linked Action Item**: [Referenced action]

---

### Task Breakdown:
- [ ] Task 1: [Developer Task or UI/UX work]
- [ ] Task 2: [Backend task]
- [ ] Task 3: [Testing or QA]

**Assigned to**: [Name]  
**Due Date**: [Date]  
**Priority**: [High/Medium/Low]

Extract all relevant information from the transcript and fill in the template. 
Transcript:
${transcript}`,
      
      "project-timelines": `Create a project timeline based on the following transcript using this exact format:

⚠️ **Instructions for AI Generator:**
- Use only the provided transcript and context.
- Strictly do NOT hallucinate, assume, or make up names, dates, or events.
- If data is not available in the transcript, leave the field blank or label as [Not Mentioned].

# 🗓️ Project Timeline & Milestones

## 📘 Project: [Project Name]
## 📅 Start Date: [Start Date]
## 📆 End Date: [End Date]
## 📋 Owner: [Owner Name]

## 🧭 Milestones
| Milestone Name | Description | Start Date | End Date | Owner | Status |
|----------------|-------------|------------|----------|--------|--------|
| Milestone 1    | [Details]   | [Date]     | [Date]   | [Name] | Planned |
| Milestone 2    |             |            |          |        |        |

## 🔄 Sprint Plan (if Agile)
### Sprint 1: [Date Range]
- Goal: [Sprint Goal]
- Features: [List of features/tasks]
- Team: [Members]

### Sprint 2:
- Goal:
- Features:
- Team:

## 📝 Notes
[Add any assumptions, risks, or dependencies here.]

Extract all relevant information from the transcript and fill in the template.  
Transcript:
${transcript}`
    }
    
    const prompt = templatePrompts[templateId] || "Please process this transcript according to the requested template."
    
    console.log('Template Prompt:', prompt)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Gemini API error details:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        prompt: prompt.substring(0, 100) + '...' // Log first 100 chars of prompt
      })
      return NextResponse.json(
        { error: `Gemini API error: ${response.status} - ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("Gemini API response:", {
      status: response.status,
      hasContent: !!data.candidates?.[0]?.content,
      contentLength: data.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0
    })
    
    // Extract the response text from Gemini's response format
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!responseText) {
      console.error("No content in Gemini response:", data);
      return NextResponse.json(
        { error: "No content generated from Gemini API" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      content: responseText,
    })
  } catch (error) {
    console.error("Template API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate template" },
      { status: 500 }
    )
  }
} 