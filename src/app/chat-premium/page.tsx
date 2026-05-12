'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Send, Paperclip, Smile, Phone, MoreVertical, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChatMessagePremium } from '@/components/ChatMessagePremium'
import { Badge } from '@/components/ui/Badge'

const demoMessages = [
  {
    id: '1',
    content: 'Hi John, I have an AC issue. Can you come by today?',
    senderName: 'Sarah (You)',
    senderType: 'homeowner' as const,
    isOwn: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    status: 'read' as const,
  },
  {
    id: '2',
    content: 'Sure! I can be there by 3pm. Does that work?',
    senderName: "John's Plumbing",
    senderPhoto: 'https://images.unsplash.com/photo-1582721471835-a2fda5147bd3?w=48&h=48&fit=crop',
    senderType: 'contractor' as const,
    isOwn: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 43),
    status: 'read' as const,
  },
  {
    id: '3',
    content: 'Perfect! Address is 123 Main St, The Woodlands',
    senderName: 'Sarah (You)',
    senderType: 'homeowner' as const,
    isOwn: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 40),
    status: 'read' as const,
  },
  {
    id: '4',
    photoUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&h=300&fit=crop',
    content: "Here's a photo of the issue",
    senderName: 'Sarah (You)',
    senderType: 'homeowner' as const,
    isOwn: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 38),
    status: 'read' as const,
  },
  {
    id: '5',
    content: "Got it! Looks like a compressor issue. I'll bring the right parts. See you at 3!",
    senderName: "John's Plumbing",
    senderPhoto: 'https://images.unsplash.com/photo-1582721471835-a2fda5147bd3?w=48&h=48&fit=crop',
    senderType: 'contractor' as const,
    isOwn: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 35),
    status: 'read' as const,
  },
]

type ChatMessage = {
  id: string;
  content: string;
  senderName: string;
  senderType: 'homeowner' | 'contractor';
  isOwn: boolean;
  timestamp: Date;
  status: 'read' | 'sent' | 'sending';
  senderPhoto?: string;
  photoUrl?: string;
}

export default function ChatPremiumPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(demoMessages)
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim()) {
      const newMessage: ChatMessage = {
        id: String(messages.length + 1),
        content: input,
        senderName: 'Sarah (You)',
        senderType: 'homeowner',
        isOwn: true,
        timestamp: new Date(),
        status: 'sending',
      }
      setMessages([...messages, newMessage])
      setInput('')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto h-screen flex flex-col bg-white dark:bg-neutral-900">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1582721471835-a2fda5147bd3?w=48&h=48&fit=crop"
                    alt="John"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 rounded-full ring-2 ring-white dark:ring-neutral-900" />
                </div>
                <div>
                  <h1 className="font-semibold text-neutral-900 dark:text-white">
                    John's Plumbing & HVAC
                  </h1>
                  <p className="text-sm text-success-600 dark:text-success-400">
                    Online now
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="p-2">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Job info */}
            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="primary" className="text-xs">
                  Job in Progress
                </Badge>
              </div>
              <p className="text-sm font-medium text-primary-900 dark:text-primary-100 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                AC Repair - 123 Main St, The Woodlands
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
          <div className="py-4 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Today at 2:15 PM
            </p>
          </div>

          {messages.map((message) => (
            <ChatMessagePremium key={message.id} {...message} />
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-4">
          <div className="flex gap-3 mb-3">
            <Button variant="ghost" size="sm" className="p-2">
              <Paperclip className="w-5 h-5" />
            </Button>
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 py-3"
              />
              <Button
                variant="success"
                size="sm"
                className="px-4"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="p-2">
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Payments protected • Press Enter to send
          </p>
        </div>
      </div>
    </div>
  )
}
