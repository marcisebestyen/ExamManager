import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Title,
  TextInput,
  Button,
  Group,
  Stack,
  Alert,
  Loader,
  Center,
  Divider,
  useMantineColorScheme,
  SegmentedControl,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconX, IconSun, IconMoon } from '@tabler/icons-react';
import axiosInstance from '../api/axios.config';
import { Skeleton } from '../components/Skeleton';

interface OperatorProfile {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface JsonPatchOperation {
  op: 'replace';
  path: string;
  value: any;
}

function Settings() {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
    },
    validate: {
      firstName: (value) => (!value.trim() ? 'First name is required' : null),
      lastName: (value) => (!value.trim() ? 'Last name is required' : null),
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get<OperatorProfile>('operators/get-profile');
      setProfile(response.data);
      form.setValues({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (!profile) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const patchOperation: JsonPatchOperation[] = [];

      if (values.firstName !== profile.firstName) {
        patchOperation.push({
          op: 'replace',
          path: '/firstname',
          value: values.firstName,
        });
      }

      if (values.lastName !== profile.lastName) {
        patchOperation.push({
          op: 'replace',
          path: '/lastname',
          value: values.lastName,
        });
      }

      if (patchOperation.length === 0) {
        setSuccess('No changes detected');
        return;
      }
      await axiosInstance.patch(
        `/operators/update-profile/${profile.id}`,
        patchOperation,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      setSuccess('Profile updated successfully');
      await fetchProfile();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!profile) {
    return (
      <Container size='sm' mt='xl'>
        <Alert icon={<IconX size='16' />} title='Error' color='red'>
          Failed to load profile data
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="sm" mt="xl">
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Title order={2} mb="lg">
          Settings
        </Title>

        {error && (
          <Alert icon={<IconX size={16} />} title="Error" color="red" mb="md" onClose={() => setError(null)} withCloseButton>
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} title="Success" color="green" mb="md" onClose={() => setSuccess(null)} withCloseButton>
            {success}
          </Alert>
        )}

        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} c="dimmed" mb={4}>
              Username
            </Text>
            <Text size="md">{profile.userName}</Text>
          </div>

          <div>
            <Text size="sm" fw={500} c="dimmed" mb={4}>
              Role
            </Text>
            <Text size="md">{profile.role}</Text>
          </div>

          <Divider my="sm" />

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="First Name"
                placeholder="Enter your first name"
                required
                {...form.getInputProps('firstName')}
              />

              <TextInput
                label="Last Name"
                placeholder="Enter your last name"
                required
                {...form.getInputProps('lastName')}
              />

              <Group justify="flex-end" mt="md">
                <Button
                  type="button"
                  variant="subtle"
                  color="orange"
                  onClick={() => {
                    form.setValues({
                      firstName: profile.firstName,
                      lastName: profile.lastName,
                    });
                    setError(null);
                    setSuccess(null);
                  }}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button type="submit" loading={saving} variant="outline">
                  Save Changes
                </Button>
              </Group>
            </Stack>
          </form>

          <Divider my="sm" />

          <div>
            <Text size="sm" fw={500} mb="xs">
              Theme
            </Text>
            <SegmentedControl
              value={colorScheme}
              onChange={(value: any) => setColorScheme(value)}
              data={[
                {
                  value: 'light',
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconSun size={16} />
                      <span>Light</span>
                    </Center>
                  ),
                },
                {
                  value: 'dark',
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconMoon size={16} />
                      <span>Dark</span>
                    </Center>
                  ),
                },
                {
                  value: 'auto',
                  label: <Center>Auto</Center>,
                },
              ]}
              fullWidth
            />
          </div>
        </Stack>
      </Paper>
    </Container>
  );
}

export function SettingsPage() {
  return (
    <Skeleton>
      <Settings />
    </Skeleton>
  )
}