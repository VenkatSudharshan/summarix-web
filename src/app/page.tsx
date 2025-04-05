"use client";

import NotesList from "@/components/NotesList";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Search, Plus, X, Mic, Upload, FileText, StopCircle } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Toast from "@/components/Toast";

// Define Note interface
interface Note {
  id: string;
  meetingName: string;
  shortSummary: string;
  createdAt: string;
  numberOfPeople: number;
  uid: string;
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [context, setContext] = useState<string>('');

  // Authentication redirect effect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };
  }, [isRecording, mediaRecorder]);

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
    console.log("Selected note:", note);
    // You can expand this to navigate to a note detail page
  };

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      // Start timer
      let seconds = 0;
      timerIntervalRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(chunks => [...chunks, event.data]);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Format time function
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file);
    } else {
      alert('Please select an audio file');
    }
  };

  // Handle upload to Firebase
  const handleUploadFile = async () => {
    if (!user) return;

    try {
      setIsUploading(true);
      let fileUrl = '';
      let fileName = '';
      let fileToUpload: File | Blob | null = null;
      let filePath = '';

      if (selectedFile) {
        fileName = selectedFile.name;
        fileToUpload = selectedFile;
      } else if (audioBlob) {
        fileName = `recording-${new Date().toISOString()}.wav`;
        fileToUpload = audioBlob;
      }

      if (!fileToUpload) {
        setToast({ message: 'No file selected for upload', type: 'error' });
        setIsUploading(false);
        return;
      }

      // Upload to Firebase Storage
      const storage = getStorage();
      filePath = `audio-files/${user.uid}/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      const uploadTask = await uploadBytes(storageRef, fileToUpload);
      fileUrl = await getDownloadURL(uploadTask.ref);
      
      // Create a document in Firestore
      await addDoc(collection(db, "audioProcessing"), {
        userId: user.uid,
        fileName: fileName,
        fileUrl: fileUrl,
        downloadableUrl: fileUrl,
        filePath: filePath,
        context: context,
        //summary: 'Processing...',
        //numberOfPeople: 1,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Reset states
      setSelectedFile(null);
      setAudioBlob(null);
      setRecordingTime(0);
      setContext('');
      setShowModal(false);
      setShowRecordingModal(false);

      // Show success toast
      setToast({ message: 'Audio uploaded successfully!', type: 'success' });

    } catch (error) {
      console.error('Error creating note:', error);
      setToast({ message: 'Error creating note. Please try again.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const renderInitialModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">New Note</h2>
          <button 
            onClick={() => {
              setShowModal(false);
              setSelectedFile(null);
              setContext('');
            }}
            className="text-zinc-400 hover:text-white transition-colors"
            disabled={isUploading}
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
            disabled={isUploading}
          />

          {!selectedFile ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white"
                disabled={isUploading}
              >
                <Upload className="w-6 h-6" />
                <span className="font-medium">Upload File</span>
              </button>

              <button
                onClick={() => {
                  setShowModal(false);
                  setShowRecordingModal(true);
                }}
                className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white"
                disabled={isUploading}
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
                    disabled={isUploading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="context" className="block text-sm font-medium text-zinc-300">
                  Keywords/Context (optional)
                </label>
                <input
                  id="context"
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Enter keywords or context for better transcription"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isUploading}
                />
              </div>

              <button
                onClick={handleUploadFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-center space-x-2 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload and Transcribe</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRecordingModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Record Audio</h2>
          <button 
            onClick={() => {
              stopRecording();
              setShowRecordingModal(false);
              setAudioBlob(null);
              setRecordingTime(0);
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

          {!audioBlob ? (
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
  );

  if (loading || !user) {
    return null;
  }

  return (
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

      {/* Notes List Component */}
      <NotesList userId={user.uid} onNoteSelect={handleNoteSelect} />

      {/* New Note Button */}
      <div className="flex justify-center py-6">
        <button
          className="bg-blue-500 text-white rounded-full px-8 py-3 flex items-center justify-center hover:bg-blue-600 transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="text-lg font-medium">New Note</span>
        </button>
      </div>

      {/* Home Indicator */}
      <div className="flex justify-center py-2">
        <div className="w-32 h-1 bg-zinc-600 rounded-full"></div>
      </div>

      {/* Modals */}
      {showModal && renderInitialModal()}
      {showRecordingModal && renderRecordingModal()}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}