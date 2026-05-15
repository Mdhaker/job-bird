import { useState } from "react";
import { useLinkedInAccounts, useCreateLinkedInAccount, useDeleteLinkedInAccount } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2, XCircle, Linkedin } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function Accounts() {
  const { data: accounts = [], isLoading } = useLinkedInAccounts();
  const createMutation = useCreateLinkedInAccount();
  const deleteMutation = useDeleteLinkedInAccount();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync(form);
      setForm({ label: "", email: "", password: "" });
      setShowForm(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Remove this LinkedIn account?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage LinkedIn credentials for scanning</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Your credentials are encrypted at rest. Use a dedicated LinkedIn account for scraping — not your primary one — to avoid risk of session blocks.
          </p>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add LinkedIn Account</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input placeholder="e.g. My Scraper Account" value={form.label} onChange={(e) => set("label", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="linkedin@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input type="password" placeholder="LinkedIn password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
              </div>
              {error && (
                <div className="md:col-span-3 flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}
              <div className="md:col-span-3 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No LinkedIn accounts added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Linkedin className="h-4 w-4 text-blue-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.label}</span>
                        {account.is_blocked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" /> Blocked
                          </span>
                        ) : account.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                      {account.last_used_at && (
                        <p className="text-xs text-muted-foreground">Last used: {formatDate(account.last_used_at)}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(account.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
