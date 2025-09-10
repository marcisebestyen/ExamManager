import { useState } from 'react';
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
import { Center, Stack, Tooltip, UnstyledButton } from '@mantine/core';
import classes from './NavbarMinimal.module.css';

interface NavbarLinkProps {
  icon: typeof IconHome;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton onClick={onClick} className={classes.link} data-active={active || undefined}>
        <Icon size={20} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { icon: IconHome, label: 'Home' },
  { icon: IconDashboard, label: 'Dashboard' },
  { icon: IconPencilQuestion, label: 'Exams' },
  { icon: IconUserQuestion, label: 'Examiners' },
  { icon: IconClipboardSearch, label: 'Exam Types' },
  { icon: IconBuildings, label: 'Institutions' },
  { icon: IconBriefcase2, label: 'Professions' },
  { icon: IconUserCog, label: 'Operators' },
  { icon: IconSettings, label: 'Settings' },
];

export function NavbarMinimal() {
  const [active, setActive] = useState(2);

  const links = mockdata.map((link, index) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={index === active}
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
        <NavbarLink icon={IconLogout} label="Logout" />
      </Stack>
    </nav>
  );
}
