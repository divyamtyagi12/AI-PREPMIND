import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Logo } from '@/components/common/Logo';
import { AcademicFields, GoalFields, profileToForm } from '@/components/common/ProfileFields';
import { FormAlert } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { academicSchema, goalsSchema, validate } from '@/lib/validation';
import { parseApiError } from '@/services/api';
import { userService } from '@/services/userService';

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => profileToForm(user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const next = () => {
    const { errors: fieldErrors } = validate(academicSchema, values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length === 0) setStep(1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const academic = validate(academicSchema, values);
    const goals = validate(goalsSchema, values);
    if (!academic.data || !goals.data) {
      setErrors({ ...academic.errors, ...goals.errors });
      if (!academic.data) setStep(0);
      return;
    }
    setSubmitting(true);
    try {
      const updated = await userService.updateProfile({ ...academic.data, ...goals.data });
      setUser(updated);
      toast.success('Profile saved. Welcome to PrepMind AI!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center border-b bg-card px-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-2xl p-4 py-10 sm:p-6">
        <div className="mb-6 space-y-1">
          <p className="text-sm font-medium text-primary">Step {step + 1} of 2</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {step === 0 ? `Welcome, ${user.name.split(' ')[0]}! Tell us about your studies` : 'What are you preparing for?'}
          </h1>
          <p className="text-sm text-muted-foreground">
            This is saved to your account and you can change it any time from your profile.
          </p>
          <div className="flex gap-2 pt-2" aria-hidden="true">
            {[0, 1].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{step === 0 ? 'Academic information' : 'Placement goals'}</CardTitle>
            <CardDescription>
              {step === 0 ? 'Where are you studying?' : 'Help us tailor your preparation.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} noValidate className="space-y-5">
              <FormAlert message={formError} />
              {step === 0 ? (
                <AcademicFields values={values} errors={errors} onChange={onChange} />
              ) : (
                <GoalFields values={values} errors={errors} onChange={onChange} />
              )}
              <div className="flex justify-between gap-3 pt-2">
                {step === 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                {step === 0 ? (
                  <Button type="button" onClick={next}>
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" loading={submitting}>
                    Finish setup
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

