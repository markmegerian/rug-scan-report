import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Upload, Building2, Save, Loader2, Lock, Bell, Eye, EyeOff, Mail, Palette, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ServicePricing from "@/components/ServicePricing";
import EmailTemplatesSettings from "@/components/EmailTemplatesSettings";
import PaymentInfoSettings from "@/components/PaymentInfoSettings";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import DarkModeToggle from "@/components/DarkModeToggle";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  logo_url: string | null;
  logo_path: string | null;
  notification_preferences: {
    emailReports: boolean;
    jobUpdates: boolean;
    marketingEmails: boolean;
  } | null;
}

const AccountSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    business_name: "",
    business_address: "",
    business_phone: "",
    business_email: "",
  });

  // Track initial form values for dirty state detection
  const [initialFormData, setInitialFormData] = useState({
    full_name: "",
    business_name: "",
    business_address: "",
    business_phone: "",
    business_email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    emailReports: true,
    jobUpdates: true,
    marketingEmails: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Use the signed URL hook for logo display
  const { signedUrl: logoSignedUrl } = useSignedUrl(profile?.logo_path);

  // Check if form has unsaved changes
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  
  // Handle unsaved changes warning
  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data as unknown as Profile);
        const loadedFormData = {
          full_name: data.full_name || "",
          business_name: data.business_name || "",
          business_address: data.business_address || "",
          business_phone: data.business_phone || "",
          business_email: data.business_email || "",
        };
        setFormData(loadedFormData);
        setInitialFormData(loadedFormData);
        
        // Load notification preferences from database
        if (data.notification_preferences) {
          const prefs = data.notification_preferences as Profile['notification_preferences'];
          if (prefs) {
            setNotifications({
              emailReports: prefs.emailReports ?? true,
              jobUpdates: prefs.jobUpdates ?? true,
              marketingEmails: prefs.marketingEmails ?? false,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}-logo-${Date.now()}.${fileExt}`;
      // Include user ID in path for user-scoped storage policies
      const filePath = `${user!.id}/logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("rug-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the file path instead of signed URL (prevents expiration issues)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ logo_path: filePath })
        .eq("user_id", user!.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, logo_path: filePath } : null);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          business_name: formData.business_name || null,
          business_address: formData.business_address || null,
          business_phone: formData.business_phone || null,
          business_email: formData.business_email || null,
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      // Update initial values to match saved data (clears dirty state)
      setInitialFormData(formData);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      // Verify current password before allowing change
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: passwordData.currentPassword,
      });

      if (verifyError) {
        toast.error("Current password is incorrect");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const removeLogo = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ logo_url: null, logo_path: null })
        .eq("user_id", user!.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, logo_url: null, logo_path: null } : null);
      toast.success("Logo removed");
    } catch (error) {
      console.error("Error removing logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  // Save notification preferences to database
  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    setSavingNotifications(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: newNotifications })
        .eq("user_id", user!.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast.error("Failed to save notification preferences");
      // Revert on error
      setNotifications(notifications);
    } finally {
      setSavingNotifications(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account, security, and business branding
            </p>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your personal details for account identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Password & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password & Security
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                variant="outline"
              >
                {changingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailReports">Email Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive analysis reports via email
                  </p>
                </div>
                <Switch
                  id="emailReports"
                  checked={notifications.emailReports}
                  disabled={savingNotifications}
                  onCheckedChange={(checked) => handleNotificationChange('emailReports', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="jobUpdates">Job Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when job status changes
                  </p>
                </div>
                <Switch
                  id="jobUpdates"
                  checked={notifications.jobUpdates}
                  disabled={savingNotifications}
                  onCheckedChange={(checked) => handleNotificationChange('jobUpdates', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketingEmails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive tips, updates, and promotions
                  </p>
                </div>
                <Switch
                  id="marketingEmails"
                  checked={notifications.marketingEmails}
                  disabled={savingNotifications}
                  onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Pricing */}
          {user && <ServicePricing userId={user.id} />}

          {/* Payment Information */}
          <PaymentInfoSettings />

          {/* Business Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Branding
              </CardTitle>
              <CardDescription>
                Your business logo and information will appear on generated reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label>Business Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 rounded-lg">
                    <AvatarImage src={logoSignedUrl || profile?.logo_url || undefined} className="object-contain" />
                    <AvatarFallback className="rounded-lg bg-muted">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload Logo
                    </Button>
                    {(profile?.logo_url || profile?.logo_path) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Recommended: Square image, max 2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange}
                    placeholder="Enter your business name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_address">Business Address</Label>
                  <Textarea
                    id="business_address"
                    name="business_address"
                    value={formData.business_address}
                    onChange={handleInputChange}
                    placeholder="Enter your business address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_phone">Business Phone</Label>
                    <Input
                      id="business_phone"
                      name="business_phone"
                      value={formData.business_phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_email">Business Email</Label>
                    <Input
                      id="business_email"
                      name="business_email"
                      type="email"
                      value={formData.business_email}
                      onChange={handleInputChange}
                      placeholder="Enter business email"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Templates */}
          <EmailTemplatesSettings />

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose between light, dark, or system theme
                  </p>
                </div>
                <DarkModeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <DeleteAccountDialog userEmail={user?.email || ''} />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </div>
  );
};

export default AccountSettings;
