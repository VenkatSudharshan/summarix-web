"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { MessageSquare, ArrowLeft, Send } from "lucide-react"

interface ChatbotProps {
  transcript: string
  onClose?: () => void
  hideTrigger?: boolean
}

export interface ChatbotRef {
  open: () => void
}

export const Chatbot = forwardRef<ChatbotRef, ChatbotProps>(({ transcript, onClose, hideTrigger = false }, ref) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hi! I\'m here to help you understand your transcript. What would you like to know?' }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true)
  }))

  // Log transcript when component mounts or transcript changes
  useEffect(() => {
    console.log('Chatbot received transcript:', {
      hasTranscript: !!transcript,
      transcriptLength: transcript?.length || 0,
      transcriptPreview: transcript?.substring(0, 100)
    });
  }, [transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          transcript,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Chat API error:', errorData);
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setMessages([{ role: 'assistant', content: 'Hi! I\'m here to help you understand your transcript. What would you like to know?' }])
    setInput("")
    onClose?.()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <MessageSquare className="h-7 w-7 text-white" />
            <span className="sr-only">Chat with transcript</span>
          </Button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="w-full sm:w-[800px] p-0 bg-zinc-900 flex flex-col">
        <SheetHeader className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
            <SheetTitle>Chat with Transcript</SheetTitle>
          </div>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 pb-[12vh]">
            <div className="space-y-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'assistant'
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="p-4 border-t border-zinc-800 bg-zinc-900">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-zinc-800 text-zinc-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
})

Chatbot.displayName = "Chatbot" 