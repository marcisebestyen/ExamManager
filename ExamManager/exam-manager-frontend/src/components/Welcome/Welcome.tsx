import { Link } from 'react-router-dom';
import { Box, Button, Text, Title } from '@mantine/core';
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
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '20px',
        }}
      >
        <Button
          component={Link}
          to="/login"
          size="xl"
          variant="outline"
          radius="md"
          // gradient={{ from: 'blue', to: 'yellow' }}
        >
          Login
        </Button>
      </Box>
    </>
  );
}
