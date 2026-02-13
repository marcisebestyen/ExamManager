import { createTheme } from '@mantine/core';


export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily: 'Inter, -apple-system, BlinkSystemFont, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: '700',
  },
  components: {
    Input: {
      defaultProps: { size: 'md' },
    },
    Button: {
      defaultProps: { size: 'md' },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        withBorder: true,
        padding: 'xl',
      },
    },
  },
});
