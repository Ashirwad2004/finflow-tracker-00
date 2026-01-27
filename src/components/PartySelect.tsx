import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/lib/auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

interface PartySelectProps {
    type: "customer" | "vendor" | "both"
    value?: string // party_id
    onChange: (partyId: string, party?: any) => void
    onNameChange?: (name: string) => void // Fallback if no party created
    placeholder?: string
}

export function PartySelect({ type, value, onChange, onNameChange, placeholder = "Select party..." }: PartySelectProps) {
    const [open, setOpen] = React.useState(false)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // New Party Form State
    const [newPartyName, setNewPartyName] = React.useState("")
    const [newPartyPhone, setNewPartyPhone] = React.useState("")
    const [newPartyEmail, setNewPartyEmail] = React.useState("")

    const { data: parties = [] } = useQuery({
        queryKey: ["parties", type],
        queryFn: async () => {
            let query = supabase.from("parties").select("*").eq("user_id", user?.id)

            if (type !== 'both') {
                query = query.in('type', [type, 'both'])
            }

            const { data, error } = await query
            if (error) throw error
            return data || []
        },
        enabled: !!user,
    })

    const createPartyMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.from("parties").insert({
                user_id: user?.id,
                name: newPartyName,
                type: type === 'both' ? 'customer' : type, // Default to customer if both? Or let user pick? For now simple.
                phone: newPartyPhone,
                email: newPartyEmail
            }).select().single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["parties"] })
            toast({ title: "Party created", description: `${data.name} has been added.` })
            onChange(data.id, data)
            setIsDialogOpen(false)
            setOpen(false)
            setNewPartyName("")
            setNewPartyPhone("")
            setNewPartyEmail("")
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" })
        }
    })

    const selectedParty = parties.find((party: any) => party.id === value)

    return (
        <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {selectedParty ? selectedParty.name : (value ? "Unknown Party" : placeholder)}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder={`Search ${type}...`} value={search} onValueChange={setSearch} />
                        <CommandList>
                            <CommandEmpty>
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                    No found.
                                    <Button variant="link" size="sm" onClick={() => setIsDialogOpen(true)} className="px-1 text-primary">
                                        Create "{search}"?
                                    </Button>
                                </div>
                            </CommandEmpty>
                            <CommandGroup>
                                {parties.map((party: any) => (
                                    <CommandItem
                                        key={party.id}
                                        value={party.name}
                                        onSelect={() => {
                                            onChange(party.id, party)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === party.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {party.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem onSelect={() => setIsDialogOpen(true)} className="cursor-pointer">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New {type === 'customer' ? 'Customer' : type === 'vendor' ? 'Vendor' : 'Party'}
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New {type === 'customer' ? 'Customer' : 'Vendor'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                placeholder="Name"
                                value={newPartyName}
                                onChange={e => setNewPartyName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                placeholder="Phone"
                                value={newPartyPhone}
                                onChange={e => setNewPartyPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                placeholder="Email"
                                value={newPartyEmail}
                                onChange={e => setNewPartyEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => createPartyMutation.mutate()} disabled={!newPartyName}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
