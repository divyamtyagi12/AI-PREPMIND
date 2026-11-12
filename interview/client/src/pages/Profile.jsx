import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/common/FormField';
import { AcademicFields, GoalFields, profileToForm } from '@/components/common/ProfileFields';
import { ErrorState, FormAlert } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { passwordChangeSchema, profileSchema, validate } from '@/lib/validation';
import { parseApiError } from '@/services/api';
import { userService } from '@/services/userService';

function ProfileForm({ user, onSaved }) {
  const [values, setValues] = useState(() => profileToForm(user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const onChange = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const { data, errors: fieldErrors } = validate(profileSchema, values);
    setErrors(fieldErrors);
    if (!data) return;
    setSaving(true);
    try {
      const updated = await userService.updateProfile(data);
      onSaved(updated);
      setValues(profileToForm(updated));
      toast.success('Profile updated');
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.fields);
      setFormError(parsed.message);
      toast.error(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6" aria-label="Profile details">
      <FormAlert message={formError} />
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" error={errors.name} required>
            <Input value={values.name} onChange={(e) => onChange('name', e.target.value)} autoComplete="name" />
          </FormField>
          <FormField label="Email" hint="Email cannot be changed.">
            <Input value={user.email} readOnly disabled />
          </FormField>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Academic information</CardTitle>
        </CardHeader>
        <CardContent>
          <AcademicFields values={values} errors={errors} onChange={onChange} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Placement goals</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalFields values={values} errors={errors} onChange={onChange} />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordForm() {
  const [values, setValues] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const { data, errors: fieldErrors } = validate(passwordChangeSchema, values);
    setErrors(fieldErrors);
    if (!data) return;
    setSaving(true);
    try {
      await userService.changePassword(data);
      setValues(EMPTY_PASSWORDS);
      toast.success('Password updated. Other devices have been signed out.');
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.fields);
      setFormError(Object.keys(parsed.fields).length ? '' : parsed.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>You will stay signed in on this device; other devices are signed out.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="max-w-md space-y-4" aria-label="Change password">
          <FormAlert message={formError} />
          <FormField label="Current password" error={errors.currentPassword}>
            <Input type="password" autoComplete="current-password" value={values.currentPassword} onChange={set('currentPassword')} />
          </FormField>
          <FormField label="New password" error={errors.newPassword} hint="At least 8 characters, with a letter and a number.">
            <Input type="password" autoComplete="new-password" value={values.newPassword} onChange={set('newPassword')} />
          </FormField>
          <FormField label="Confirm new password" error={errors.confirmPassword}>
            <Input type="password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} />
          </FormField>
          <Button type="submit" loading={saving}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const fresh = await userService.getProfile();
      setProfile(fresh);
      setUser(fresh);
    } catch (err) {
      setLoadError(parseApiError(err).message);
    }
  }, [setUser]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your details and placement preferences.</p>
      </div>
      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : !profile ? (
        <div className="space-y-4" role="status" aria-label="Loading profile">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <>
          <ProfileForm user={profile} onSaved={(u) => { setProfile(u); setUser(u); }} />
          <PasswordForm />
        </>
      )}
    </div>
  );
}

