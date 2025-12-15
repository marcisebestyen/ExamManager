import React, { useEffect, useState } from 'react';
import { IconAlertCircle, IconCalendarEvent, IconFileSpreadsheet } from '@tabler/icons-react';
import { Alert, Button, Container, Grid, Group, Loader, Paper, ScrollArea, Table, Text, ThemeIcon, Title } from '@mantine/core';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { IExamUpcoming } from '../interfaces/IExamUpcoming';


const Dashboard = () => {
  const [upcomingExams, setUpcomingExams] = useState<IExamUpcoming[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.Exams.getUpcomingExams(3);
        setUpcomingExams(response.data);
      } catch (err) {
        console.error('Failed to fetch upcoming exams', err);
        setError('Could not load upcoming exams.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const rows = upcomingExams.map((exam) => (
    <Table.Tr key={exam.examCode}>
      <Table.Td style={{ fontWeight: 500 }}>{exam.examName}</Table.Td>
      <Table.Td>
        <Text c="dimmed" size="sm">
          {exam.examCode}
        </Text>
      </Table.Td>
      <Table.Td>{formatDate(exam.examDate)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        Dashboard
      </Title>

      <Grid gutter="lg">
        <Grid.Col span={12}>
          <Paper shadow="xs" p="md" withBorder>
            <Group mb="md">
              <ThemeIcon color="green" variant="light" size="lg">
                <IconFileSpreadsheet size={20} />
              </ThemeIcon>
              <Title order={4}>Available Reports (XLSX)</Title>
            </Group>

            <Text c="dimmed" mb="md" size="sm">
              Download pre-queried reports.
            </Text>

            <Group>
              <Button
                variant="outline"
                color="green"
                leftSection={<IconFileSpreadsheet size={16} />}
              >
                All Exams
              </Button>
              <Button
                variant="outline"
                color="green"
                leftSection={<IconFileSpreadsheet size={16} />}
              >
                All Examiners
              </Button>
              <Button
                variant="outline"
                color="green"
                leftSection={<IconFileSpreadsheet size={16} />}
              >
                All Exam Types
              </Button>
              <Button
                variant="outline"
                color="green"
                leftSection={<IconFileSpreadsheet size={16} />}
              >
                All Institutions
              </Button>
              <Button
                variant="outline"
                color="green"
                leftSection={<IconFileSpreadsheet size={16} />}
              >
                All Professions
              </Button>
              <Button
                variant="outline"
                color="green"
                leftSection={<IconFileSpreadsheet size={16} />}
              >
                Export Upcoming Exams
              </Button>
              <Button
                variant="outline"
                color="green"
                leftSection={<IconFileSpreadsheet size={16} />}
              >
                Export Everything
              </Button>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={12}>
          <Paper shadow="xs" p="md" withBorder>
            <Group mb="md">
              <ThemeIcon color="blue" variant="light" size="lg">
                <IconCalendarEvent size={20} />
              </ThemeIcon>
              <Title order={4}>Upcoming Exams</Title>
            </Group>

            {loading ? (
              <Group justify="center" p="xl">
                <Loader type="dots" />
              </Group>
            ) : error ? (
              <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
                {error}
              </Alert>
            ) : upcomingExams.length === 0 ? (
              <Text c="dimmed" fs="italic">
                No upcoming exams found.
              </Text>
            ) : (
              <ScrollArea h={300} type="auto">
                <Table striped highlightOnHover stickyHeader stickyHeaderOffset={0}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Exam Name</Table.Th>
                      <Table.Th>Code</Table.Th>
                      <Table.Th>Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>{rows}</Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
};

export function DashboardPage() {
  return (
    <Skeleton>
      <Dashboard />
    </Skeleton>
  );
}
