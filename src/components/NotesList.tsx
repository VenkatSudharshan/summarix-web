import { useState, useEffect } from "react"
import { Users } from "lucide-react"
import { useRouter } from "next/navigation"

interface Note {
  id: string
  meetingName: string
  shortSummary: string
  createdAt: string
  numberOfPeople: number
  uid: string
}

interface NotesListProps {
  userId: string
  notes: Note[]
}

export default function NotesList({ userId, notes }: NotesListProps) {
  const router = useRouter()

  const handleNoteClick = (note: Note) => {
    router.push(`/note/${note.id}`)
  }

  if (notes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-zinc-500">No notes found</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {notes.map((note) => (
        <div 
          key={note.id}
          className="border-b border-zinc-800 p-4 cursor-pointer hover:bg-zinc-900/50"
          onClick={() => handleNoteClick(note)}
        >
          <h2 className="text-lg font-medium text-white">{note.meetingName}</h2>
          <p className="text-zinc-400 mt-1 truncate">{note.shortSummary}</p>
          <div className="flex items-center mt-2 text-sm text-zinc-500">
            <span>{note.createdAt}</span>
            <span className="mx-2">•</span>
            <span>{note.numberOfPeople}</span>
            <Users className="w-4 h-4 ml-1" />
          </div>
        </div>
      ))}
    </div>
  )
} 