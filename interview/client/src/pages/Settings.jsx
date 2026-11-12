import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    try {
      await logout();
      toast.success('You have been signed out');
    } catch {
      toast.warning('Signed out locally. We could not reach the server to end the session.');
    }
    navigate('/login', { replace: true });
  };

  const rows = [
    ['Email', user.email],
    ['Account type', <Badge key="r" variant="secondary" className="capitalize">{user.role}</Badge>],
    ['Member since', formatDate(user.createdAt)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Account and session settings.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>To change your name or password, visit your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Signing out ends this session on the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut}>
            <LogOut /> Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

