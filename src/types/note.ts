export interface Note {
  id: string;
  uid: string;
  title: string;
  type: 'audio' | 'youtube' | 'lecture';
  transcript?: string;
  formattedTranscript?: string;
  shortSummary?: string;
  summary?: string;
  keyTopics?: string;
  actionItems?: string;
  audioUrl?: string;
  youtubeUrl?: string;
  createdAt: number;
  flashCards?: string;
  mcq?: string;
} 