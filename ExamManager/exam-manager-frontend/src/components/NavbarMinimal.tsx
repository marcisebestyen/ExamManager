import {
  IconBriefcase2,
  IconBuildings,
  IconClipboardSearch,
  IconDashboard,
  IconDatabase,
  IconDatabaseExport,
  IconFileTime,
  IconHome,
  IconLogin,
  IconLogout,
  IconPencilQuestion,
  IconSettings,
  IconUserCog,
  IconUserQuestion,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import api from '../api/api';
import useAuth from '../hooks/useAuth';
import classes from './NavbarMinimal.module.css';


interface NavbarLinkProps {
  icon: typeof IconHome;
  label: string;
  path: string;
  active?: boolean;
  onClick?: () => void;
}

function NavbarLink({ icon: Icon, label, path, active, onClick }: NavbarLinkProps) {
  const navigate = useNavigate();

  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={() => {
          if (onClick) {
            onClick();
          }
          navigate(path);
        }}
        className={classes.link}
        data-active={active || undefined}
      >
        <Icon size={20} stroke={1.5} />
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
  const { logout, isAuthenticated, user } = useAuth(); // Add 'user' here
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout(() => {
      navigate('/');
    });
  };

  const handleManualBackup = () => {
    modals.openConfirmModal({
      title: 'Manual System Backup',
      centered: true,
      radius: "md",
      children: (
        <Text size="sm">
          Are you sure you want to trigger a manual backup immediately? This will dump the database
          and upload it to Google Drive.
        </Text>
      ),
      labels: { confirm: 'Start Backup', cancel: 'Cancel' },
      confirmProps: { color: 'blue', variant: 'outline', radius: 'md' },
      cancelProps: { radius: 'md', variant: 'subtle' },
      onConfirm: async () => {
        const id = notifications.show({
          loading: true,
          title: 'Backup in progress',
          message: 'Please wait while the system is backing up...',
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
    if (!isAuthenticated) {
      return link.path === '/';
    }

    if (user?.role === 'Staff') {
      const staffPaths = ['/', '/settings', '/operators', '/file-history'];
      return staffPaths.includes(link.path);
    }

    if (user?.role === 'Admin') {
      const adminPaths = ['/', '/settings', '/operators', '/backups'];
      return adminPaths.includes(link.path);
    }

    if (user?.role === 'Operator') {
      const operatorPaths = [
        '/',
        '/settings',
        '/dashboard',
        '/exams',
        '/examiners',
        '/exam-types',
        '/institutions',
        '/professions',
      ];
      return operatorPaths.includes(link.path);
    }

    return link.path === '/';
  });

  const links = filteredData.map((link) => (
    <NavbarLink {...link} key={link.label} active={location.pathname === link.path} />
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Stack justify="center" gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify="center" gap={0}>
        {!isAuthenticated && <NavbarLink icon={IconLogin} label="Login" path="/login" />}

        {isAuthenticated && (
          <>
            <NavbarLink icon={IconDatabaseExport} label="Trigger Manual Backup" path="#" onClick={handleManualBackup} />
            <NavbarLink icon={IconLogout} label="Logout" path="/" onClick={handleLogout} />
          </>
        )}
      </Stack>
    </nav>
  );
}
