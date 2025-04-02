import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { ConnectionEvent } from "@/types/chat"

interface ConnectionEventsProps {
    events: ConnectionEvent[]
}

export default function ConnectionEvents({ events }: ConnectionEventsProps) {
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    return (
        <ScrollArea className="h-[calc(100vh-350px)]">
            <ul className="space-y-2">
                {events.map((event, index) => (
                    <li key={`${index}-${event.timestamp.getTime()}`} className="flex items-center p-2 border-b">
                        <Badge
                            variant={
                                event.text.includes("connected") && !event.text.includes("disconnected") ? "outline" : "destructive"
                            }
                            className="mr-2"
                        >
                            {event.text.includes("disconnected") ? "Disconnected" : "Connected"}
                        </Badge>
                        <span className="flex-1">{event.text}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
                    </li>
                ))}
            </ul>
        </ScrollArea>
    )
}

