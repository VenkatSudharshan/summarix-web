"use client";

import { Note } from "@/types/note";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "./ui/sheet";
import { Button } from "./ui/button";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCw, ArrowLeft } from "lucide-react";

export interface FlashCardsRef {
  open: () => void;
  close: () => void;
}

interface FlashCardsProps {
  note?: Note;
  flashCardsText?: string;
  hideTrigger?: boolean;
  onClose?: () => void;
}

interface FlashCard {
  question: string;
  answer: string;
}

export const FlashCards = forwardRef<FlashCardsRef, FlashCardsProps>(
  ({ note, flashCardsText, hideTrigger = false, onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Parse flash cards data
    useEffect(() => {
      setIsLoading(true);
      try {
        let parsedCards: FlashCard[] = [];
        
        // Try to parse as JSON first
        if (note?.flashCards) {
          try {
            parsedCards = JSON.parse(note.flashCards);
          } catch (e) {
            // If JSON parsing fails, try to parse the text format
            parsedCards = parseFlashCardsText(note.flashCards);
          }
        } else if (flashCardsText) {
          try {
            parsedCards = JSON.parse(flashCardsText);
          } catch (e) {
            // If JSON parsing fails, try to parse the text format
            parsedCards = parseFlashCardsText(flashCardsText);
          }
        }
        
        setFlashCards(parsedCards);
      } catch (error) {
        console.error("Error parsing flash cards:", error);
        setFlashCards([]);
      } finally {
        setIsLoading(false);
      }
    }, [note?.flashCards, flashCardsText]);

    // Function to parse flash cards from text format
    const parseFlashCardsText = (text: string): FlashCard[] => {
      const cards: FlashCard[] = [];
      
      // Split by double newlines to separate cards
      const cardTexts = text.split(/\n\n+/);
      
      for (const cardText of cardTexts) {
        // Look for question pattern: **Q:** or **Question:** followed by text
        const questionMatch = cardText.match(/\*\*Q:?\*\* (.*?)(?:\n|$)/i) || 
                             cardText.match(/\*\*Question:?\*\* (.*?)(?:\n|$)/i);
        
        // Look for answer pattern: **A:** or **Answer:** followed by text
        const answerMatch = cardText.match(/\*\*A:?\*\* (.*?)(?:\n|$)/i) || 
                           cardText.match(/\*\*Answer:?\*\* (.*?)(?:\n|$)/i);
        
        if (questionMatch && answerMatch) {
          cards.push({
            question: questionMatch[1].trim(),
            answer: answerMatch[1].trim()
          });
        }
      }
      
      return cards;
    };

    const hasCards = flashCards.length > 0;

    const handleOpen = () => {
      setIsOpen(true);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    };

    const handleClose = () => {
      setIsOpen(false);
      if (onClose) onClose();
    };

    const handleNext = () => {
      if (currentCardIndex < flashCards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setIsFlipped(false);
      }
    };

    const handlePrevious = () => {
      if (currentCardIndex > 0) {
        setCurrentCardIndex(currentCardIndex - 1);
        setIsFlipped(false);
      }
    };

    const handleShuffle = () => {
      const shuffled = [...flashCards].sort(() => Math.random() - 0.5);
      setFlashCards(shuffled);
      setCurrentCardIndex(0);
      setIsFlipped(false);
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
            <span>Flash Cards</span>
          </Button>
        )}
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden bg-[#1C1C1C] flex flex-col">
          <SheetHeader className="px-6 py-4">
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
                <SheetTitle className="text-white text-lg font-medium">Flash Cards</SheetTitle>
              </div>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-zinc-400 mt-4">Loading flash cards...</p>
            </div>
          ) : !hasCards ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-zinc-400">No flash cards available for this note.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div 
                  className="w-full max-w-xl cursor-pointer perspective-1000"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="relative">
                    <div className={`transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                      {/* Front of card */}
                      <div className="backface-hidden">
                        <div className="bg-[#2C2C2C] rounded-xl p-8 min-h-[180px] flex flex-col items-center justify-center">
                          <p className="text-[22px] text-white text-center leading-relaxed font-normal break-words">
                            {flashCards[currentCardIndex].question}
                          </p>
                          <p className="text-sm text-zinc-500 mt-4">Click to flip</p>
                        </div>
                      </div>
                      
                      {/* Back of card */}
                      <div className="backface-hidden rotate-y-180 absolute inset-0">
                        <div className="bg-[#2C2C2C] rounded-xl p-8 min-h-[180px] flex flex-col items-center justify-center">
                          <p className="text-[22px] text-white text-center leading-relaxed font-normal break-words">
                            {flashCards[currentCardIndex].answer}
                          </p>
                          <p className="text-sm text-zinc-500 mt-4">Click to flip</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.08]">
                <div className="flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    disabled={currentCardIndex === 0}
                    className="text-white/70 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 h-10 w-10"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <div className="flex gap-4 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShuffle}
                      className="text-white/70 hover:text-white hover:bg-white/[0.08] h-10 w-10"
                    >
                      <RotateCw className="h-5 w-5" />
                    </Button>
                    <p className="text-sm text-white/70 tabular-nums">
                      Card {currentCardIndex + 1} of {flashCards.length}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    disabled={currentCardIndex === flashCards.length - 1}
                    className="text-white/70 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 h-10 w-10"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }
);

FlashCards.displayName = "FlashCards"; 