import { useState, useRef } from "react";
import {
  useCandidateProfiles,
  useCreateCandidateProfile,
  useUpdateCandidateProfile,
  useUploadCV,
} from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Upload, Loader2, AlertCircle, FileText, X } from "lucide-react";
import type { CandidateProfile } from "@/api/types";

function ProfileForm({
  initial,
  onSave,
  onCancel,
  isPending,
  error,
}: {
  initial?: Partial<CandidateProfile>;
  onSave: (data: Partial<CandidateProfile>) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    title: initial?.title ?? "",
    summary: initial?.summary ?? "",
    skills: (initial?.skills ?? []).join(", "),
    experience_years: initial?.experience_years?.toString() ?? "",
    languages: (initial?.languages ?? []).join(", "),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      title: form.title || undefined,
      summary: form.summary || undefined,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
      languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Full Name *</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Job Title</Label>
        <Input placeholder="e.g. Senior Software Engineer" value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="md:col-span-2 space-y-1.5">
        <Label>Summary</Label>
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          placeholder="Brief professional summary..."
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Skills (comma-separated)</Label>
        <Input placeholder="React, TypeScript, Node.js..." value={form.skills} onChange={(e) => set("skills", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Years of Experience</Label>
        <Input type="number" min={0} max={50} value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Languages (comma-separated)</Label>
        <Input placeholder="English, French..." value={form.languages} onChange={(e) => set("languages", e.target.value)} />
      </div>

      {error && (
        <div className="md:col-span-2 flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="md:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </div>
    </form>
  );
}

export default function Profile() {
  const { data: profiles = [], isLoading } = useCandidateProfiles();
  const createMutation = useCreateCandidateProfile();
  const updateMutation = useUpdateCandidateProfile();
  const uploadMutation = useUploadCV();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingProfileId, setUploadingProfileId] = useState<string | null>(null);

  const handleCreate = async (data: Partial<CandidateProfile>) => {
    setCreateError(null);
    try {
      await createMutation.mutateAsync(data);
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  const handleUpdate = async (id: string, data: Partial<CandidateProfile>) => {
    setUpdateError(null);
    try {
      await updateMutation.mutateAsync({ id, data });
      setEditingId(null);
    } catch (err: any) {
      setUpdateError(err.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, profileId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProfileId(profileId);
    try {
      await uploadMutation.mutateAsync({ id: profileId, file });
    } catch {
      // error handled silently — toast would be added here
    } finally {
      setUploadingProfileId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Candidate Profile</h1>
          <p className="text-muted-foreground mt-1">Your profile is used by AI to score job matches</p>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Profile
          </Button>
        )}
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create Profile</CardTitle></CardHeader>
          <CardContent>
            <ProfileForm
              onSave={handleCreate}
              onCancel={() => setShowCreate(false)}
              isPending={createMutation.isPending}
              error={createError}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : profiles.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No profile yet. Create one to enable AI job scoring.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle>{profile.name}</CardTitle>
                  {profile.title && <p className="text-sm text-muted-foreground mt-0.5">{profile.title}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingId(editingId === profile.id ? null : profile.id)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingId === profile.id ? (
                  <ProfileForm
                    initial={profile}
                    onSave={(data) => handleUpdate(profile.id, data)}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                    error={updateError}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {profile.summary && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-muted-foreground">Summary: </span>{profile.summary}
                      </div>
                    )}
                    {profile.skills.length > 0 && (
                      <div>
                        <span className="font-medium text-muted-foreground">Skills: </span>
                        {profile.skills.join(", ")}
                      </div>
                    )}
                    {profile.experience_years != null && (
                      <div>
                        <span className="font-medium text-muted-foreground">Experience: </span>
                        {profile.experience_years} years
                      </div>
                    )}
                    {profile.languages.length > 0 && (
                      <div>
                        <span className="font-medium text-muted-foreground">Languages: </span>
                        {profile.languages.join(", ")}
                      </div>
                    )}
                  </div>
                )}

                {/* CV Upload */}
                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {profile.cv_filename ? (
                      <span className="text-green-600">{profile.cv_filename}</span>
                    ) : (
                      <span className="text-muted-foreground">No CV uploaded</span>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, profile.id)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingProfileId === profile.id}
                    >
                      {uploadingProfileId === profile.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {profile.cv_filename ? "Replace CV" : "Upload CV"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
