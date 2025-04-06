import { NextResponse } from "next/server"

const GEMINI_API_KEY = "AIzaSyBvxbWvHAqA67BI-aHWQwLLRtBstYP3Y34"

export async function POST(req: Request) {
  try {
    const { messages, transcript } = await req.json()
    
    // Validate input
    if (!messages?.length || !transcript) {
      console.error('Missing required fields:', { 
        hasMessages: !!messages?.length, 
        hasTranscript: !!transcript 
      });
      return NextResponse.json(
        { error: "Missing required fields: messages and transcript are required" },
        { status: 400 }
      );
    }
    
    // Get the last user message
    const lastUserMessage = messages[messages.length - 1].content
    
    // Log input data size
    console.log('Chat API - Input data:', {
      messagesCount: messages.length,
      lastMessageLength: lastUserMessage.length,
      transcriptLength: transcript.length,
      transcriptPreview: transcript.substring(0, 100)
    });
    
    // Extract just the text from transcript
    const transcriptText = transcript
    
    const prompt = `Context: The following is a transcript of a conversation/audio:
${transcriptText}

Question: ${lastUserMessage}

Please provide a clear and concise response based only on the information available in the transcript.`
    
    console.log('Chatbot Prompt:', prompt)

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
      message: responseText,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate response" },
      { status: 500 }
    )
  }
} 