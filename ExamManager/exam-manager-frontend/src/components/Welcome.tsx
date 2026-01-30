import { Container, rem, Stack, Text, Title } from '@mantine/core';

export function Welcome() {
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
          Welcome to{' '}
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
            Exam Manager
          </Text>
        </Title>

        <Text c="dimmed" ta="center" size="xl" maw={600} style={{ lineHeight: 1.6 }}>
          Designed to streamline your exam creation and management process with ease. Everything you
          need in one secure place.
        </Text>

        <Text c="dimmed" size="xs" mt="xl">
          Designed by:{' '}
          <Text span fw={500} c="var(--mantine-color-text)">
            Marcell Achilles Sebestyén
          </Text>
        </Text>
      </Stack>
    </Container>
  );
}
