import { useState } from 'react';
import { IconBriefcase2, IconBuildings, IconClipboardSearch, IconDashboard, IconDatabase, IconDatabaseExport, IconFileTime, IconHome, IconLogin, IconLogout, IconPencilQuestion, IconSettings, IconUserCog, IconUserQuestion } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { rem, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import api from '../api/api';
import useAuth from '../hooks/useAuth';


const getLinkStyles = (isActive: boolean, isHovered: boolean) => ({
  width: rem(50),
  height: rem(50),
  borderRadius: 'var(--mantine-radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: isActive
    ? 'var(--mantine-primary-color-light)'
    : isHovered
      ? 'var(--mantine-color-gray-0)'
      : 'transparent',
  color: isActive ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-gray-7)',
  transition: 'all 200ms ease',
  cursor: 'pointer',
});

interface NavbarLinkProps {
  icon: typeof IconHome;
  label: string;
  path: string;
  active?: boolean;
  onClick?: () => void;
}

function NavbarLink({ icon: Icon, label, path, active, onClick }: NavbarLinkProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={() => {
          if (onClick) {onClick();}
          navigate(path);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={getLinkStyles(active || false, hovered)}
      >
        <Icon style={{ width: rem(22), height: rem(22) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

const mockData = [
  { icon: IconHome, label: 'Home', path: '/' },
  { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: IconDatabase, label: 'Backups', path: '/backups' },
  { icon: IconPencilQuestion, label: 'Exams', path: '/exams' },
  { icon: IconUserQuestion, label: 'Examiners', path: '/examiners' },
  { icon: IconClipboardSearch, label: 'Exam Types', path: '/exam-types' },
  { icon: IconFileTime, label: 'File History', path: '/file-history' },
  { icon: IconBuildings, label: 'Institutions', path: '/institutions' },
  { icon: IconBriefcase2, label: 'Professions', path: '/professions' },
  { icon: IconUserCog, label: 'Operators', path: '/operators' },
  { icon: IconSettings, label: 'Settings', path: '/settings' },
];

export function NavbarMinimal() {
  const { logout, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout(() => navigate('/'));
  };

  const handleManualBackup = () => {
    modals.openConfirmModal({
      title: 'Manual System Backup',
      centered: true,
      radius: 'md',
      children: (
        <Text size="sm">
          Are you sure you want to trigger a manual backup immediately? This will dump the database
          and upload it to Google Drive.
        </Text>
      ),
      labels: { confirm: 'Start Backup', cancel: 'Cancel' },
      confirmProps: { color: 'blue', variant: 'filled', radius: 'md' },
      cancelProps: { radius: 'md', variant: 'subtle' },
      onConfirm: async () => {
        const id = notifications.show({
          loading: true,
          title: 'Backup in progress',
          message: 'Please wait...',
          autoClose: false,
          withCloseButton: false,
        });

        try {
          await api.Backups.performManualBackup();
          notifications.update({
            id,
            color: 'teal',
            title: 'Success',
            message: 'Manual backup completed successfully!',
            icon: <IconDatabaseExport size={16} />,
            loading: false,
            autoClose: 3000,
          });
        } catch (error: any) {
          notifications.update({
            id,
            color: 'red',
            title: 'Backup Failed',
            message: error.response?.data?.message || 'An unexpected error occurred.',
            loading: false,
            autoClose: 5000,
          });
        }
      },
    });
  };

  const filteredData = mockData.filter((link) => {
    if (!isAuthenticated) {return link.path === '/';}
    if (user?.role === 'Staff')
      {return ['/', '/settings', '/operators', '/file-history'].includes(link.path);}
    if (user?.role === 'Admin')
      {return ['/', '/settings', '/operators', '/backups'].includes(link.path);}
    if (user?.role === 'Operator')
      {return [
        '/',
        '/settings',
        '/dashboard',
        '/exams',
        '/examiners',
        '/exam-types',
        '/institutions',
        '/professions',
      ].includes(link.path);}
    return link.path === '/';
  });

  const links = filteredData.map((link) => (
    <NavbarLink {...link} key={link.label} active={location.pathname === link.path} />
  ));

  return (
    <nav
      style={{
        width: rem(80),
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--mantine-color-body)',
        borderRight: '1px solid var(--mantine-color-gray-2)',
        padding: 'var(--mantine-spacing-md)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-sm)',
        }}
      >
        <Stack gap="xs" align="center">
          {links}
        </Stack>
      </div>

      <Stack gap="xs" align="center" mt="md">
        {!isAuthenticated && <NavbarLink icon={IconLogin} label="Login" path="/login" />}

        {isAuthenticated && (
          <>
            <div
              style={{
                width: '50%',
                height: 1,
                backgroundColor: 'var(--mantine-color-gray-2)',
                margin: 'var(--mantine-spacing-sm) 0',
              }}
            />
            <NavbarLink
              icon={IconDatabaseExport}
              label="Trigger Manual Backup"
              path="#"
              onClick={handleManualBackup}
            />
            <NavbarLink icon={IconLogout} label="Logout" path="/" onClick={handleLogout} />
          </>
        )}
      </Stack>
    </nav>
  );
}
