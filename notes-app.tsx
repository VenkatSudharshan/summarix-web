"use client"

import { useState } from "react"
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
} from "lucide-react"

export default function NotesApp() {
  const [showModal, setShowModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState<number | null>(null)

  const notes = [
    {
      id: 1,
      title: "Integrating Salesforce & Adobe",
      preview: "Flybits with Salesforce. However, replacement...",
      date: "Feb 28, 2025",
      duration: "27:37",
      participants: 3,
      icon: <Rocket className="w-6 h-6 text-red-500" />,
      content: {
        sections: [
          {
            title: "Integration and Decommissioning Plans",
            icon: "📋",
            items: [
              {
                text: "Salesforce and Adobe Integration",
                subitems: [
                  "Salesforce will handle triggers, events, and customer targeting.",
                  "Content will be sourced from Adobe's Double CM (Content Management System).",
                ],
              },
              {
                text: "Canada's Implementation Example",
                subitems: [
                  "Canada has started implementing this integration with shared technical documentation.",
                  "Middle layer used by Canada: Mulesoft for orchestration between mobile app and backend systems.",
                ],
              },
            ],
          },
          {
            title: "Decommissioning Roadmap and Challenges",
            icon: "🚧",
            items: [
              {
                text: "Target Decommissioning Timeframe",
                subitems: ["Planned for August.", "Challenges include potentially increased volume and capacity."],
              },
              {
                text: "Integration Options and Tools",
                subitems: [
                  "Option 1: Mobile app to integrate directly with Salesforce.",
                  "Aim is to minimize additional dependencies.",
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: 2,
      title: "Traits of Successful Founders",
      preview: "And what have been the common traits in com...",
      date: "Feb 27, 2025",
      duration: "03:48",
      participants: 4,
      icon: <Star className="w-6 h-6 text-yellow-300" />,
    },
  ]

  const renderNotesList = () => (
    <div className="flex flex-col h-screen bg-black text-white relative">
      {/* Header */}
      <div className="flex justify-between items-center px-8 pt-6 pb-6">
        <h1 className="text-4xl font-bold">My Notes</h1>
        <button className="p-2">
          <Settings className="w-7 h-7" />
        </button>
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

      {/* Filters */}
      <div className="flex px-8 gap-2 mb-6">
        <button className="bg-blue-700 rounded-full px-4 py-1.5 flex items-center">
          <span className="text-white font-medium">All</span>
          <span className="ml-1.5 text-white font-medium">2</span>
        </button>
        <button className="bg-zinc-800 rounded-full w-10 h-10 flex items-center justify-center">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-auto px-4">
        {notes.map((note, index) => (
          <div
            key={note.id}
            className="border-b border-zinc-800 py-4 px-4 cursor-pointer"
            onClick={() => setSelectedNote(index)}
          >
            <div className="flex items-start">
              <div className="bg-zinc-800 rounded-full w-12 h-12 flex items-center justify-center mr-3">
                {note.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h2 className="text-xl font-semibold mb-1">{note.title}</h2>
                  <button onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="w-6 h-6 text-zinc-400" />
                  </button>
                </div>
                <p className="text-zinc-400 mb-2 line-clamp-1">{note.preview}</p>
                <div className="flex items-center text-zinc-500 text-sm">
                  <span>{note.date}</span>
                  <span className="mx-2">•</span>
                  <span>{note.duration}</span>
                  <span className="mx-2">•</span>
                  <span className="flex items-center">
                    <span>{note.participants}</span>
                    <Users className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Note Button (only shown when modal is not visible) */}
      {!showModal && (
        <div className="flex justify-center py-6">
          <button
            className="bg-blue-500 text-white rounded-full px-8 py-3 flex items-center justify-center"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="text-lg font-medium">New Note</span>
          </button>
        </div>
      )}

      {/* Modal Popup */}
      {showModal && (
        <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-xl">
          <div className="flex flex-col w-full">
            {/* Handle and Header */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-zinc-700 rounded-full"></div>
            </div>

            <div className="flex justify-between items-center px-6 py-2">
              <div className="flex items-center">
                <div className="bg-zinc-800 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M5 8L10 13L15 8L20 13"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 15L7 20L12 15L17 20L22 15"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-lg font-medium">Auto Detect</span>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 space-y-4">
              {/* Upload From Files */}
              <div className="bg-zinc-800 rounded-xl p-4 flex items-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-blue-200" />
                </div>
                <span className="text-xl font-medium">Upload From Files</span>
              </div>

              {/* Start Audio Recording */}
              <div className="bg-zinc-800 rounded-xl p-4 flex items-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                  <Mic className="w-6 h-6 text-blue-200" />
                </div>
                <span className="text-xl font-medium">Start Audio Recording</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Home Indicator */}
      <div className="flex justify-center py-2">
        <div className="w-32 h-1 bg-zinc-600 rounded-full"></div>
      </div>
    </div>
  )

  const renderNoteDetail = () => {
    const note = notes[selectedNote!]

    return (
      <div className="flex flex-col h-screen bg-black text-white">
        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-6 pb-2">
          <button className="p-2" onClick={() => setSelectedNote(null)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">{note.title}</h1>
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
          {note.content?.sections.map((section, idx) => (
            <div key={idx} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </h2>

              <ul className="space-y-4">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="ml-2">
                    <div className="flex items-baseline">
                      <span className="text-xl mr-2">•</span>
                      <span className="text-xl">{item.text}</span>
                    </div>

                    {item.subitems && (
                      <ul className="mt-2 ml-6 space-y-2">
                        {item.subitems.map((subitem, subIdx) => (
                          <li key={subIdx} className="flex items-baseline">
                            <span className="text-lg mr-2">○</span>
                            <span className="text-lg">{subitem}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

  return selectedNote !== null ? renderNoteDetail() : renderNotesList()
}

