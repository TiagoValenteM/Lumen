"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccessRestricted, LoadingState, PageContainer, PageShell } from "@/components/shared/lumen-page";
import { InlineFeedback } from "@/components/shared/inline-feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toast } from "@/components/ui/toast";
import { Loader2, Upload, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { Profile } from "@/lib/types";

const MAX_BIO_LENGTH = 500;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bio, setBio] = useState("");
  const { toast, showSuccess, showError } = useToast();
  const remainingBio = MAX_BIO_LENGTH - bio.length;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const tag = profile?.tag || profile?.email?.split("@")[0] || "user";
    return getInitials(tag);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    async function loadProfile() {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, tag, avatar_url, bio")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) {
        setLoadError("Could not load your profile. Refresh the page to try again.");
      } else if (user) {
        setProfile({
          id: user.id,
          first_name: data?.first_name ?? user.user_metadata?.first_name ?? null,
          last_name: data?.last_name ?? user.user_metadata?.last_name ?? null,
          ...data,
          email: user.email ?? null,
        } as Profile);
        setBio(data?.bio || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [user, supabase]);

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return null;
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      showError("Avatar file is too large. Max size is 2MB.", 4000);
      return null;
    }
    const fileExt = avatarFile.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload avatar");
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      let newAvatarUrl = profile.avatar_url;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar();
        if (!newAvatarUrl) throw new Error("Avatar upload failed");
      }

      const updates = {
        first_name: profile.first_name?.trim() || null,
        last_name: profile.last_name?.trim() || null,
        tag: profile.tag?.trim() || null,
        avatar_url: newAvatarUrl,
        bio: bio.trim() || null,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...updates }, { onConflict: "id" });

      if (error) throw error;
      
      showSuccess("Profile updated successfully.");
      
      // Notify navbar to refresh profile data
      window.dispatchEvent(new Event("profileUpdated"));
      
      // Redirect back to profile page
      setTimeout(() => router.push("/profile"), 1000);
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      setSaveError(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (user && loading)) return <LoadingState label="Loading profile…" />;
  if (!user) return <AccessRestricted title="Edit profile" description="Sign in to edit your profile." backHref="/login" backLabel="Sign in" />;

  return (
    <PageShell>
      <PageContainer size="md" className="max-w-3xl gap-4 py-5 sm:py-8">
        <Button variant="ghost" asChild className="min-h-11 self-start">
          <Link href="/profile">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold">Edit profile</h1>
        {loadError ? <InlineFeedback error>{loadError}</InlineFeedback> : <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Update your personal details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} alt={initials} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Profile picture</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {avatarFile ? avatarFile.name : "Upload Image"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Max size 2MB. Supported formats: JPG, PNG, GIF
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={profile?.first_name || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, first_name: e.target.value } : p))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={profile?.last_name || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, last_name: e.target.value } : p))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">Email comes from authentication.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <Input
                  id="tag"
                  value={profile?.tag || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, tag: e.target.value } : p))}
                  placeholder="username"
                />
                <p className="text-xs text-muted-foreground">Shown as @tag on reviews.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={MAX_BIO_LENGTH}
                placeholder="Tell others about yourself..."
              />
              <p className={`text-xs ${remainingBio < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {remainingBio} characters remaining
              </p>
            </div>

            {saveError && <InlineFeedback error>{saveError}</InlineFeedback>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/profile")}
                disabled={saving}
                className="min-h-11"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-11"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>}

        {toast && <Toast message={toast.message} type={toast.type} />}
      </PageContainer>
    </PageShell>
  );
}
