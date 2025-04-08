import { NextResponse } from "next/server"

const GEMINI_API_KEY = "AIzaSyBvxbWvHAqA67BI-aHWQwLLRtBstYP3Y34"

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json()
    
    // Validate input
    if (!transcript) {
      console.error('Missing required fields:', { transcript: !!transcript });
      return NextResponse.json(
        { error: "Missing required field: transcript is required" },
        { status: 400 }
      );
    }

    // Log input data size
    console.log('Flash Cards API - Input data:', {
      transcriptLength: transcript.length,
      transcriptPreview: transcript.substring(0, 100)
    });
    
    const prompt = `Generate flash cards from the following lecture transcript. Format each flash card with "**Q:**" for the question and "**A:**" for the answer. Create 5-10 flash cards that cover the key concepts and important points from the transcript.

⚠️ **Instructions for AI Generator:**
- Use only the provided transcript and context.
- Strictly do NOT hallucinate, assume, or make up information.
- Format each flash card exactly as follows:
**Q:** [Question]
**A:** [Answer]

Transcript:
${transcript}`
    
    console.log('Flash Cards Prompt:', prompt)

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
    console.error("Flash Cards API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate flash cards" },
      { status: 500 }
    )
  }
} 