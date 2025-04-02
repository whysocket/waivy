"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ConnectionErrorProps {
    error: string
    onRetry: () => void
}

export default function ConnectionError({ error, onRetry }: ConnectionErrorProps) {
    return (
        <div className="h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Connection Error
                    </CardTitle>
                    <CardDescription>Unable to connect to the chat server</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">{error}</p>
                    <p className="mb-4">This could be due to:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-4">
                        <li>The server is not running</li>
                        <li>Network connectivity issues</li>
                        <li>CORS policy restrictions</li>
                        <li>Incorrect server URL</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mb-4">Server URL: http://localhost:5184/chat</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={onRetry} className="w-full">
                        Retry Connection
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

