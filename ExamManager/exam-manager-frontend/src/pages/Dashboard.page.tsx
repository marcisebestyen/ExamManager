import React, { useEffect, useState } from 'react';
import { IconAlertCircle, IconCalendarEvent, IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
import { Alert, Button, Container, Grid, Group, Loader, Paper, ScrollArea, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { IExamUpcoming } from '../interfaces/IExamUpcoming';


const Dashboard = () => {
  const [upcomingExams, setUpcomingExams] = useState<IExamUpcoming[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

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

  const handleDownload = async (
    exportType: string,
    apiCall: () => Promise<any>,
    defaultFileName: string
  ) => {
    try {
      setDownloadingType(exportType);

      const response = await apiCall();

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = defaultFileName;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
        else {
          const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            fileName = filenameMatch[1];
          }
        }
      }

      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notifications.show({ title: 'Error', message: `Failed to download ${exportType}`, color: 'red' });
    } finally {
      setDownloadingType(null);
    }
  };

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
                radius="md"
                leftSection={<IconFileSpreadsheet size={16} />}
                loading={downloadingType === 'exams'}
                onClick={() => handleDownload('exams', api.Exports.exportExams, 'exams.xlsx')}
              >
                All Exams
              </Button>
              <Button
                variant="outline"
                color="green"
                radius="md"
                leftSection={<IconFileSpreadsheet size={16} />}
                loading={downloadingType === 'examiners'}
                onClick={() =>
                  handleDownload('examiners', api.Exports.exportExaminers, 'examiners.xlsx')
                }
              >
                All Examiners
              </Button>
              <Button
                variant="outline"
                color="green"
                radius="md"
                leftSection={<IconFileSpreadsheet size={16} />}
                loading={downloadingType === 'examTypes'}
                onClick={() =>
                  handleDownload('examTypes', api.Exports.exportExamTypes, 'exam_types.xlsx')
                }
              >
                All Exam Types
              </Button>
              <Button
                variant="outline"
                color="green"
                radius="md"
                leftSection={<IconFileSpreadsheet size={16} />}
                loading={downloadingType === 'institutions'}
                onClick={() =>
                  handleDownload(
                    'institutions',
                    api.Exports.exportInstitutions,
                    'institutions.xlsx'
                  )
                }
              >
                All Institutions
              </Button>
              <Button
                variant="outline"
                color="green"
                radius="md"
                leftSection={<IconFileSpreadsheet size={16} />}
                loading={downloadingType === 'professions'}
                onClick={() =>
                  handleDownload('professions', api.Exports.exportProfessions, 'professions.xlsx')
                }
              >
                All Professions
              </Button>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={12}>
          <Paper shadow="xs" p="md" withBorder>
            <Group mb="md">
              <ThemeIcon color="violet" variant="light" size="lg">
                <IconDownload size={20} />
              </ThemeIcon>
              <Title order={4}>Import Templates (XLSX)</Title>
            </Group>

            <Text c="dimmed" mb="md" size="sm">
              Download blank Excel templates formatted for bulk data import.
            </Text>

            <Group>
              <Button
                variant="outline"
                color="violet"
                radius="md"
                leftSection={<IconDownload size={16} />}
                loading={downloadingType === 'template-exams'}
                onClick={() =>
                  handleDownload(
                    'template-exams',
                    api.Imports.downloadTemplateExams,
                    'Exams_Import_Template.xlsx'
                  )
                }
              >
                Exams Template
              </Button>
              <Button
                variant="outline"
                color="violet"
                radius="md"
                leftSection={<IconDownload size={16} />}
                loading={downloadingType === 'template-examiners'}
                onClick={() =>
                  handleDownload(
                    'template-examiners',
                    api.Imports.downloadTemplateExaminers,
                    'Examiners_Import_Template.xlsx'
                  )
                }
              >
                Examiners Template
              </Button>
              <Button
                variant="outline"
                color="violet"
                radius="md"
                leftSection={<IconDownload size={16} />}
                loading={downloadingType === 'template-examTypes'}
                onClick={() =>
                  handleDownload(
                    'template-examTypes',
                    api.Imports.downloadTemplateExamTypes,
                    'ExamTypes_Import_Template.xlsx'
                  )
                }
              >
                Exam Types Template
              </Button>
              <Button
                variant="outline"
                color="violet"
                radius="md"
                leftSection={<IconDownload size={16} />}
                loading={downloadingType === 'template-institutions'}
                onClick={() =>
                  handleDownload(
                    'template-institutions',
                    api.Imports.downloadTemplateInstitutions,
                    'Institutions_Import_Template.xlsx'
                  )
                }
              >
                Institutions Template
              </Button>
              <Button
                variant="outline"
                color="violet"
                radius="md"
                leftSection={<IconDownload size={16} />}
                loading={downloadingType === 'template-professions'}
                onClick={() =>
                  handleDownload(
                    'template-professions',
                    api.Imports.downloadTemplateProfessions,
                    'Professions_Import_Template.xlsx'
                  )
                }
              >
                Professions Template
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
