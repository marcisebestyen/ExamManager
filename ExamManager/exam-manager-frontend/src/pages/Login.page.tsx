import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import useAuth from '../hooks/useAuth';
import classes from './Login.page.module.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useMantineTheme();

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
    <Box className={classes.pageContainer}>
      <Center>
        <Paper
          shadow="xl"
          p="xl"
          radius="lg"
          withBorder
          style={{ width: '100%', height: '450px', backgroundColor: '#fff' }}
        >
          <Stack>
            <Title order={2} ta="center" mb="md" mt="xs" className={classes.title}>
              <Text inherit variant="gradient" component="span" gradient={{from: 'blue', to: 'yellow'}}>
                Exam Manager
              </Text>
            </Title>
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
                  classNames={{ input: classes.input }}
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
                  classNames={{ input: classes.input }}
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
                  Login
                </Button>
              </Group>
              <Divider my="lg" />
            </form>
          </Stack>
        </Paper>
      </Center>
    </Box>
  );
};

export default Login;
