import { useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Container, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import axiosInstance from '../api/axios.config';
import { Skeleton } from '../components/Skeleton';


function ForceChangeForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (val) => (val.length < 6 ? 'Password must be at least 6 characters' : null),
      confirmPassword: (val, values) => (val !== values.newPassword ? 'Passwords do not match' : null),
    }
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
      setError(error.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        Setup Password
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        For security, you must set a new password before continuing.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Alert
              icon={<IconInfoCircle size={16} />}
              title="Action Required"
              color="blue"
              variant="light"
            >
              This is your first login. Please choose a secure password.
            </Alert>

            <PasswordInput
              label="New Password"
              placeholder="New password"
              required
              disabled={loading}
              {...form.getInputProps('newPassword')}
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm password"
              required
              disabled={loading}
              {...form.getInputProps('confirmPassword')}
            />

            {error && (
              <Text c='red' size='sm' ta='center' fw={500}>
                {error}
              </Text>
            )}

            <Button fullWidth mt='xl' type='submit' loading={loading}>
              Update Password & Continue.
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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <ForceChangeForm />
      </div>
    </Skeleton>
  );
}