import { useState } from "react"
import { Users, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { db } from "@/lib/firebase"
import { deleteDoc, doc } from "firebase/firestore"
import Toast from "@/components/Toast"

interface Note {
  id: string
  meetingName: string
  shortSummary: string
  createdAt: string
  numberOfPeople: number
  uid: string
  type?: 'audio' | 'youtube' | 'lecture'
}

interface NotesListProps {
  userId: string
  notes: Note[]
  onDeleteNote?: (noteId: string) => void
}

export default function NotesList({ userId, notes, onDeleteNote }: NotesListProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleNoteClick = (note: Note) => {
    router.push(`/note/${note.id}`)
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDelete = async (noteId: string, noteType: string = 'audio') => {
    setIsDeleting(true)
    try {
      // Determine the collection based on note type
      let collectionName = 'audioProcessing'
      if (noteType === 'youtube') {
        collectionName = 'youtubeTranscriptions'
      } else if (noteType === 'lecture') {
        collectionName = 'lectureTranscripts'
      }

      // Delete the document from Firestore
      await deleteDoc(doc(db, collectionName, noteId))

      // Call the onDeleteNote callback if provided
      if (onDeleteNote) {
        onDeleteNote(noteId)
      }

      showToast('Note deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting note:', error)
      showToast('Failed to delete note', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (notes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full bg-black">
        <p className="text-zinc-500">No notes found</p>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full bg-black overscroll-none">
      {notes.map((note) => (
        <div 
          key={note.id}
          className="border-b border-zinc-800 p-4 cursor-pointer hover:bg-zinc-900/50 group"
          onClick={() => handleNoteClick(note)}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">{note.meetingName}</h2>
            <AlertDialog>
              <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-red-900/20 hover:text-red-400"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-400" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">Delete note</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{note.meetingName}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(note.id, note.type)
                    }}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-zinc-400 mt-1 truncate">{note.shortSummary}</p>
          <div className="flex items-center mt-2 text-sm text-zinc-500">
            <span>{note.createdAt}</span>
            <span className="mx-2">•</span>
            <span>{note.numberOfPeople}</span>
            <Users className="w-4 h-4 ml-1" />
          </div>
        </div>
      ))}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
} 