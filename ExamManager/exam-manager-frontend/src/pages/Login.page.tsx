import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Skeleton } from '../components/Skeleton';
import useAuth from '../hooks/useAuth';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    initialValues: {
      userName: '',
      password: '',
    },
    validate: {
      userName: (val) => (!val ? 'User name is required' : null),
      password: (val) =>
        !val
          ? 'User password is required'
          : val.length < 6
            ? 'Password must be at least 6 characters'
            : null,
    },
  });

  const handleSubmit = async (data: { userName: string; password: string }) => {
    if (!form.isValid()) {return;}

    setIsLoading(true);
    setLoginError(null);

    try {
      await login(data.userName, data.password);
      navigate('/');
    } catch (error: any) {
      setLoginError(error.message || 'Login error. Please try again.');
      console.error('Login error: ', error);
    } finally {
      setIsLoading(false);
    }
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
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Please login to manage exams
      </Text>

      <Paper
        withBorder
        shadow="md"
        p={30}
        mt={30}
        radius="md"
        style={{
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              required
              label="Username"
              placeholder="Your username"
              radius="md"
              size="md"
              disabled={isLoading}
              error={form.errors.userName}
              {...form.getInputProps('userName')}
            />

            <PasswordInput
              required
              label="Password"
              placeholder="Your password"
              radius="md"
              size="md"
              disabled={isLoading}
              error={form.errors.password}
              {...form.getInputProps('password')}
            />
          </Stack>

          {loginError && (
            <Text c="red" size="sm" mt="sm" fw={500} ta="center">
              {loginError}
            </Text>
          )}

          <Group justify="space-between" mt="xl">
            <Anchor
              component="button"
              type="button"
              c="dimmed"
              size="xs"
              onClick={() => navigate('/forgot')}
              disabled={isLoading}
            >
              Forgot password?
            </Anchor>
            <Button
              type="submit"
              radius="md"
              loading={isLoading}
              variant="filled"
              color="var(--mantine-primary-color-filled)"
            >
              Login
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}

export function LoginPage() {
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
        <Login />
      </div>
    </Skeleton>
  );
}
