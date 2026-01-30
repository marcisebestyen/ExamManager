import React, { useEffect, useState } from 'react';
import {
  IconCalendarEvent,
  IconCalendarTime,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeXls,
  IconTableExport,
} from '@tabler/icons-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  rem,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { IExamUpcoming } from '../interfaces/IExamUpcoming';

interface ActionButtonProps {
  label: string;
  description: string;
  icon: React.ElementType;
  loading: boolean;
  onClick: () => void;
  color: string;
}

const ActionButton = ({
  label,
  description,
  icon: Icon,
  loading,
  onClick,
  color,
}: ActionButtonProps) => (
  <UnstyledButton
    onClick={onClick}
    disabled={loading}
    style={{
      display: 'block',
      width: '100%',
      padding: 'var(--mantine-spacing-md)',
      borderRadius: 'var(--mantine-radius-md)',
      backgroundColor: 'var(--mantine-color-body)',
      border: `1px solid var(--mantine-color-gray-3)`,
      transition: 'all 200ms ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = `var(--mantine-color-${color}-5)`;
      e.currentTarget.style.backgroundColor = `var(--mantine-color-${color}-0)`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
      e.currentTarget.style.backgroundColor = 'var(--mantine-color-body)';
    }}
  >
    <Group>
      <ThemeIcon size={40} color={color} variant="light" radius="md">
        {loading ? <Loader size="xs" color={color} /> : <Icon size={20} />}
      </ThemeIcon>
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </div>
    </Group>
  </UnstyledButton>
);

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
        } else {
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
      notifications.show({
        title: 'Error',
        message: `Failed to download ${exportType}`,
        color: 'red',
      });
    } finally {
      setDownloadingType(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      full: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
            Dashboard
          </Title>
          <Text c="dimmed">Overview of system operations and upcoming schedules</Text>
        </div>

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="xl">
              <Paper withBorder p="md" radius="md" shadow="sm">
                <Group mb="lg">
                  <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                    <IconFileSpreadsheet style={{ width: rem(20), height: rem(20) }} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="lg">
                      Data Reports
                    </Text>
                    <Text c="dimmed" size="xs">
                      Export current system data to Excel
                    </Text>
                  </div>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <ActionButton
                    label="All Exams"
                    description="Export full exam history"
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'exams'}
                    onClick={() => handleDownload('exams', api.Exports.exportExams, 'exams.xlsx')}
                  />
                  <ActionButton
                    label="All Examiners"
                    description="List of registered examiners"
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'examiners'}
                    onClick={() =>
                      handleDownload('examiners', api.Exports.exportExaminers, 'examiners.xlsx')
                    }
                  />
                  <ActionButton
                    label="Exam Types"
                    description="Categories and definitions"
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'examTypes'}
                    onClick={() =>
                      handleDownload('examTypes', api.Exports.exportExamTypes, 'exam_types.xlsx')
                    }
                  />
                  <ActionButton
                    label="Institutions"
                    description="Partnered centers details"
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'institutions'}
                    onClick={() =>
                      handleDownload(
                        'institutions',
                        api.Exports.exportInstitutions,
                        'institutions.xlsx'
                      )
                    }
                  />
                  <ActionButton
                    label="Professions"
                    description="Registered professions"
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'professions'}
                    onClick={() =>
                      handleDownload(
                        'professions',
                        api.Exports.exportProfessions,
                        'professions.xlsx'
                      )
                    }
                  />
                </SimpleGrid>
              </Paper>

              <Paper withBorder p="md" radius="md" shadow="sm">
                <Group mb="lg">
                  <ThemeIcon color="violet" variant="light" size="lg" radius="md">
                    <IconDownload style={{ width: rem(20), height: rem(20) }} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="lg">
                      Import Templates
                    </Text>
                    <Text c="dimmed" size="xs">
                      Blank templates for bulk data entry
                    </Text>
                  </div>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                  <ActionButton
                    label="Exams"
                    description="Template for new exams"
                    icon={IconFileTypeXls}
                    color="violet"
                    loading={downloadingType === 'template-exams'}
                    onClick={() =>
                      handleDownload(
                        'template-exams',
                        api.Imports.downloadTemplateExams,
                        'Exams_Template.xlsx'
                      )
                    }
                  />
                  <ActionButton
                    label="Examiners"
                    description="Template for staff"
                    icon={IconFileTypeXls}
                    color="violet"
                    loading={downloadingType === 'template-examiners'}
                    onClick={() =>
                      handleDownload(
                        'template-examiners',
                        api.Imports.downloadTemplateExaminers,
                        'Examiners_Template.xlsx'
                      )
                    }
                  />
                  <ActionButton
                    label="Exam Types"
                    description="Template for categories"
                    icon={IconFileTypeXls}
                    color="violet"
                    loading={downloadingType === 'template-examTypes'}
                    onClick={() =>
                      handleDownload(
                        'template-examTypes',
                        api.Imports.downloadTemplateExamTypes,
                        'ExamTypes_Template.xlsx'
                      )
                    }
                  />
                  <ActionButton
                    label="Institutions"
                    description="Template for locations"
                    icon={IconFileTypeXls}
                    color="violet"
                    loading={downloadingType === 'template-institutions'}
                    onClick={() =>
                      handleDownload(
                        'template-institutions',
                        api.Imports.downloadTemplateInstitutions,
                        'Institutions_Template.xlsx'
                      )
                    }
                  />
                  <ActionButton
                    label="Professions"
                    description="Template for roles"
                    icon={IconFileTypeXls}
                    color="violet"
                    loading={downloadingType === 'template-professions'}
                    onClick={() =>
                      handleDownload(
                        'template-professions',
                        api.Imports.downloadTemplateProfessions,
                        'Professions_Template.xlsx'
                      )
                    }
                  />
                </SimpleGrid>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md" shadow="sm" h="100%">
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon color="blue" variant="light" size="md">
                      <IconCalendarEvent size={16} />
                    </ThemeIcon>
                    <Text fw={600}>Upcoming Exams</Text>
                  </Group>
                  <Badge variant="light">Next 3 Days</Badge>
                </Group>
              </Card.Section>

              <div style={{ paddingTop: 'var(--mantine-spacing-md)' }}>
                {loading ? (
                  <Stack align="center" py="xl">
                    <Loader size="sm" type="dots" />
                    <Text size="xs" c="dimmed">
                      Loading schedule...
                    </Text>
                  </Stack>
                ) : error ? (
                  <Alert variant="light" color="red" title="Error" radius="md">
                    {error}
                  </Alert>
                ) : upcomingExams.length === 0 ? (
                  <Stack align="center" py="xl" gap="xs">
                    <IconCalendarTime size={48} color="var(--mantine-color-gray-3)" stroke={1.5} />
                    <Text c="dimmed" size="sm" ta="center">
                      No exams scheduled for the next 3 days.
                    </Text>
                    <Button variant="subtle" size="xs">
                      View Calendar
                    </Button>
                  </Stack>
                ) : (
                  <Timeline active={upcomingExams.length} bulletSize={24} lineWidth={2}>
                    {upcomingExams.map((exam) => {
                      const dateInfo = formatDate(exam.examDate);
                      return (
                        <Timeline.Item
                          key={exam.examCode}
                          bullet={
                            <ThemeIcon
                              size={22}
                              variant="gradient"
                              gradient={{ from: 'blue', to: 'cyan' }}
                              radius="xl"
                            >
                              <IconCalendarEvent size={12} />
                            </ThemeIcon>
                          }
                          title={
                            <Text size="sm" fw={600} lineClamp={1}>
                              {exam.examName}
                            </Text>
                          }
                        >
                          <Text c="dimmed" size="xs" mt={2}>
                            Code: {exam.examCode}
                          </Text>
                          <Group gap={6} mt={4}>
                            <Badge color="gray" variant="light" size="xs">
                              {dateInfo.month} {dateInfo.day}
                            </Badge>
                          </Group>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                )}
              </div>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
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
