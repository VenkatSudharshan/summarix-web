"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronLeft, ChevronRight, RotateCw, ArrowLeft } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
}

interface QuizProps {
  mcqText?: string;
  hideTrigger?: boolean;
  onClose?: () => void;
}

export interface QuizRef {
  open: () => void;
  close: () => void;
}

export const Quiz = forwardRef<QuizRef, QuizProps>(
  ({ mcqText, hideTrigger = false, onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showAnswer, setShowAnswer] = useState(false);

    // Parse MCQ text into structured data
    useEffect(() => {
      if (mcqText) {
        setIsLoading(true);
        try {
          console.log("Parsing MCQ text:", mcqText);
          // Normalize line endings and ensure consistent spacing
          const normalizedText = mcqText
            .replace(/\r\n/g, '\n')  // Convert Windows line endings
            .replace(/\r/g, '\n')    // Convert old Mac line endings
            .replace(/\n\n+/g, '\n') // Convert multiple line breaks to single
            .trim();
          
          const questionRegex = /\*\*Question:\*\* (.*?)\na\) (.*?)\nb\) (.*?)\nc\) (.*?)\n✅ Correct answer: ([abc])/g;
          const matches = [];
          let match;

          while ((match = questionRegex.exec(normalizedText)) !== null) {
            console.log("Found match:", match);
            matches.push({
              question: match[1].trim(),
              options: [match[2].trim(), match[3].trim(), match[4].trim()],
              correctAnswer: match[5],
              userAnswer: undefined
            });
          }

          console.log("Parsed questions:", matches);
          setQuestions(matches);
        } catch (error) {
          console.error("Error parsing MCQ:", error, "Text was:", mcqText);
          setQuestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setQuestions([]);
        setIsLoading(false);
      }
    }, [mcqText]);

    const handleOpen = () => {
      setIsOpen(true);
      setCurrentIndex(0);
      setShowAnswer(false);
    };

    const handleClose = () => {
      setIsOpen(false);
      if (onClose) onClose();
    };

    const handleNext = () => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      }
    };

    const handlePrev = () => {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setShowAnswer(false);
      }
    };

    const handleOptionClick = (option: string, index: number) => {
      const updatedQuestions = [...questions];
      updatedQuestions[currentIndex].userAnswer = String.fromCharCode(97 + index); // Convert 0,1,2 to a,b,c
      setQuestions(updatedQuestions);
      setShowAnswer(true);
    };

    const handleShuffle = () => {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setCurrentIndex(0);
      setShowAnswer(false);
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      open: handleOpen,
      close: handleClose
    }));

    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        {!hideTrigger && (
          <Button
            variant="default"
            size="default"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
            <span>Generate Quiz</span>
          </Button>
        )}
        <SheetContent 
          side="right" 
          className="w-full sm:w-[500px] p-0 bg-zinc-900"
          aria-description="Quiz questions for the lecture content"
        >
          <SheetHeader className="p-6 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  onClick={() => {
                    handleClose();
                    setIsOpen(false);
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back</span>
                </Button>
                <SheetTitle className="text-white">Quiz</SheetTitle>
              </div>
            </div>
          </SheetHeader>
          
          <div className="flex flex-col h-[calc(100vh-5rem)]">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : questions.length > 0 ? (
              <>
                <div className="flex-1 flex flex-col p-6">
                  <div className="mb-6">
                    <div className="text-sm text-blue-400 mb-2">Question {currentIndex + 1} of {questions.length}</div>
                    <div className="text-2xl font-medium text-white">{questions[currentIndex].question}</div>
                  </div>
                  
                  <div className="space-y-4">
                    {questions[currentIndex].options.map((option, idx) => {
                      const optionLetter = String.fromCharCode(97 + idx);
                      const isSelected = questions[currentIndex].userAnswer === optionLetter;
                      const isCorrect = optionLetter === questions[currentIndex].correctAnswer;
                      const showCorrectness = showAnswer && isSelected;
                      
                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          className={`w-full justify-start text-left p-4 h-auto text-white whitespace-normal break-words ${
                            showAnswer && isCorrect ? 'bg-green-600 hover:bg-green-700 border-green-500' :
                            showAnswer && isSelected ? 'bg-red-600 hover:bg-red-700 border-red-500' :
                            'bg-zinc-800 hover:bg-zinc-700 border-zinc-600'
                          } ${showAnswer && 'cursor-default'}`}
                          onClick={() => !showAnswer && handleOptionClick(option, idx)}
                          disabled={showAnswer}
                        >
                          <div className="flex items-center">
                            <span className="text-sm font-medium mr-3 text-blue-400">{optionLetter})</span>
                            <span className="flex-1">{option}</span>
                            {showAnswer && isCorrect && (
                              <Check className="h-5 w-5 text-white ml-2" />
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="p-6 pb-12 border-t border-zinc-800">
                  <div className="flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="bg-zinc-800 border-zinc-600 hover:bg-blue-600 hover:border-blue-500 w-12 h-12 transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="h-8 w-8 text-zinc-100" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleShuffle}
                      className="bg-zinc-800 border-zinc-600 hover:bg-purple-600 hover:border-purple-500 w-12 h-12 transition-colors"
                    >
                      <RotateCw className="h-6 w-6 text-zinc-100" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleNext}
                      disabled={currentIndex === questions.length - 1}
                      className="bg-zinc-800 border-zinc-600 hover:bg-blue-600 hover:border-blue-500 w-12 h-12 transition-colors disabled:opacity-50"
                    >
                      <ChevronRight className="h-8 w-8 text-zinc-100" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-2xl font-medium text-white mb-2">No Quiz Available</div>
                  <div className="text-blue-400">There are no quiz questions for this lecture.</div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

Quiz.displayName = "Quiz";

export default Quiz; 