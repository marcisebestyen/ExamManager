import { FormEvent, useState } from 'react';
import { IconArrowLeft, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import axiosInstance from '../api/axios.config';
import { Skeleton } from '../components/Skeleton';

type ViewMode = 'enterUsername' | 'enterToken' | 'enterNewPassword' | 'success';

const ForgotPasswordForm = () => {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('enterUsername');

  const [username, setUsername] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');

  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleUsernameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axiosInstance.post('/password_reset/initiate', {
        userName: username,
      });

      if (response.status === 200) {
        setMessage(response.data.message || 'If the user exists, we will send a token.');
        setViewMode('enterToken');
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError(
          err.response?.data?.message ||
            'No email belongs to this user. Please, contact your administrator.'
        );
      } else {
        setError(err.response?.data?.message || 'Error occurred during token generating.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (token.length !== 6) {
      setError('The token must be 6 digits.');
      return;
    }

    setMessage('Token accepted, enter your password, please.');
    setError('');
    setViewMode('enterNewPassword');
  };

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setError('The passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('The password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axiosInstance.post('/password_reset/reset', {
        token,
        newPassword,
      });

      if (response.status === 200) {
        setMessage(response.data.message || 'The password is not changed');
        setViewMode('success');
        setUsername('');
        setToken('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error during password change.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleBackToUsername = () => {
    setViewMode('enterUsername');
    setError('');
    setMessage('');
  };

  return (
    <Container size={420} my={40}>
      <Title
        ta="center"
        style={{
          fontFamily: 'Greycliff CF, var(--mantine-font-family)',
          fontWeight: 900,
        }}
      >
        Forgot Password?
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Follow the steps to reset your access
      </Text>

      <Paper
        withBorder
        shadow="md"
        p={30}
        mt={30}
        radius="md"
        style={{ backgroundColor: 'var(--mantine-color-body)' }}
      >
        {viewMode === 'enterUsername' && (
          <form onSubmit={handleUsernameSubmit}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Enter your username. If an account exists, we will send a 6-digit token to your
                email.
              </Text>

              <TextInput
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                radius="md"
              />

              {error && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="red"
                  title="Error"
                  variant="light"
                >
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="filled"
                color="var(--mantine-primary-color-filled)"
                radius="md"
                loading={loading}
                fullWidth
              >
                {loading ? 'Sending...' : 'Request Reset Token'}
              </Button>

              <Anchor
                component="button"
                type="button"
                c="dimmed"
                size="sm"
                onClick={handleGoToLogin}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <IconArrowLeft size={14} /> Back to login
              </Anchor>
            </Stack>
          </form>
        )}

        {viewMode === 'enterToken' && (
          <form onSubmit={handleTokenSubmit}>
            <Stack gap="md">
              {message && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="green"
                  title="Check your email"
                  variant="light"
                >
                  {message}
                </Alert>
              )}

              <Text size="sm" c="dimmed">
                We sent a code to your email. Please enter the 6-digit token below.
              </Text>

              <TextInput
                label="Security Token"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={6}
                disabled={loading}
                radius="md"
                style={{ letterSpacing: '2px' }} // Makes typing codes look cool
              />

              {error && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="red"
                  title="Invalid Token"
                  variant="light"
                >
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="filled"
                color="var(--mantine-primary-color-filled)"
                radius="md"
                loading={loading}
                fullWidth
              >
                Verify Token
              </Button>

              <Button
                variant="subtle"
                color="gray"
                onClick={handleBackToUsername}
                fullWidth
                size="sm"
              >
                Back to Username
              </Button>
            </Stack>
          </form>
        )}

        {viewMode === 'enterNewPassword' && (
          <form onSubmit={handlePasswordReset}>
            <Stack gap="md">
              <Alert
                icon={<IconCheck size={16} />}
                color="blue"
                title="Token Verified"
                variant="light"
              >
                Please create a new password.
              </Alert>

              <PasswordInput
                label="New Password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                radius="md"
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                disabled={loading}
                radius="md"
              />

              {error && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="red"
                  title="Error"
                  variant="light"
                >
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="filled"
                color="var(--mantine-primary-color-filled)"
                radius="md"
                loading={loading}
                fullWidth
              >
                {loading ? 'Saving...' : 'Set New Password'}
              </Button>
            </Stack>
          </form>
        )}

        {viewMode === 'success' && (
          <Stack gap="md" align="center" py="md">
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'var(--mantine-color-green-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck size={32} color="var(--mantine-color-green-6)" />
            </div>

            <Title order={3} ta="center">
              Password Changed!
            </Title>

            <Text size="sm" c="dimmed" ta="center">
              Your password has been updated successfully. You can now log in.
            </Text>

            <Button
              onClick={handleGoToLogin}
              variant="filled"
              color="green"
              radius="md"
              fullWidth
              mt="sm"
            >
              Go to Login
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
};

export default function ForgotPassword() {
  return (
    <Skeleton>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '80vh',
        }}
      >
        <ForgotPasswordForm />
      </div>
    </Skeleton>
  );
}
