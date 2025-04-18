"use client";

import NotesList from "@/components/NotesList";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Search, Plus, X, Mic, Upload, FileText, StopCircle, MessageSquare, Menu, Loader2, ChevronDown } from "lucide-react";
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, orderBy, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Toast from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { NoteSelector } from "@/components/note-selector";
import { Chatbot, ChatbotRef } from "@/components/chatbot";
import { TemplateConverter, TemplateConverterRef } from "@/components/template-converter";
import { FlashCards, FlashCardsRef } from "@/components/flash-cards";
import Quiz, { QuizRef } from "@/components/quiz";
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

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

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const feedbackButtonRef = useRef<HTMLButtonElement>(null);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    isRecording,
    error
  } = useAudioRecorder({
    onError: (error) => {
      showToast(error.message, 'error');
    },
    onStart: () => {
      setShowRecordingModal(true);
      // Start timer
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    },
    onStop: (blob) => {
      setAudioBlob(blob);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  });

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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // File handling functions (handleFileSelect, handleUploadFile)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if the file is an audio file
      const isAudioFile = file.type.startsWith('audio/') || 
        file.name.match(/\.(mp3|wav|m4a|aac|mp4|ogg)$/i);
      
      if (isAudioFile) {
        setSelectedFile(file);
      } else {
        showToast('Please select an audio file (MP3, WAV, M4A, AAC, MP4, or OGG)', 'error');
      }
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
          showToast('No audio recorded', 'error');
          setIsUploading(false);
          return;
        }
        fileName = `recording-${new Date().toISOString()}.wav`;
        fileToUpload = audioBlob;
      }

      if (!fileToUpload) {
        showToast('No file selected for upload', 'error');
        setIsUploading(false);
        return;
      }

      // Upload to Firebase Storage
      filePath = `audio-files/${user.uid}/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      try {
        const uploadTask = await uploadBytes(storageRef, fileToUpload);
        fileUrl = await getDownloadURL(uploadTask.ref);
        console.log('File uploaded successfully:', fileUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Error uploading file', 'error');
        setIsUploading(false);
        return;
      }
      
      // Determine which collection to use based on content type
      const collectionName = contentType === 'lecture' ? 'lectureTranscripts' : 'audioProcessing';
      
      // Create a document in Firestore with appropriate fields
      try {
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
      } catch (error) {
        console.error('Error creating Firestore document:', error);
        showToast('Error saving file information', 'error');
        setIsUploading(false);
        return;
      }

      // Reset states
      setSelectedFile(null);
      setAudioBlob(null);
      setRecordingTime(0);
      setContext('');
      setContentType(null);
      setShowModal(false);
      setShowRecordingModal(false);
      showToast('File uploaded successfully', 'success');
    } catch (error) {
      console.error('Error in handleUploadFile:', error);
      showToast('An error occurred', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStopRecording = () => {
    stopAudioRecording();
    setShowRecordingModal(false);
    setAudioBlob(null);
    setRecordingTime(0);
    setContext('');
    setContentType(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            accept="audio/*,.mp3,.wav,.m4a,.aac,.mp4,.ogg"
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
            onClick={handleStopRecording}
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
              onClick={isRecording ? stopAudioRecording : startAudioRecording}
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

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textArea);
      }
      showToast('Copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackType || !feedbackDescription) {
      showToast("Please select a feedback type and provide a description", "error");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      // Save feedback to Firestore
      const feedbackRef = collection(db, "feedback");
      await addDoc(feedbackRef, {
        type: feedbackType,
        description: feedbackDescription,
        createdAt: serverTimestamp(),
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous'
      });

      showToast("Thank you for your feedback!", "success");
      setIsFeedbackOpen(false);
      setFeedbackType("");
      setFeedbackDescription("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      showToast("Failed to submit feedback. Please try again.", "error");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Replace the Sheet component with a modal for feedback
  const renderFeedbackModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Send Feedback</h2>
          <button
            onClick={() => setIsFeedbackOpen(false)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">
              Type of Feedback
            </label>
            <div className="relative">
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-base text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-zinc-700 transition-colors"
              >
                <option value="" className="py-2">Select type</option>
                <option value="Bug" className="py-2">Bug Report</option>
                <option value="Feature" className="py-2">Feature Request</option>
                <option value="Improvement" className="py-2">Improvement Suggestion</option>
                <option value="Other" className="py-2">Other Feedback</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">
              Description
            </label>
            <textarea
              value={feedbackDescription}
              onChange={(e) => setFeedbackDescription(e.target.value)}
              placeholder="Tell us more..."
              className="w-full min-h-[100px] bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-zinc-700 transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleFeedbackSubmit}
            disabled={isSubmittingFeedback}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmittingFeedback ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Feedback</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading || !user) {
    return <div className="flex items-center justify-center h-screen bg-black"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div></div>;
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white relative overscroll-none">
      {/* Header */}
      <div className="flex justify-between items-center px-8 pt-6 pb-6">
        <h1 className="text-4xl font-bold transition-all duration-300 hover:text-blue-400">Summarix</h1>
        <div className="relative">
          <button 
            className="p-2 hover:bg-zinc-800 rounded-full transition-all duration-300 hover:scale-105"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6 text-zinc-300" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all duration-300"
                onClick={() => setIsMenuOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 rounded-xl border border-zinc-800 shadow-lg overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                <div className="py-1">
                  <button
                    className="w-full px-4 py-3 text-left text-zinc-300 hover:bg-zinc-800 transition-all duration-200 flex items-center gap-2 hover:text-white hover:translate-x-1"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsFeedbackOpen(true);
                    }}
                  >
                    <MessageSquare className="w-5 h-5" />
                    Feedback
                  </button>
                  <button
                    className="w-full px-4 py-3 text-left text-zinc-300 hover:bg-zinc-800 transition-all duration-200 flex items-center gap-2 hover:text-white hover:translate-x-1"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-8 mb-4">
        <div className="bg-zinc-800 rounded-full flex items-center px-4 py-2 transition-all duration-300 hover:bg-zinc-700 focus-within:ring-2 focus-within:ring-blue-500">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none pl-2 text-zinc-400 w-full focus:text-white transition-colors duration-200"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-8 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="w-full transition-transform duration-200 hover:scale-[1.02]">
            <NoteSelector
              trigger={
                <Button variant="default" size="default" className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all duration-300">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Chat with Note</span>
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
          </div>
          <div className="w-full transition-transform duration-200 hover:scale-[1.02]">
            <NoteSelector
              trigger={
                <Button variant="default" size="default" className="w-full h-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-all duration-300">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Convert to Template</span>
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
          </div>
          <div className="w-full transition-transform duration-200 hover:scale-[1.02]">
            <NoteSelector
              trigger={
                <Button variant="default" size="default" className="w-full h-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all duration-300">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Flash Cards</span>
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
          </div>
          <div className="w-full transition-transform duration-200 hover:scale-[1.02]">
            <NoteSelector
              trigger={
                <Button variant="default" size="default" className="w-full h-full bg-yellow-600 hover:bg-yellow-700 text-white flex items-center justify-center transition-all duration-300">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Quiz</span>
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
        </div>
      </div>

      {/* Notes List Component */}
      {isLoading && notes.length === 0 ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-24 overscroll-none bg-black">
          <NotesList userId={user.uid} notes={filteredNotes} />
        </div>
      )}

      {/* New Note Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-10">
        <button
          className="bg-blue-500 text-white rounded-full px-8 py-3 flex items-center justify-center hover:bg-blue-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
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

      {/* Conditionally Rendered Components into the page */} 
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

      {/* Replace the Sheet component with the modal */}
      {isFeedbackOpen && renderFeedbackModal()}
    </div>
  );
}