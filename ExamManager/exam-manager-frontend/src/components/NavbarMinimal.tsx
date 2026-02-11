import { useState } from 'react';
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
import { useTranslation } from 'react-i18next';

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
          if (path !== '#') {navigate(path);}
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

export function NavbarMinimal() {
  const { t } = useTranslation();
  const { logout, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navData = [
    { icon: IconHome, label: t('navbar.home'), path: '/' },
    { icon: IconDashboard, label: t('navbar.dashboard'), path: '/dashboard' },
    { icon: IconDatabase, label: t('navbar.backups'), path: '/backups' },
    { icon: IconPencilQuestion, label: t('navbar.exams'), path: '/exams' },
    { icon: IconUserQuestion, label: t('navbar.examiners'), path: '/examiners' },
    { icon: IconClipboardSearch, label: t('navbar.examTypes'), path: '/exam-types' },
    { icon: IconFileTime, label: t('navbar.fileHistory'), path: '/file-history' },
    { icon: IconBuildings, label: t('navbar.institutions'), path: '/institutions' },
    { icon: IconBriefcase2, label: t('navbar.professions'), path: '/professions' },
    { icon: IconUserCog, label: t('navbar.operators'), path: '/operators' },
    { icon: IconSettings, label: t('navbar.settings'), path: '/settings' },
  ];

  const handleLogout = () => {
    logout(() => navigate('/'));
  };

  const handleManualBackup = () => {
    modals.openConfirmModal({
      title: t('backup.title'),
      centered: true,
      radius: 'md',
      children: <Text size="sm">{t('backup.message')}</Text>,
      labels: { confirm: t('backup.confirm'), cancel: t('backup.cancel') },
      confirmProps: { color: 'blue', variant: 'filled', radius: 'md' },
      cancelProps: { radius: 'md', variant: 'subtle' },
      onConfirm: async () => {
        const id = notifications.show({
          loading: true,
          title: t('backup.progress'),
          message: t('backup.wait'),
          autoClose: false,
          withCloseButton: false,
        });

        try {
          await api.Backups.performManualBackup();
          notifications.update({
            id,
            color: 'teal',
            title: t('common.success'),
            message: t('backup.done'),
            icon: <IconDatabaseExport size={16} />,
            loading: false,
            autoClose: 3000,
          });
        } catch (error: any) {
          notifications.update({
            id,
            color: 'red',
            title: t('backup.failed'),
            message: error.response?.data?.message || t('common.error'),
            loading: false,
            autoClose: 5000,
          });
        }
      },
    });
  };

  const filteredData = navData.filter((link) => {
    if (!isAuthenticated) {return link.path === '/';}

    const userRole = String(user?.role).replace('ROLES.', '').toUpperCase();

    if (userRole === 'STAFF' || userRole === '2')
      {return ['/', '/settings', '/operators', '/file-history'].includes(link.path);}
    if (userRole === 'ADMIN' || userRole === '1')
      {return ['/', '/settings', '/operators', '/backups'].includes(link.path);}
    if (userRole === 'OPERATOR' || userRole === '0')
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
          {filteredData.map((link) => (
            <NavbarLink {...link} key={link.path} active={location.pathname === link.path} />
          ))}
        </Stack>
      </div>

      <Stack gap="xs" align="center" mt="md">
        {!isAuthenticated && (
          <NavbarLink icon={IconLogin} label={t('navbar.login')} path="/login" />
        )}

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
              label={t('navbar.triggerBackup')}
              path="#"
              onClick={handleManualBackup}
            />
            <NavbarLink
              icon={IconLogout}
              label={t('navbar.logout')}
              path="/"
              onClick={handleLogout}
            />
          </>
        )}
      </Stack>
    </nav>
  );
}
