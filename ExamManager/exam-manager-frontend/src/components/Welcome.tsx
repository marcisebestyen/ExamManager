import { Text, Title } from '@mantine/core';
import classes from './Welcome.module.css';

export function Welcome() {
  return (
    <>
      <Title className={classes.title} ta="center" mt={100}>
        Welcome to{' '}
        <Text inherit variant="gradient" component="span" gradient={{ from: 'blue', to: 'yellow' }}>
          Exam Manager
        </Text>
      </Title>
      <Text fz='xl' c="dimmed" mt={30} ta='center'>
        Designed to streamline your exam creation and management process with ease.
      </Text>
      <Text fz='xs' c="dimmed" mt={15} ta='center'>
        Designed by: Marcell Sebestyen
      </Text>
    </>
  );
}
