"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Save } from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  tag: string | null;
  avatar_url: string | null;
  bio?: string | null;
}

const MAX_BIO_LENGTH = 300;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bio, setBio] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const remainingBio = MAX_BIO_LENGTH - bio.length;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const tag = profile?.tag || profile?.email?.split("@")[0] || "user";
    return tag.substring(0, 2).toUpperCase();
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    async function loadProfile() {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, tag, avatar_url")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch profile", error);
      } else if (data) {
        setProfile(data as Profile);
        setBio((data as any).bio || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase, user]);

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return null;
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      setToast({ message: "Avatar file is too large. Max size is 2MB.", type: "error" });
      setTimeout(() => setToast(null), 4000);
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
        email: profile.email, // do not change email here; it mirrors auth
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      setAvatarFile(null);
      setToast({ message: "Profile updated successfully.", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setToast({ message: error?.message || "Failed to save profile", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Profile</CardTitle>
            <CardDescription>View and edit your profile information.</CardDescription>
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
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Max size 2MB.
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
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                placeholder="Tell others about you..."
              />
              <p className={`text-xs ${remainingBio < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {remainingBio} characters remaining
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

// Toast banner
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-2 shadow-lg border text-sm ${
        type === "success"
          ? "bg-emerald-600 text-white border-emerald-500"
          : "bg-destructive text-destructive-foreground border-destructive/70"
      }`}
    >
      {message}
    </div>
  );
}
