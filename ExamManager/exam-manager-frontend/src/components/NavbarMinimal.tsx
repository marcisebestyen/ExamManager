import { useState } from 'react';
import path from 'node:path';
import {
  IconBriefcase2,
  IconBuildings,
  IconClipboardSearch,
  IconDashboard,
  IconHome,
  IconLogout,
  IconPencilQuestion,
  IconSettings,
  IconUserCog,
  IconUserQuestion,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Center, Stack, Tooltip, UnstyledButton } from '@mantine/core';
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

const mockdata = [
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
  const [active, setActive] = useState(2);

  const links = mockdata.map((link, index) => (
    <NavbarLink
      {...link}
      key={link.label}
      // active={index === active}
      onClick={() => setActive(index)}
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
        <NavbarLink icon={IconLogout} label="Logout" path="/"/>
      </Stack>
    </nav>
  );
}
