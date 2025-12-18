import { IconBriefcase2, IconBuildings, IconClipboardSearch, IconDashboard, IconHome, IconLogin, IconLogout, IconPencilQuestion, IconSettings, IconUserCog, IconUserQuestion } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Stack, Tooltip, UnstyledButton } from '@mantine/core';
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
  { icon: IconPencilQuestion, label: 'Exams', path: '/exams' },
  { icon: IconUserQuestion, label: 'Examiners', path: '/examiners' },
  { icon: IconClipboardSearch, label: 'Exam Types', path: '/exam-types' },
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

  const filteredData = mockData.filter((link) => {
    if (!isAuthenticated) {
      return link.path === '/';
    }

    if (user?.role === 'Admin' || user?.role === 'Staff') {
      const adminPaths = [
        '/',
        '/settings',
        '/operators'
      ];
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
    <NavbarLink
      {...link}
      key={link.label}
      active={location.pathname === link.path}
    />
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
          <NavbarLink icon={IconLogout} label="Logout" path="/" onClick={handleLogout} />
        )}
      </Stack>
    </nav>
  );
}
