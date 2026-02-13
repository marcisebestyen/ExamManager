import { useEffect, useState } from 'react';
import {
  IconLanguage,
  IconMoon,
  IconPalette,
  IconSun,
  IconUserCircle,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
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

const ROLE_COLORS: Record<number, string> = {
  [Role.OPERATOR]: 'cyan',
  [Role.ADMIN]: 'red',
  [Role.STAFF]: 'indigo',
};

const UserInfoCard = ({ profile }: { profile: IOperator }) => {
  const { t } = useTranslation();
  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();

  const roleValue = profile.role as unknown as number;
  const translatedRole = t(`roles.${roleValue}`, { defaultValue: t('roles.unknown') });

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
        <Badge size="lg" variant="light" color={ROLE_COLORS[roleValue] || 'gray'} mt="md">
          {translatedRole}
        </Badge>
      </Stack>
    </Card>
  );
};

function Settings() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<IOperator | null>(null);
  const [loading, setLoading] = useState(true);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.Operators.getMyProfile();
        setProfile(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading)
    {return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );}
  if (!profile)
    {return (
      <Alert color="red" mt="xl">
        {t('common.error')}
      </Alert>
    );}

  return (
    <Container size="lg" my="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>{t('settings.title')}</Title>
          <Text c="dimmed" size="sm">
            {t('settings.description')}
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
                  <Tabs.Tab value="general" leftSection={<IconUserCircle size={16} />}>
                    {t('settings.tabs.general')}
                  </Tabs.Tab>
                  <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
                    {t('settings.tabs.appearance')}
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="general" p="xl">
                  <Group grow>
                    <TextInput
                      label={t('settings.fields.firstName')}
                      value={profile.firstName}
                      readOnly
                      variant="filled"
                    />
                    <TextInput
                      label={t('settings.fields.lastName')}
                      value={profile.lastName}
                      readOnly
                      variant="filled"
                    />
                  </Group>
                </Tabs.Panel>

                <Tabs.Panel value="appearance" p="xl">
                  <Stack gap="xl">
                    <section>
                      <Group gap="xs" mb="sm">
                        <IconLanguage size={20} />
                        <Title order={4}>{t('settings.language.title')}</Title>
                      </Group>
                      <SegmentedControl
                        fullWidth
                        value={(i18n.language || 'en').split('-')[0]}
                        onChange={(val) => i18n.changeLanguage(val)}
                        data={[
                          { label: 'English', value: 'en' },
                          { label: 'Magyar', value: 'hu' },
                          { label: 'Deutsch', value: 'de' },
                        ]}
                      />
                    </section>

                    <section>
                      <Title order={4} mb="xs">
                        {t('settings.appearance.title')}
                      </Title>
                      <SegmentedControl
                        fullWidth
                        value={colorScheme}
                        onChange={(value: any) => setColorScheme(value)}
                        data={[
                          {
                            value: 'light',
                            label: (
                              <Center style={{ gap: 10 }}>
                                <IconSun size={16} /> {t('settings.appearance.light')}
                              </Center>
                            ),
                          },
                          {
                            value: 'dark',
                            label: (
                              <Center style={{ gap: 10 }}>
                                <IconMoon size={16} /> {t('settings.appearance.dark')}
                              </Center>
                            ),
                          },
                          { value: 'auto', label: t('settings.appearance.auto') },
                        ]}
                      />
                    </section>
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
