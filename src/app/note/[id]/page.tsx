"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Chatbot, ChatbotRef } from "@/components/chatbot"
import { TemplateConverter, TemplateConverterRef } from "@/components/template-converter"
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText } from "lucide-react";
import { FlashCards, FlashCardsRef } from "@/components/flash-cards";
import Quiz, { QuizRef } from "@/components/quiz";

interface Note {
  id: string;
  meetingName: string;
  shortSummary: string;
  createdAt: any;
  numberOfPeople: number;
  uid: string;
  fileUrl?: string;
  filePath?: string;
  formattedTranscript?: string;
  summary?: string;
  actionItems?: string | string[];
  type?: 'audio' | 'youtube' | 'lecture';
  url?: string;
  lectureNotes?: string;
  topicsCovered?: string;
  lectureTitle?: string;
  downloadableUrl?: string;
  flashCards?: string;
  mcq?: string;
}

export default function NotePage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [activeTab, setActiveTab] = useState("transcript");
  const chatbotRef = useRef<ChatbotRef>(null);
  const templateConverterRef = useRef<TemplateConverterRef>(null);
  const flashCardsRef = useRef<FlashCardsRef>(null);
  const quizRef = useRef<QuizRef>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    const fetchNote = async () => {
      if (!id) return;
      
      try {
        // Try to fetch from audioProcessing collection first
        let noteDoc = await getDoc(doc(db, "audioProcessing", id as string));
        let noteType: 'audio' | 'youtube' | 'lecture' = 'audio';
        
        // If not found in audioProcessing, try youtubeTranscriptions
        if (!noteDoc.exists()) {
          noteDoc = await getDoc(doc(db, "youtubeTranscriptions", id as string));
          noteType = 'youtube';
        }
        
        // If not found in youtubeTranscriptions, try lectureTranscripts
        if (!noteDoc.exists()) {
          noteDoc = await getDoc(doc(db, "lectureTranscripts", id as string));
          noteType = 'lecture';
        }
        
        if (noteDoc.exists()) {
          const data = noteDoc.data();
          console.log("Firestore data:", data);
          console.log("Flash cards from doc:", data.flashCards);
          setNote({ 
            id: noteDoc.id, 
            ...data,
            type: noteType,
            numberOfPeople: noteType === 'lecture' ? 1 : (data.numberOfPeople || 1)
          } as Note);
        }
      } catch (error) {
        console.error("Error fetching note:", error);
      }
    };

    fetchNote();
  }, [id, user, loading, router]);

  if (loading || !note) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {note.type === 'lecture' ? note.lectureTitle || note.meetingName : note.meetingName}
          </h1>
          <p className="text-zinc-400">
            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'Date not available'} • {note.numberOfPeople} people
          </p>
        </div>

        {/* Audio Player - Only show for audio notes */}
        {note.type === 'audio' && note.fileUrl && (
          <div className="bg-zinc-900 rounded-xl p-6 mb-8">
            <audio 
              controls 
              className="w-full"
              src={note.fileUrl}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* YouTube URL - Only show for YouTube notes */}
        {note.type === 'youtube' && note.url && (
          <div className="bg-zinc-900 rounded-xl p-6 mb-8">
            <a 
              href={note.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-youtube"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
              Watch on YouTube
            </a>
          </div>
        )}

        {/* Audio Player - Only show for lecture notes */}
        {note.type === 'lecture' && note.downloadableUrl && (
          <div className="bg-zinc-900 rounded-xl p-6 mb-8">
            <audio 
              controls 
              className="w-full"
              src={note.downloadableUrl}
            >
              Your browser does not support this audio element.
            </audio>
          </div>
        )}

        {/* Action Buttons - Added above audio component */}
        <div className="mb-8 flex gap-4">
          <Button
            variant="default"
            size="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              if (chatbotRef.current) {
                chatbotRef.current.open();
              }
            }}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            <span>Chat with Note</span>
          </Button>

          {note.type === 'lecture' ? (
            <>
              <Button
                variant="default"
                size="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (flashCardsRef.current) {
                    flashCardsRef.current.open();
                  }
                }}
              >
                <FileText className="h-5 w-5 mr-2" />
                <span>Flash Cards</span>
              </Button>
              
              <Button
                variant="default"
                size="default"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  if (quizRef.current) {
                    quizRef.current.open();
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                <span>Generate Quiz</span>
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                if (templateConverterRef.current) {
                  templateConverterRef.current.open();
                }
              }}
            >
              <FileText className="h-5 w-5 mr-2" />
              <span>Convert to Template</span>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={note.type === 'lecture' ? "transcript" : "transcript"} className="w-full">
          <TabsList className={`grid w-full ${note.type === 'lecture' ? 'grid-cols-3' : 'grid-cols-3'} mb-4`}>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            {note.type === 'lecture' ? (
              <>
                <TabsTrigger value="lectureNotes">Lecture Notes</TabsTrigger>
                <TabsTrigger value="topicsCovered">Key Topics</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="actionItems">Action Items</TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <TabsContent value="transcript" className="p-6 h-[700px] overflow-y-auto">
              {note.formattedTranscript ? (
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {(() => {
                    // Preprocess the transcript to fix formatting issues
                    const processedTranscript = note.formattedTranscript
                      // Replace patterns like "[00:\n00:04" with "[00:00:04"
                      .replace(/\[\d{2}:\s*\n\s*\d{2}:\d{2}/g, (match) => {
                        return match.replace(/\s*\n\s*/g, '');
                      })
                      // Replace patterns like "SPEAKER_05:\n" with "SPEAKER_05: "
                      .replace(/([A-Za-z0-9_]+):\s*\n\s*/g, '$1: ')
                      // Replace multiple newlines with a single newline
                      .replace(/\n{2,}/g, '\n');
                    
                    return processedTranscript.split('\n').map((line, index) => {
                      const cleanLine = line.trim();
                      if (!cleanLine) return null;
                      
                      return <div key={index} className="mb-3">{cleanLine}</div>;
                    });
                  })()}
                </div>
              ) : (
                <div className="text-zinc-400">Transcript not available yet.</div>
              )}
            </TabsContent>

            {note.type === 'lecture' ? (
              <>
                <TabsContent value="lectureNotes" className="p-6 h-[700px] overflow-y-auto">
                  {note.lectureNotes ? (
                    <div className="whitespace-pre-wrap">{note.lectureNotes}</div>
                  ) : (
                    <div className="text-zinc-400">Lecture notes not available yet.</div>
                  )}
                </TabsContent>

                <TabsContent value="topicsCovered" className="p-6 h-[700px] overflow-y-auto">
                  {note.topicsCovered ? (
                    <div className="whitespace-pre-wrap">{note.topicsCovered}</div>
                  ) : (
                    <div className="text-zinc-400">Key topics not available yet.</div>
                  )}
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="summary" className="p-6 h-[700px] overflow-y-auto">
                  {note.summary ? (
                    <div className="whitespace-pre-wrap">{note.summary}</div>
                  ) : (
                    <div className="text-zinc-400">Summary not available yet.</div>
                  )}
                </TabsContent>

                <TabsContent value="actionItems" className="p-6 h-[700px] overflow-y-auto">
                  {note.actionItems ? (
                    <ul className="space-y-3">
                      {(() => {
                        // Process action items
                        let items: string[] = [];
                        
                        if (Array.isArray(note.actionItems)) {
                          items = note.actionItems;
                        } else if (typeof note.actionItems === 'string') {
                          // Split by bullet points and clean up
                          items = note.actionItems
                            .split('•')
                            .map((item: string) => item.trim())
                            .filter((item: string) => item.length > 0);
                        }
                        
                        return items.map((item, index) => {
                          // Extract assignee and task
                          const assigneeMatch = item.match(/^([^:]+):/);
                          let assignee = '';
                          let task = item;
                          
                          if (assigneeMatch) {
                            assignee = assigneeMatch[1].trim();
                            task = item.replace(assigneeMatch[0], '').trim();
                          }
                          
                          return (
                            <li key={index} className="flex items-start">
                              <div className="flex-shrink-0 mr-3 mt-1">
                                <input 
                                  type="checkbox" 
                                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                {assignee && <span className="font-medium text-green-400">{assignee}: </span>}
                                <span>{task}</span>
                              </div>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  ) : (
                    <div className="text-zinc-400">Action items not available yet.</div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>

      {/* Chatbot and Template Converter - Moved outside the main content div */}
      {note.formattedTranscript && (
        <>
          <Chatbot 
            ref={chatbotRef}
            transcript={note.formattedTranscript} 
            hideTrigger={true}
          />
          {note.type !== 'lecture' && (
            <TemplateConverter 
              ref={templateConverterRef}
              transcript={note.formattedTranscript} 
              hideTrigger={true}
            />
          )}
          {note.type === 'lecture' && (
            <>
              <FlashCards
                ref={flashCardsRef}
                flashCardsText={note.flashCards}
                hideTrigger={true}
              />
              <Quiz
                ref={quizRef}
                mcqText={note.mcq}
                hideTrigger={true}
              />
            </>
          )}
        </>
      )}
    </div>
  );
} 