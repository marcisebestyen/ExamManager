import { useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Container, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import axiosInstance from '../api/axios.config';
import { Skeleton } from '../components/Skeleton';

function ForceChangeForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (val) => (val.length < 6 ? t('auth.login.validation.passMin') : null),
      confirmPassword: (val, values) =>
        val !== values.newPassword ? t('auth.forgot.errors.mismatch') : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);

    try {
      await axiosInstance.post('/operators/change-my-password', {
        newPassword: values.newPassword,
      });

      navigate('/');
    } catch (error: any) {
      setError(error.response?.data?.message || t('forceChange.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        {t('forceChange.title')}
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {t('forceChange.subtitle')}
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Alert
              icon={<IconInfoCircle size={16} />}
              title={t('forceChange.alertTitle')}
              color="blue"
              variant="light"
            >
              {t('forceChange.alertMsg')}
            </Alert>

            <PasswordInput
              label={t('auth.forgot.step3.newPass')}
              placeholder={t('auth.forgot.step3.newPass')}
              required
              disabled={loading}
              {...form.getInputProps('newPassword')}
            />
            <PasswordInput
              label={t('auth.forgot.step3.confirmPass')}
              placeholder={t('auth.forgot.step3.confirmPass')}
              required
              disabled={loading}
              {...form.getInputProps('confirmPassword')}
            />

            {error && (
              <Text c="red" size="sm" ta="center" fw={500}>
                {error}
              </Text>
            )}

            <Button fullWidth mt="xl" type="submit" loading={loading}>
              {t('forceChange.submit')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export function ForcePasswordChangePage() {
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
        <ForceChangeForm />
      </div>
    </Skeleton>
  );
}
