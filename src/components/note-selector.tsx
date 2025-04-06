"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search } from "lucide-react"

interface Note {
  id: string
  meetingName: string
  shortSummary: string
  createdAt: string
  numberOfPeople: number
  formattedTranscript?: string
}

interface NoteSelectorProps {
  trigger: React.ReactNode
  onNoteSelect: (note: Note) => void
  notes: Note[]
  title: string
}

export function NoteSelector({ trigger, onNoteSelect, notes, title }: NoteSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const filteredNotes = notes.filter(note => 
    note.meetingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.shortSummary.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleNoteSelect = (note: Note) => {
    onNoteSelect(note)
    // Close the sheet after selection
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <SheetTitle>{title}</SheetTitle>
          </div>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100vh-5rem)]">
          <div className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800 text-zinc-200 pl-10 pr-4 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 space-y-2">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleNoteSelect(note)}
                  className="w-full text-left p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  <h3 className="font-medium">{note.meetingName}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2">{note.shortSummary}</p>
                </button>
              ))}
              {filteredNotes.length === 0 && (
                <div className="text-center py-8 text-zinc-400">
                  No notes found
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 