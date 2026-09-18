"use client"

import { MessageSquare, Sparkles } from "lucide-react"

import { CoachChat, type ChatMessage } from "@/components/coach/CoachChat"
import { PlanWeekPanel } from "@/components/coach/PlanWeekPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CoachView({ initialMessages }: { initialMessages: ChatMessage[] }) {
  return (
    <Tabs defaultValue="chat" className="gap-4">
      <TabsList>
        <TabsTrigger value="chat">
          <MessageSquare className="size-3.5" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="plan">
          <Sparkles className="size-3.5" />
          Plan my week
        </TabsTrigger>
      </TabsList>
      <TabsContent value="chat">
        <CoachChat initialMessages={initialMessages} />
      </TabsContent>
      <TabsContent value="plan">
        <PlanWeekPanel />
      </TabsContent>
    </Tabs>
  )
}
