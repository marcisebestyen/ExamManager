import { useTranslation } from 'react-i18next';
import { AppShell, Avatar, Burger, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import useAuth from '../hooks/useAuth';
import { NavbarMinimal } from './NavbarMinimal';

function getInitials(fullName: string | null | undefined) {
  if (!fullName) {return '';}
  const parts = fullName.trim().split(/\s+/);
  const firstInitial = parts[0][0]?.toUpperCase() || '';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() || '' : '';
  return `${firstInitial}${lastInitial}`;
}

export function Skeleton({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [opened, { toggle }] = useDisclosure();
  const { user, isAuthenticated } = useAuth();
  const userInitials = getInitials(`${user?.firstName} ${user?.lastName}`);

  const getTranslatedRole = () => {
    if (!user?.role && user?.role !== '0') {return t('roles.unknown');}

    const roleKey = String(user.role).replace('ROLES.', '').toUpperCase();

    return t(`roles.${roleKey}`, { defaultValue: t('roles.unknown') });
  };

  return (
    <AppShell
      layout="alt"
      header={{ height: 60 }}
      navbar={{ width: 80, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header
        style={{
          backgroundColor: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-gray-3)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text
              size="xl"
              fw={800}
              style={{
                letterSpacing: '-0.5px',
                background: `linear-gradient(45deg, var(--mantine-primary-color-filled), var(--mantine-color-cyan-5))`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('common.appTitle')}
            </Text>
          </Group>

          {isAuthenticated && user && (
            <Group gap="xs">
              <div style={{ textAlign: 'right', marginRight: 8 }}>
                <Text size="sm" fw={500} style={{ lineHeight: 1 }}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1, marginTop: 4 }}>
                  {getTranslatedRole()}
                </Text>
              </div>

              <Avatar
                color="initials"
                radius="xl"
                size="md"
                style={{ boxShadow: '0 0 0 1px var(--mantine-color-gray-3)', cursor: 'pointer' }}
              >
                {userInitials}
              </Avatar>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar style={{ borderRight: 'none' }}>
        <NavbarMinimal />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
