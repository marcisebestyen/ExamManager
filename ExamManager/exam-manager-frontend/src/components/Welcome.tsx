import { useTranslation } from 'react-i18next';
import { Container, rem, Stack, Text, Title } from '@mantine/core';

export function Welcome() {
  const { t } = useTranslation();

  return (
    <Container size="md" py={rem(80)}>
      <Stack align="center" gap="xl">
        <Title
          order={1}
          style={{
            fontSize: rem(62),
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-2px',
            textAlign: 'center',
            color: 'var(--mantine-color-text)',
          }}
        >
          {t('welcome.title')}{' '}
          <Text
            component="span"
            inherit
            variant="gradient"
            gradient={{
              from: 'var(--mantine-primary-color-filled)',
              to: 'var(--mantine-color-cyan-5)',
              deg: 45,
            }}
          >
            {t('common.appTitle')}
          </Text>
        </Title>

        <Text c="dimmed" ta="center" size="xl" maw={600} style={{ lineHeight: 1.6 }}>
          {t('welcome.description')}
        </Text>

        <Text c="dimmed" size="xs" mt="xl">
          {t('welcome.designedBy')}:{' '}
          <Text span fw={500} c="var(--mantine-color-text)">
            Marcell Achilles Sebestyén
          </Text>
        </Text>
      </Stack>
    </Container>
  );
}
