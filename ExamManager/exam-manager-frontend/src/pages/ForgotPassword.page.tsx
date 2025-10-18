import { useState, FormEvent } from "react";
import { useNavigate } from 'react-router-dom';
import { Stack, TextInput, PasswordInput, Button, Text, Alert, Paper, Container, Title } from "@mantine/core";
import axiosInstance from '../api/axios.config';

type ViewMode = 'enterUsername' | 'enterToken' | 'enterNewPassword' | 'success';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>("enterUsername");

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
        userName: username
      });

      if (response.status === 200) {
        setMessage(response.data.message || 'If the user exists and has an email address, we will send a token.');
        setViewMode('enterToken');
      }
    } catch (err: any) {
      console.log('Full error object:', err);
      console.log('Error response:', err.response);
      console.log('Error response status:', err.response?.status);
      console.log('Error response data:', err.response?.data);

      if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'No email belongs to this user. Please, contact your administrator.');
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
        newPassword
      });

      if (response.status === 200) {
        setMessage(response.data.message || 'The password is not changed');
        setViewMode('success');
        // Clear sensitive data
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
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          Forgot Password
        </Title>

        {viewMode === 'enterUsername' && (
          <form onSubmit={handleUsernameSubmit}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Enter your user name, if your account has an email address, we will send you a token to reset your password.
              </Text>

              <TextInput
                label="User name"
                placeholder="example_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                size="md"
              />

              {error && (
                <Alert color="red" title="Error">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="md"
              >
                {loading ? 'Sending...' : 'Requesting token'}
              </Button>

              <Button
                variant="subtle"
                onClick={handleGoToLogin}
                fullWidth
                size="sm"
              >
                Back to login
              </Button>
            </Stack>
          </form>
        )}

        {viewMode === 'enterToken' && (
          <form onSubmit={handleTokenSubmit}>
            <Stack gap="md">
              {message && (
                <Alert color="green" title="Token sent">
                  {message}
                </Alert>
              )}

              <Text size="sm" c="dimmed">
                Check your email address and enter the 6 digits long token.
              </Text>

              <TextInput
                label="Token"
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={6}
                disabled={loading}
                size="md"
              />

              {error && (
                <Alert color="red" title="Error">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="md"
              >
                Forward
              </Button>

              <Button
                variant="subtle"
                onClick={handleBackToUsername}
                fullWidth
                size="sm"
              >
                Back
              </Button>
            </Stack>
          </form>
        )}

        {viewMode === 'enterNewPassword' && (
          <form onSubmit={handlePasswordReset}>
            <Stack gap="md">
              {message && (
                <Alert color="blue" title="Valid token">
                  {message}
                </Alert>
              )}

              <PasswordInput
                label="New password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                size="md"
              />

              <PasswordInput
                label="Confirm new password"
                placeholder="At least 6 characters"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                disabled={loading}
                size="md"
              />

              {error && (
                <Alert color="red" title="Hiba">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="md"
              >
                {loading ? 'Saving...' : 'Change password'}
              </Button>
            </Stack>
          </form>
        )}

        {viewMode === 'success' && (
          <Stack gap="md" align="center">
            <Alert color="green" title="Sikeres jelszó módosítás!" w="100%">
              {message || 'Password changed successfully!'}
            </Alert>

            <Text size="sm" c="dimmed" ta="center">
              You can log in with your new password.
            </Text>

            <Button
              onClick={handleGoToLogin}
              size="md"
              fullWidth
            >
              Login
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
};

export default ForgotPassword;