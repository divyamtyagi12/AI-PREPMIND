import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/common/AuthShell';
import { FormField } from '@/components/common/FormField';
import { FormAlert } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, validate } from '@/lib/validation';
import { parseApiError } from '@/services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const { data, errors: fieldErrors } = validate(loginSchema, values);
    setErrors(fieldErrors);
    if (!data) return;

    setSubmitting(true);
    try {
      const user = await login(data);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = location.state?.from?.pathname;
      navigate(user.onboardingCompleted ? from || '/dashboard' : '/onboarding', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your preparation."
      footer={
        <>
          New to PrepMind AI?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <FormField label="Email" error={errors.email}>
          <Input type="email" autoComplete="email" value={values.email} onChange={set('email')} />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <Input type="password" autoComplete="current-password" value={values.password} onChange={set('password')} />
        </FormField>
        <Button type="submit" className="w-full" loading={submitting}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}

