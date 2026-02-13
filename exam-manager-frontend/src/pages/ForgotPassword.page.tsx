import { FormEvent, useState } from 'react';
import { IconArrowLeft, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        setMessage(response.data.message || t('auth.forgot.step2.title'));
        setViewMode('enterToken');
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError(err.response?.data?.message || t('auth.forgot.errors.noEmail'));
      } else {
        setError(err.response?.data?.message || t('auth.forgot.errors.tokenGen'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (token.length !== 6) {
      setError(t('auth.forgot.errors.tokenLength'));
      return;
    }

    setMessage(t('auth.forgot.step3.instruction'));
    setError('');
    setViewMode('enterNewPassword');
  };

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setError(t('auth.forgot.errors.mismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.forgot.errors.passLength'));
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
        setViewMode('success');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.forgot.errors.general'));
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
        {t('auth.forgot.title')}
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {t('auth.forgot.subtitle')}
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
                {t('auth.forgot.step1.desc')}
              </Text>

              <TextInput
                label={t('auth.login.username')}
                placeholder={t('auth.login.usernamePlaceholder')}
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
                  title={t('common.error')}
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
                {loading ? t('auth.forgot.step1.sending') : t('auth.forgot.step1.button')}
              </Button>

              <Anchor
                component="button"
                type="button"
                c="dimmed"
                size="sm"
                onClick={handleGoToLogin}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <IconArrowLeft size={14} /> {t('auth.forgot.step1.back')}
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
                  title={t('auth.forgot.step2.title')}
                  variant="light"
                >
                  {message}
                </Alert>
              )}

              <Text size="sm" c="dimmed">
                {t('auth.forgot.step2.desc')}
              </Text>

              <TextInput
                label={t('auth.forgot.step2.tokenLabel')}
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={6}
                disabled={loading}
                radius="md"
                style={{ letterSpacing: '2px' }}
              />

              {error && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="red"
                  title={t('common.error')}
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
                {t('auth.forgot.step2.verify')}
              </Button>

              <Button
                variant="subtle"
                color="gray"
                onClick={handleBackToUsername}
                fullWidth
                size="sm"
              >
                {t('auth.forgot.step2.backUser')}
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
                title={t('auth.forgot.step3.verified')}
                variant="light"
              >
                {t('auth.forgot.step3.instruction')}
              </Alert>

              <PasswordInput
                label={t('auth.forgot.step3.newPass')}
                placeholder={t('auth.login.passwordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                radius="md"
              />

              <PasswordInput
                label={t('auth.forgot.step3.confirmPass')}
                placeholder={t('auth.login.passwordPlaceholder')}
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
                  title={t('common.error')}
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
                {loading ? t('auth.forgot.step3.saving') : t('auth.forgot.step3.submit')}
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
              {t('auth.forgot.success.title')}
            </Title>

            <Text size="sm" c="dimmed" ta="center">
              {t('auth.forgot.success.desc')}
            </Text>

            <Button
              onClick={handleGoToLogin}
              variant="filled"
              color="green"
              radius="md"
              fullWidth
              mt="sm"
            >
              {t('auth.forgot.success.button')}
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
