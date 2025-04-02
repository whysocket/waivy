"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useConnection } from "@/context/connection-context"

interface UsernameDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUsernameSet: (username: string) => void
}

export default function UsernameDialog({ open, onOpenChange, onUsernameSet }: UsernameDialogProps) {
    const [usernameInput, setUsernameInput] = useState<string>("")
    const { connection } = useConnection()

    const setUsername = () => {
        if (!connection || !usernameInput.trim()) return

        connection
            .invoke("SetUsername", usernameInput.trim())
            .then(() => {
                onUsernameSet(usernameInput.trim())
                setUsernameInput("")
            })
            .catch((err) => {
                console.error("Error setting username:", err)
            })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Enter your username</DialogTitle>
                    <DialogDescription>Choose a username to identify yourself in the chat.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="username" className="text-right">
                            Username
                        </Label>
                        <Input
                            id="username"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            className="col-span-3"
                            onKeyDown={(e) => e.key === "Enter" && setUsername()}
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={setUsername} disabled={!usernameInput.trim()}>
                        Join Chat
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

