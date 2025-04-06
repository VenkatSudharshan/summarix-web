import { useState, useEffect } from "react"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
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
}

export default function NotesList({ userId }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
            meetingName: data.meetingName || data.fileName || 'Untitled Meeting',
            shortSummary: data.shortSummary?.replace(/###.*?:/g, '').trim() || 'Processing...',
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

    fetchNotes()
  }, [userId])

  const handleNoteClick = (note: Note) => {
    router.push(`/note/${note.id}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
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