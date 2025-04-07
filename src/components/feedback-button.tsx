"use client";

import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Toast from "@/components/Toast";

interface FeedbackButtonProps {
  userId: string;
}

export function FeedbackButton({ userId }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId,
        type: feedbackType,
        description: description.trim(),
        status: 'new',
        createdAt: new Date(),
      });

      setToast({ message: 'Feedback submitted successfully!', type: 'success' });
      setDescription('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setToast({ message: 'Failed to submit feedback. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border-zinc-700 flex items-center gap-2"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        <span>Feedback</span>
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="bg-zinc-900 border-zinc-800">
          <SheetHeader>
            <SheetTitle className="text-white">Submit Feedback</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Feedback Type</label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as 'bug' | 'feature' | 'general')}
                className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              >
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="general">General Feedback</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your feedback in detail..."
                className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] text-base placeholder-zinc-500"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 flex items-center justify-center gap-2"
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
} 