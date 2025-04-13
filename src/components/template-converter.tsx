"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { FileText, ArrowLeft, Loader2, Copy, Download } from "lucide-react"

interface TemplateConverterProps {
  transcript: string
  onClose?: () => void
  hideTrigger?: boolean
}

export interface TemplateConverterRef {
  open: () => void
}

export const TemplateConverter = forwardRef<TemplateConverterRef, TemplateConverterProps>(({ transcript, onClose, hideTrigger = false }, ref) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [convertedContent, setConvertedContent] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true)
  }))

  // Log transcript when component mounts or transcript changes
  useEffect(() => {
    console.log('TemplateConverter received transcript:', {
      hasTranscript: !!transcript,
      transcriptLength: transcript?.length || 0,
      transcriptPreview: transcript?.substring(0, 100)
    });
  }, [transcript]);

  // Template options
  const templates = [
    {
      id: "meeting-minutes",
      name: "Meeting Minutes",
      description: "Convert transcript to structured meeting minutes"
    },
    {
      id: "business-requirements",
      name: "Draft Business and Functional Requirements",
      description: "Extract business and functional requirements from the transcript"
    },
    {
      id: "user-stories",
      name: "Draft Tasks and User Stories",
      description: "Create tasks and user stories based on action items"
    },
    {
      id: "project-timelines",
      name: "Create Project Timelines",
      description: "Generate project timelines from the transcript"
    }
  ]

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId)
    setIsLoading(true)
    setConvertedContent(null)
    setEditedContent("")

    try {
      console.log('Template conversion - Input data:', {
        templateId,
        transcriptLength: transcript?.length || 0,
        transcriptPreview: transcript?.substring(0, 100)
      });

      if (!transcript) {
        throw new Error('No transcript available');
      }

      const response = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          transcript,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Template API error:', errorData);
        throw new Error(errorData.error || "Failed to convert template");
      }

      const data = await response.json()
      setConvertedContent(data.content)
      setEditedContent(data.content)
    } catch (error) {
      console.error("Template conversion error:", error)
      const errorMessage = error instanceof Error ? error.message : "Sorry, I encountered an error while converting the template. Please try again."
      setConvertedContent(errorMessage)
      setEditedContent(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const resetConverter = () => {
    setSelectedTemplate(null)
    setConvertedContent(null)
    setEditedContent("")
  }

  const copyToClipboard = () => {
    if (editedContent) {
      navigator.clipboard.writeText(editedContent)
        .then(() => {
          // You could add a toast notification here
          console.log("Content copied to clipboard")
        })
        .catch(err => {
          console.error("Failed to copy content: ", err)
        })
    }
  }

  const downloadAsMarkdown = () => {
    if (editedContent) {
      const blob = new Blob([editedContent], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${templates.find(t => t.id === selectedTemplate)?.name.toLowerCase().replace(/\s+/g, "-")}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleClose = () => {
    resetConverter()
    onClose?.()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-4 left-4 h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
          >
            <FileText className="h-7 w-7 text-white" />
            <span className="sr-only">Convert to template</span>
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
              onClick={() => {
                handleClose();
                setIsOpen(false);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
            <SheetTitle>Convert to Template</SheetTitle>
          </div>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0 relative">
          {!selectedTemplate ? (
            <div className="p-6 space-y-4 overflow-y-auto">
              <p className="text-zinc-300">Choose a template to convert to:</p>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className="w-full text-left p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                  >
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-zinc-400">{template.description}</p>
                  </button>
                ))}
              </div>
              <div className="mt-6 text-sm text-zinc-400 text-center">
                Need a custom template? Use <span className="text-blue-400">Chat with Note</span> for personalized template generation. Custom template builder coming soon!
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-zinc-800">
                <h3 className="font-medium text-zinc-200">
                  {templates.find(t => t.id === selectedTemplate)?.name}
                </h3>
                <p className="text-sm text-zinc-400">
                  {templates.find(t => t.id === selectedTemplate)?.description}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 pb-24">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                    <p className="text-zinc-400">Converting transcript...</p>
                  </div>
                ) : convertedContent ? (
                  <div className="prose prose-invert max-w-none h-full">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full min-h-[calc(100vh-15rem)] bg-zinc-900 text-zinc-200 p-4 rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                      placeholder="Edit your template content here..."
                    />
                  </div>
                ) : null}
              </div>
              {convertedContent && (
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-zinc-800 bg-zinc-900">
                  <div className="flex gap-2 max-w-[800px] mx-auto">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={downloadAsMarkdown}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
})

TemplateConverter.displayName = "TemplateConverter" 