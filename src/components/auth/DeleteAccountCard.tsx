"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export const DELETE_CONFIRMATION_WORD = "delete"

/** Permanently deletes the signed-in account. Typing the word guards against a stray click. */
export function DeleteAccountCard() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)

  const confirmed = typed.trim().toLowerCase() === DELETE_CONFIRMATION_WORD

  function handleOpenChange(next: boolean) {
    if (busy) return
    setOpen(next)
    if (!next) setTyped("")
  }

  async function handleDelete() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc("delete_my_account")
    if (error) {
      toast.error(error.message)
      setBusy(false)
      return
    }
    // The account is gone; end this browser's session too.
    await supabase.auth.signOut()
    toast.success("Your account was deleted")
    router.push("/")
    router.refresh()
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="size-4" />
          Delete account
        </CardTitle>
        <CardDescription>
          Permanently removes your account and everything in it: your calendar, completed workouts, coach chat and
          friendships. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Everything is deleted for good. Sessions you shared with friends stay on their calendars as ordinary
              workouts. There is no way to recover it afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              Type <strong>{DELETE_CONFIRMATION_WORD}</strong> to confirm
            </Label>
            <Input
              id="delete-confirmation"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!confirmed || busy}>
              {busy ? "Deleting..." : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
