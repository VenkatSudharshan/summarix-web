"use client";

import NotesList from "@/components/NotesList";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Search, Plus, X, Mic, Upload, FileText, StopCircle, MessageSquare } from "lucide-react";
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Toast from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { NoteSelector } from "@/components/note-selector";
import { Chatbot, ChatbotRef } from "@/components/chatbot";
import { TemplateConverter, TemplateConverterRef } from "@/components/template-converter";
import { FeedbackButton } from "@/components/feedback-button";
import { FlashCards, FlashCardsRef } from "@/components/flash-cards";
import Quiz, { QuizRef } from "@/components/quiz";

// Reinstated local Note interface definition
interface Note {
  id: string;
  meetingName: string;
  shortSummary: string;
  createdAt: string; // Keep as string for display consistency here
  numberOfPeople: number;
  formattedTranscript?: string;
  uid: string;
  type?: 'audio' | 'youtube' | 'lecture';
  flashCards?: string; // Keep optional fields needed
  mcq?: string;
  // Add other fields if used locally, e.g., from Firestore mapping
  transcript?: string;
  summary?: string;
  url?: string; // For youtube title
  lectureTitle?: string; // For lecture title
  fileName?: string; // For fallback title
}

// Define NoteWithoutUid type based on local Note
type NoteWithoutUid = Omit<Note, 'uid'>;

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [context, setContext] = useState<string>('');
  const [selectedNoteForChat, setSelectedNoteForChat] = useState<Note | null>(null);
  const [selectedNoteForTemplate, setSelectedNoteForTemplate] = useState<Note | null>(null);
  const [selectedNoteForFlashCards, setSelectedNoteForFlashCards] = useState<Note | null>(null);
  const [selectedNoteForQuiz, setSelectedNoteForQuiz] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const chatbotRef = useRef<ChatbotRef>(null)
  const templateConverterRef = useRef<TemplateConverterRef>(null)
  const flashCardsRef = useRef<FlashCardsRef>(null)
  const quizRef = useRef<QuizRef>(null)
  const [contentType, setContentType] = useState<'meeting' | 'lecture' | null>(null);

  // Fetch notes from Firestore
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    // Firebase query definitions (audioQuery, youtubeQuery, lectureQuery)
    const audioQuery = query(
      collection(db, "audioProcessing"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const youtubeQuery = query(
      collection(db, "youtubeTranscriptions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const lectureQuery = query(
      collection(db, "lectureTranscripts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    let audioNotes: Note[] = [];
    let youtubeNotes: Note[] = [];
    let lectureNotes: Note[] = [];

    // Listener for Audio Notes
    const unsubscribeAudio = onSnapshot(audioQuery, (snapshot) => {
      audioNotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        const timestamp = data.createdAt?.toDate();
        const formattedDate = timestamp ? timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date";
        return {
          id: doc.id,
          meetingName: data.meetingName || data.fileName || "Untitled Meeting",
          shortSummary: data.shortSummary?.replace(/###.*?:/g, "").trim() || "Processing...",
          createdAt: formattedDate,
          numberOfPeople: data.numberOfPeople || 1,
          uid: data.userId || user.uid || "",
          formattedTranscript: data.formattedTranscript || "",
          transcript: data.transcript || undefined,
          type: 'audio' as const,
          fileName: data.fileName || undefined, // Capture fileName
        };
      });
      setNotes(prev => [...prev.filter(n => n.type !== 'audio'), ...audioNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setIsLoading(false);
    }, (error) => { console.error("Error fetching audio notes:", error); setIsLoading(false); });

    // Listener for YouTube Notes
    const unsubscribeYoutube = onSnapshot(youtubeQuery, (snapshot) => {
      youtubeNotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        const timestamp = data.createdAt?.toDate();
        const formattedDate = timestamp ? timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date";
        return {
          id: doc.id,
          meetingName: data.url || "YouTube Video", // Use URL as meetingName here
          shortSummary: data.summary?.substring(0, 100) || "Processing...",
          createdAt: formattedDate,
          numberOfPeople: 1,
          uid: data.userId || user.uid || "",
          formattedTranscript: data.transcript || "", // Youtube uses raw transcript
          transcript: data.transcript || undefined,
          type: 'youtube' as const,
          url: data.url || undefined,
        };
      });
      setNotes(prev => [...prev.filter(n => n.type !== 'youtube'), ...youtubeNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setIsLoading(false);
    }, (error) => { console.error("Error fetching YouTube notes:", error); setIsLoading(false); });

    // Listener for Lecture Notes
    const unsubscribeLecture = onSnapshot(lectureQuery, (snapshot) => {
      lectureNotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        const timestamp = data.createdAt?.toDate();
        const formattedDate = timestamp ? timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date";
        return {
          id: doc.id,
          meetingName: data.lectureTitle || data.meetingName || data.fileName || "Untitled Lecture", // Use lectureTitle or fallback
          shortSummary: data.shortSummary?.replace(/###.*?:/g, "").trim() || "Processing...",
          createdAt: formattedDate,
          numberOfPeople: 1,
          uid: data.userId || user.uid || "",
          formattedTranscript: data.formattedTranscript || "",
          transcript: data.transcript || undefined,
          type: 'lecture' as const,
          flashCards: data.flashCards || undefined,
          mcq: data.mcq || undefined,
          lectureTitle: data.lectureTitle || undefined,
          fileName: data.fileName || undefined,
        };
      });
      setNotes(prev => [...prev.filter(n => n.type !== 'lecture'), ...lectureNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setIsLoading(false);
    }, (error) => { console.error("Error fetching lecture notes:", error); setIsLoading(false); });

    setNotes([]); // Initialize notes state

    // Cleanup listeners
    return () => {
      unsubscribeAudio();
      unsubscribeYoutube();
      unsubscribeLecture();
    };
  }, [user]);

  // Filter notes based on search query (uses meetingName now)
  const filteredNotes = notes.filter(note => 
    note.meetingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.shortSummary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Authentication redirect effect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Cleanup recording timer/media recorder on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  // Recording functions (startRecording, stopRecording, formatTime)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      // Reset everything
      setRecordingTime(0);
      chunksRef.current = [];
      setAudioBlob(null);
      
      // Set up recorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create blob from all chunks
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setToast({ message: 'Error starting recording', type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Format time function
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // File handling functions (handleFileSelect, handleUploadFile)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file);
    } else {
      alert('Please select an audio file');
    }
  };

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
        // Ensure we have a valid audio blob
        if (!audioBlob || audioBlob.size === 0) {
          setToast({ message: 'No audio recorded', type: 'error' });
          setIsUploading(false);
          return;
        }
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
      
      // Determine which collection to use based on content type
      const collectionName = contentType === 'lecture' ? 'lectureTranscripts' : 'audioProcessing';
      
      // Create a document in Firestore with appropriate fields
      if (contentType === 'lecture') {
        // For lectures, use lectureTitle instead of meetingName
        await addDoc(collection(db, collectionName), {
          userId: user.uid,
          fileName: fileName,
          fileUrl: fileUrl,
          downloadableUrl: fileUrl,
          filePath: filePath,
          lectureTitle: fileName.replace(/\.[^/.]+$/, ""), // Use filename without extension as lecture title
          context: context,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      } else {
        // For meetings, use the original fields
        await addDoc(collection(db, collectionName), {
          userId: user.uid,
          fileName: fileName,
          fileUrl: fileUrl,
          downloadableUrl: fileUrl,
          filePath: filePath,
          context: context,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }

      // Reset states
      setSelectedFile(null);
      setAudioBlob(null);
      setRecordingTime(0);
      setContext('');
      setContentType(null);
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

  // Modal rendering functions (renderInitialModal, renderRecordingModal)
  const renderInitialModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">New Note</h2>
          <button
            onClick={() => {
              setShowModal(false);
              setSelectedFile(null);
              setContext("");
              setContentType(null);
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
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-white">Corporate Meeting</h3>
                <button
                  onClick={() => {
                    setContentType('meeting');
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white w-full"
                  disabled={isUploading}
                >
                  <Upload className="w-6 h-6" />
                  <span className="font-medium">Upload Meeting</span>
                </button>

                <button
                  onClick={() => {
                    setContentType('meeting');
                    setShowModal(false);
                    setShowRecordingModal(true);
                  }}
                  className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white w-full"
                  disabled={isUploading}
                >
                  <Mic className="w-6 h-6" />
                  <span className="font-medium">Start Recording Meeting</span>
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-white">Lecture</h3>
                <button
                  onClick={() => {
                    setContentType('lecture');
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white w-full"
                  disabled={isUploading}
                >
                  <Upload className="w-6 h-6" />
                  <span className="font-medium">Upload Lecture</span>
                </button>

                <button
                  onClick={() => {
                    setContentType('lecture');
                    setShowModal(false);
                    setShowRecordingModal(true);
                  }}
                  className="flex items-center space-x-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors text-white w-full"
                  disabled={isUploading}
                >
                  <Mic className="w-6 h-6" />
                  <span className="font-medium">Start Recording Lecture</span>
                </button>
              </div>
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
          <h2 className="text-xl font-semibold text-white">
            {contentType === 'lecture' ? 'Record Lecture' : 'Record Meeting'}
          </h2>
          <button 
            onClick={() => {
              stopRecording();
              setShowRecordingModal(false);
              setAudioBlob(null);
              setRecordingTime(0);
              setContext('');
              setContentType(null);
            }}
            className="text-zinc-400 hover:text-white transition-colors"
            disabled={isUploading}
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
              disabled={isUploading}
            >
              {isRecording ? (
                <StopCircle className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          ) : (
            <div className="w-full space-y-4">
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

  if (isLoading || !user) {
    return <div className="flex items-center justify-center h-screen bg-black"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div></div>;
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white relative">
      {/* Header */}
      <div className="flex justify-between items-center px-8 pt-6 pb-6">
        <h1 className="text-4xl font-bold">My Notes</h1>
        <div className="flex items-center gap-4">
          <FeedbackButton userId={user.uid} />
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none pl-2 text-zinc-400 w-full"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-8 mb-6 flex gap-4">
        <NoteSelector
          trigger={
            <Button variant="default" size="default" className="bg-blue-600 hover:bg-blue-700 text-white">
              <MessageSquare className="h-5 w-5 mr-2" />
              <span>Chat with Note</span>
            </Button>
          }
          notes={notes.map(({ uid, ...rest }) => rest)}
          onNoteSelect={(note) => {
            const fullNote = notes.find(n => n.id === note.id);
            if (fullNote) {
              setSelectedNoteForChat(fullNote);
              setTimeout(() => { chatbotRef.current?.open(); }, 100);
            }
          }}
          title="Select note to chat with"
        />
        <NoteSelector
          trigger={
            <Button variant="default" size="default" className="bg-green-600 hover:bg-green-700 text-white">
              <FileText className="h-5 w-5 mr-2" />
              <span>Convert to Template</span>
            </Button>
          }
          notes={notes.filter(n => n.type !== 'lecture').map(({ uid, ...rest }) => rest)}
          onNoteSelect={(note) => {
            const fullNote = notes.find(n => n.id === note.id);
            if (fullNote) {
              setSelectedNoteForTemplate(fullNote);
              setTimeout(() => { templateConverterRef.current?.open(); }, 100);
            }
          }}
          title="Select note to convert"
        />
        <NoteSelector
          trigger={
            <Button variant="default" size="default" className="bg-purple-600 hover:bg-purple-700 text-white">
              <FileText className="h-5 w-5 mr-2" />
              <span>Flash Cards</span>
            </Button>
          }
          notes={notes.filter(n => n.type === 'lecture').map(({ uid, ...rest }) => rest)}
          onNoteSelect={(note) => {
            const fullNote = notes.find(n => n.id === note.id);
            if (fullNote) {
              setSelectedNoteForFlashCards(fullNote);
              setTimeout(() => { flashCardsRef.current?.open(); }, 100);
            }
          }}
          title="Select lecture to view flash cards"
        />
        <NoteSelector
          trigger={
            <Button variant="default" size="default" className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <FileText className="h-5 w-5 mr-2" />
              <span>Quiz</span>
            </Button>
          }
          notes={notes.filter(n => n.type === 'lecture').map(({ uid, ...rest }) => rest)}
          onNoteSelect={(note) => {
            const fullNote = notes.find(n => n.id === note.id);
            if (fullNote) {
              setSelectedNoteForQuiz(fullNote);
              setTimeout(() => { quizRef.current?.open(); }, 100);
            }
          }}
          title="Select lecture to take quiz"
        />
      </div>

      {/* Notes List Component */}
      {isLoading && notes.length === 0 ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <NotesList userId={user.uid} notes={filteredNotes} />
        </div>
      )}

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

      {/* Conditionally Rendered Components */} 
      {selectedNoteForChat && (
        <Chatbot
          ref={chatbotRef}
          transcript={selectedNoteForChat.formattedTranscript || selectedNoteForChat.transcript || ""}
          onClose={() => setSelectedNoteForChat(null)}
          hideTrigger={true}
        />
      )}
      {selectedNoteForTemplate && (
        <TemplateConverter
          ref={templateConverterRef}
          transcript={selectedNoteForTemplate.formattedTranscript || selectedNoteForTemplate.transcript || ""}
          onClose={() => setSelectedNoteForTemplate(null)}
          hideTrigger={true}
        />
      )}
      {selectedNoteForFlashCards && (
        <FlashCards
          ref={flashCardsRef}
          flashCardsText={selectedNoteForFlashCards.flashCards}
          onClose={() => setSelectedNoteForFlashCards(null)}
          hideTrigger={true}
        />
      )}
      {selectedNoteForQuiz && (
        <Quiz
          ref={quizRef}
          mcqText={selectedNoteForQuiz.mcq}
          onClose={() => setSelectedNoteForQuiz(null)}
          hideTrigger={true}
        />
      )}

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