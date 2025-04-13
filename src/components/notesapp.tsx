"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search,
  Plus,
  MoreHorizontal,
  Settings,
  Rocket,
  Star,
  Users,
  X,
  FileText,
  Mic,
  ArrowLeft,
  Share2,
  Play,
  StopCircle,
  Upload,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

// Define the type for our note document
interface Note {
  id: string;
  meetingName: string;
  shortSummary: string;
  createdAt: string;
  numberOfPeople: number;
}

export default function NotesApp() {
  const [showModal, setShowModal] = useState(false)
  const [showRecordingModal, setShowRecordingModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuth()

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Add state for recorded file
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState("")

  // Add state for selected file
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add compression utility functions
  const compressAudio = async (audioBlob: Blob): Promise<Blob> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate * 0.5
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    
    return new Promise<Blob>((resolve) => {
      const length = renderedBuffer.length;
      const channels = renderedBuffer.numberOfChannels;
      const sampleRate = renderedBuffer.sampleRate;
      
      const audioData = new Float32Array(length * channels);
      for (let channel = 0; channel < channels; channel++) {
        const channelData = renderedBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          audioData[i * channels + channel] = channelData[i];
        }
      }
      
      const dataView = new DataView(new ArrayBuffer(44 + audioData.length * 2));
      
      writeString(dataView, 0, 'RIFF');
      dataView.setUint32(4, 36 + audioData.length * 2, true);
      writeString(dataView, 8, 'WAVE');
      writeString(dataView, 12, 'fmt ');
      dataView.setUint32(16, 16, true);
      dataView.setUint16(20, 1, true);
      dataView.setUint16(22, channels, true);
      dataView.setUint32(24, sampleRate, true);
      dataView.setUint32(28, sampleRate * channels * 2, true);
      dataView.setUint16(32, channels * 2, true);
      dataView.setUint16(34, 16, true);
      writeString(dataView, 36, 'data');
      dataView.setUint32(40, audioData.length * 2, true);
      
      for (let i = 0; i < audioData.length; i++) {
        dataView.setInt16(44 + i * 2, audioData[i] * 0x7FFF, true);
      }
      
      resolve(new Blob([dataView], { type: 'audio/wav' }));
    });
  };

  const writeString = (dataView: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      dataView.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Format time function
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setAudioChunks([])

      // Start timer
      let seconds = 0
      timerIntervalRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)
      }, 1000)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(chunks => [...chunks, event.data])
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        const compressedBlob = await compressAudio(audioBlob)
        const audioFile = new File([compressedBlob], 'recorded-audio.wav', { type: 'audio/wav' })
        setRecordedFile(audioFile)
        setAudioBlob(audioFile)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }

  // Clear recording function
  const clearRecording = useCallback(() => {
    setRecordedFile(null)
    setAudioBlob(null)
    setRecordingTime(0)
    setAudioChunks([])
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file)
    } else {
      alert('Please select an audio file')
    }
  }

  // Handle upload to Firebase Storage
  const handleUploadFile = async () => {
    if (!selectedFile || !user) return

    try {
      // Create a reference to Firebase Storage
      const storage = getStorage()
      const storageRef = ref(storage, `audio-files/${user.uid}/${selectedFile.name}`)
      
      // Upload the file
      await uploadBytes(storageRef, selectedFile)
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      // Create a document in Firestore
      const docRef = await addDoc(collection(db, "audioProcessing"), {
        userId: user.uid,
        fileName: selectedFile.name,
        fileUrl: downloadURL,
        status: "pending",
        createdAt: serverTimestamp(),
      })

      // Clear the selected file and close modal
      setSelectedFile(null)
      setShowModal(false)

      // You might want to show a success message here
      alert('File uploaded successfully!')

    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file. Please try again.')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop()
      }
    }
  }, [isRecording, mediaRecorder])

  // Fetch notes from Firestore
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, "audioProcessing"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const fetchedNotes = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Handle the timestamp properly
          const timestamp = data.createdAt?.toDate();
          const formattedDate = timestamp 
            ? timestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'No date';

          return {
            id: doc.id,
            meetingName: data.fileName || 'Untitled Meeting', // Fallback for meeting name
            shortSummary: data.summary || 'Processing...', // Fallback for summary
            createdAt: formattedDate,
            numberOfPeople: data.numberOfPeople || 1 // Default to 1 if not specified
          };
        });

        setNotes(fetchedNotes);
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user]);

  const renderRecordingModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Record Audio</h2>
          <button 
            onClick={() => {
              stopRecording()
              setShowRecordingModal(false)
              clearRecording()
              setRecordingTime(0)
            }}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <div className="text-4xl font-mono text-white">
            {formatTime(recordingTime)}
          </div>

          {!recordedFile ? (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`rounded-full p-4 ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
            >
              {isRecording ? (
                <StopCircle className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          ) : (
            <button
              onClick={handleUploadFile}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Recording</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderInitialModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">New Note</h2>
          <button 
            onClick={() => {
              setShowModal(false)
              setSelectedFile(null)
            }}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="audio/*"
            className="hidden"
          />

          {!selectedFile ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white"
              >
                <Upload className="w-6 h-6" />
                <span className="font-medium">Upload File</span>
              </button>

              <button
                onClick={() => {
                  setShowModal(false)
                  setShowRecordingModal(true)
                }}
                className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white"
              >
                <Mic className="w-6 h-6" />
                <span className="font-medium">Start Recording Audio</span>
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                      <p className="text-xs text-zinc-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleUploadFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-center space-x-2 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Upload and Transcribe</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderNotesList = () => (
    <div className="flex flex-col h-screen bg-black text-white relative">
      {/* Header */}
      <div className="flex justify-between items-center px-8 pt-6 pb-6">
        <h1 className="text-4xl font-bold">My Notes</h1>
        <div className="flex items-center gap-4">
          <button 
            className="bg-zinc-800 px-4 py-2 rounded-full text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-8 mb-4">
        <div className="bg-zinc-800 rounded-full flex items-center px-4 py-2">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent border-none outline-none pl-2 text-zinc-400 w-full"
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-auto px-4 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-zinc-400 mt-4">Loading your notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="bg-zinc-800 rounded-full p-4">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-400 text-lg">No notes yet</p>
            <p className="text-zinc-500 text-sm text-center max-w-sm">
              Click the "New Note" button below to create your first note
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="border-b border-zinc-800 py-4 px-4 cursor-pointer"
              onClick={() => setSelectedNote(note)}
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
          ))
        )}
      </div>

      {/* New Note Button - Fixed bottom right */}
      <div className="fixed bottom-24 right-6 flex flex-col items-center">
        <button
          className="bg-blue-500 text-white rounded-full w-14 h-14 flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Home Indicator with extra padding */}
      <div className="flex justify-center py-2 pb-8">
        <div className="w-32 h-1 bg-zinc-600 rounded-full"></div>
      </div>
    </div>
  )

  const renderNoteDetail = () => {
    const note = selectedNote!

    return (
      <div className="flex flex-col h-screen bg-black text-white">
        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-6 pb-2">
          <button className="p-2" onClick={() => setSelectedNote(null)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">{note.meetingName}</h1>
          <button className="p-2">
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button className="flex-1 py-3 text-center border-b-2 border-white font-medium">Notes</button>
          <button className="flex-1 py-3 text-center text-zinc-500">Transcript</button>
          <button className="flex-1 py-3 text-center text-zinc-500">Chat</button>
        </div>

        {/* Note Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Placeholder for note content */}
        </div>

        {/* Play Button */}
        <div className="absolute bottom-16 right-6">
          <button className="bg-white rounded-full w-16 h-16 flex items-center justify-center">
            <Play className="w-8 h-8 text-black ml-1" />
          </button>
        </div>

        {/* Home Indicator */}
        <div className="flex justify-center py-2">
          <div className="w-32 h-1 bg-zinc-600 rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      {selectedNote !== null ? renderNoteDetail() : renderNotesList()}
      {showModal && renderInitialModal()}
      {showRecordingModal && renderRecordingModal()}
    </>
  )
}

