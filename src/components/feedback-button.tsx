"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

interface FeedbackButtonProps {
  "data-feedback-button"?: string;
}

export function FeedbackButton(props: FeedbackButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    if (!feedbackType || !description) {
      toast.error("Please select a feedback type and provide a description");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement feedback submission logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      toast.success("Thank you for your feedback!");
      setIsOpen(false);
      setFeedbackType("");
      setDescription("");
    } catch (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" {...props}>
          Feedback
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Send Feedback</SheetTitle>
          <SheetDescription>
            Help us improve by sharing your thoughts.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type of Feedback</label>
            <div className="grid grid-cols-2 gap-2">
              {["Bug", "Feature", "Improvement", "Other"].map((type) => (
                <Button
                  key={type}
                  variant={feedbackType === type ? "default" : "outline"}
                  onClick={() => setFeedbackType(type)}
                  className="transition-all duration-200"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Tell us more..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
} 