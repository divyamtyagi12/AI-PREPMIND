import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/common/AuthShell';
import { FormField } from '@/components/common/FormField';
import { FormAlert } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { registerSchema, validate } from '@/lib/validation';
import { parseApiError } from '@/services/api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const { data, errors: fieldErrors } = validate(registerSchema, values);
    setErrors(fieldErrors);
    if (!data) return;

    setSubmitting(true);
    try {
      await register(data);
      toast.success('Account created! Let’s set up your profile.');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.fields);
      setFormError(Object.keys(parsed.fields).length ? '' : parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building your placement preparation profile."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <FormField label="Full name" error={errors.name}>
          <Input autoComplete="name" value={values.name} onChange={set('name')} />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <Input type="email" autoComplete="email" value={values.email} onChange={set('email')} />
        </FormField>
        <FormField label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <Input type="password" autoComplete="new-password" value={values.password} onChange={set('password')} />
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword}>
          <Input type="password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} />
        </FormField>
        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}

