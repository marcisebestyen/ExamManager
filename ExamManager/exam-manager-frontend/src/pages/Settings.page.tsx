import { useEffect, useState } from 'react';
import {
  IconMoon,
  IconPalette,
  IconSun,
  IconUser,
  IconUserCircle,
  IconX,
} from '@tabler/icons-react';
import {
  Alert,
  Avatar,
  Badge,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  rem,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { IOperator } from '../interfaces/IOperator';

enum Role {
  OPERATOR = 0,
  ADMIN = 1,
  STAFF = 2,
}

const ROLE_LABELS = {
  [Role.OPERATOR]: 'Operator',
  [Role.ADMIN]: 'Admin',
  [Role.STAFF]: 'Staff',
};

const ROLE_COLORS = {
  [Role.OPERATOR]: 'cyan',
  [Role.ADMIN]: 'red',
  [Role.STAFF]: 'indigo',
};


const UserInfoCard = ({ profile }: { profile: IOperator }) => {
  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();

  return (
    <Card withBorder shadow="sm" radius="md" padding="xl">
      <Stack align="center" gap="xs">
        <Avatar size={80} radius={80} color="var(--mantine-primary-color-filled)" variant="filled">
          <Text size="xl" fw={700}>
            {initials}
          </Text>
        </Avatar>

        <Text fz="lg" fw={700} mt="sm">
          {profile.firstName} {profile.lastName}
        </Text>

        <Text c="dimmed" size="sm" mt={-5}>
          @{profile.userName}
        </Text>

        <Badge
          size="lg"
          variant="light"
          color={ROLE_COLORS[profile.role as unknown as Role] || 'gray'}
          mt="md"
        >
          {ROLE_LABELS[profile.role as unknown as Role] || 'Unknown'}
        </Badge>
      </Stack>
    </Card>
  );
};

function Settings() {
  const [profile, setProfile] = useState<IOperator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.Operators.getMyProfile();
      setProfile(response.data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
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
      <Container size="sm" mt="xl">
        <Alert icon={<IconX size="16" />} title="Error" color="red">
          Failed to load profile data. Please try refreshing.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" my="xl">
      <Stack gap="lg">
        <div>
          <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
            Account Settings
          </Title>
          <Text c="dimmed" size="sm">
            View your personal information and manage application preferences
          </Text>
        </div>

        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <UserInfoCard profile={profile} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper shadow="sm" radius="md" withBorder>
              <Tabs defaultValue="general" variant="outline">
                <Tabs.List>
                  <Tabs.Tab
                    value="general"
                    leftSection={<IconUserCircle style={{ width: rem(16), height: rem(16) }} />}
                  >
                    General
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="appearance"
                    leftSection={<IconPalette style={{ width: rem(16), height: rem(16) }} />}
                  >
                    Appearance
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="general" p="xl">
                  <Stack gap="md">
                    <Stack gap="md">
                      <Group grow>
                        <TextInput
                          label="First Name"
                          value={profile.firstName}
                          readOnly
                          variant="filled"
                          leftSection={<IconUser size={16} />}
                        />
                        <TextInput
                          label="Last Name"
                          value={profile.lastName}
                          readOnly
                          variant="filled"
                          leftSection={<IconUser size={16} />}
                        />
                      </Group>
                    </Stack>
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="appearance" p="xl">
                  <Stack gap="md">
                    <Title order={4}>Interface Theme</Title>
                    <Text c="dimmed" size="sm">
                      Choose how the application looks to you.
                    </Text>

                    <Card withBorder radius="md" p="md" bg="var(--mantine-color-body)">
                      <Stack gap="xs">
                        <Text size="sm" fw={500}>
                          Color Scheme
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
                          radius="md"
                        />
                      </Stack>
                    </Card>
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

export function SettingsPage() {
  return (
    <Skeleton>
      <Settings />
    </Skeleton>
  );
}
