import { useState, useEffect } from "react"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { FileText, MoreHorizontal, Rocket, Users } from "lucide-react"

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
  onNoteSelect?: (note: Note) => void
}

export default function NotesList({ userId, onNoteSelect }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const q = query(
          collection(db, "audioProcessing"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        )

        const querySnapshot = await getDocs(q)
        const fetchedNotes = querySnapshot.docs.map(doc => {
          const data = doc.data()
          const timestamp = data.createdAt?.toDate()
          const formattedDate = timestamp 
            ? timestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'No date'

          return {
            id: doc.id,
            meetingName: data.fileName || 'Untitled Meeting',
            shortSummary: data.summary || 'Processing...',
            createdAt: formattedDate,
            numberOfPeople: data.numberOfPeople || 1,
            uid: data.userId || userId
          }
        })

        setNotes(fetchedNotes)
      } catch (error) {
        console.error("Error fetching notes:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchNotes()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="text-zinc-400 mt-4">Loading your notes...</p>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="bg-zinc-800 rounded-full p-4">
          <FileText className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-zinc-400 text-lg">No notes yet</p>
        <p className="text-zinc-500 text-sm text-center max-w-sm">
          Create a new note to get started
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto px-4">
      {notes.map((note) => (
        <div
          key={note.id}
          className="border-b border-zinc-800 py-4 px-4 cursor-pointer"
          onClick={() => onNoteSelect?.(note)}
        >
          <div className="flex items-start">
            <div className="bg-zinc-800 rounded-full w-12 h-12 flex items-center justify-center mr-3">
              <Rocket className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold mb-1">{note.meetingName}</h2>
                <button onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              <p className="text-zinc-400 mb-2 line-clamp-1">{note.shortSummary}</p>
              <div className="flex items-center text-zinc-500 text-sm">
                <span>{note.createdAt}</span>
                <span className="mx-2">•</span>
                <span className="flex items-center">
                  <span>{note.numberOfPeople}</span>
                  <Users className="w-4 h-4 ml-1" />
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 