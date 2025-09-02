import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import useAuth from '../hooks/useAuth';

const Login = () => {
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
      userName: (val, string) => (!val ? 'User name is required' : null),
      password: (val, string) =>
        !val
          ? 'User password is required'
          : val.length < 6
            ? 'Password must be at least 6 characters'
            : null,
    },
  });

  const handleSubmit = async (data: { userName: string; password: string }) => {
    if (!form.isValid()) {
      return;
    }

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
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#2d3748',
      }}
    >
      <Center>
        <Card
          shadow="xl"
          padding="xl"
          radius="lg"
          style={{ width: '100%', height: '450px', backgroundColor: '#fff' }}
        >
          <div>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                marginBottom: '2rem',
                color: '#2d3748',
                textAlign: 'center',
              }}
            >
              Exam Manager
            </h2>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  required
                  label="User name"
                  placeholder="username"
                  radius="md"
                  size="md"
                  disabled={isLoading}
                  error={form.errors.userName}
                  {...form.getInputProps('userName')}
                />

                <PasswordInput
                  required
                  label="Password"
                  placeholder="your password"
                  radius="md"
                  size="md"
                  disabled={isLoading}
                  error={form.errors.password}
                  {...form.getInputProps('password')}
                />
              </Stack>

              {loginError && (
                <Text size="sm" mt="md" fw={500} c="red">
                  {loginError}
                </Text>
              )}

              <Group justify="space-between" mt="xl">
                <Anchor
                  component="button"
                  type="button"
                  c="dimmed"
                  onClick={() => navigate('/forgot')}
                  disabled={isLoading}
                >
                  Forgot password?
                </Anchor>
                <Button
                  type="submit"
                  radius="md"
                  size="md"
                  loading={isLoading}
                  disabled={!form.isValid()}
                >
                  {isLoading ? 'Login...' : 'Login'}
                </Button>
              </Group>
              <Divider my="lg" />
            </form>
          </div>
        </Card>
      </Center>
    </Box>
  );
};

export default Login;