import { AppShell, Avatar, Burger, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import useAuth from '../hooks/useAuth';
import { NavbarMinimal } from './NavbarMinimal';

function getInitials(fullName: string | null | undefined) {
  if (!fullName) {
    return '';
  }
  const parts = fullName.trim().split(/\s+/);
  const firstInitial = parts[0][0]?.toUpperCase() || '';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() || '' : '';
  return `${firstInitial}${lastInitial}`;
}

export function Skeleton({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const { user, isAuthenticated } = useAuth();

  const userInitials = getInitials(`${user?.firstName} ${user?.lastName}`);

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 80, breakpoint: '' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          {' '}
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700}>Exam Manager</Text>
          </Group>
          {isAuthenticated && user && (
            <Avatar
              color="initials"
              size="md"
              radius="xl"
            >
              {userInitials}
            </Avatar>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <NavbarMinimal />
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
