import React, { useEffect, useState } from 'react';
import {
  IconCalendarEvent,
  IconCalendarTime,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeXls,
  IconTableExport,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
        setError(t('dashboard.errors.upcoming'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]);

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
        title: t('common.error'),
        message: `${t('dashboard.errors.download')} ${exportType}`,
        color: 'red',
      });
    } finally {
      setDownloadingType(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'hu' ? 'hu-HU' : 'en-US';

    return {
      day: date.getDate(),
      month: date.toLocaleDateString(locale, { month: 'short' }),
      full: date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString(locale, {
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
            {t('dashboard.title')}
          </Title>
          <Text c="dimmed">{t('dashboard.description')}</Text>
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
                      {t('dashboard.reports.title')}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {t('dashboard.reports.subtitle')}
                    </Text>
                  </div>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <ActionButton
                    label={t('dashboard.reports.exams')}
                    description={t('dashboard.reports.examsDesc')}
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'exams'}
                    onClick={() => handleDownload('exams', api.Exports.exportExams, 'exams.xlsx')}
                  />
                  <ActionButton
                    label={t('dashboard.reports.examiners')}
                    description={t('dashboard.reports.examinersDesc')}
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'examiners'}
                    onClick={() =>
                      handleDownload('examiners', api.Exports.exportExaminers, 'examiners.xlsx')
                    }
                  />
                  <ActionButton
                    label={t('dashboard.reports.examTypes')}
                    description={t('dashboard.reports.examTypesDesc')}
                    icon={IconTableExport}
                    color="teal"
                    loading={downloadingType === 'examTypes'}
                    onClick={() =>
                      handleDownload('examTypes', api.Exports.exportExamTypes, 'exam_types.xlsx')
                    }
                  />
                  <ActionButton
                    label={t('dashboard.reports.institutions')}
                    description={t('dashboard.reports.institutionsDesc')}
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
                    label={t('dashboard.reports.professions')}
                    description={t('dashboard.reports.professionsDesc')}
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
                      {t('dashboard.templates.title')}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {t('dashboard.templates.subtitle')}
                    </Text>
                  </div>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                  <ActionButton
                    label={t('dashboard.templates.exams')}
                    description={t('dashboard.templates.examsDesc')}
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
                    label={t('dashboard.templates.examiners')}
                    description={t('dashboard.templates.examinersDesc')}
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
                    label={t('dashboard.templates.examTypes')}
                    description={t('dashboard.templates.examTypesDesc')}
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
                    label={t('dashboard.templates.institutions')}
                    description={t('dashboard.templates.institutionsDesc')}
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
                    label={t('dashboard.templates.professions')}
                    description={t('dashboard.templates.professionsDesc')}
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
                    <Text fw={600}>{t('dashboard.upcoming.title')}</Text>
                  </Group>
                  <Badge variant="light">{t('dashboard.upcoming.badge')}</Badge>
                </Group>
              </Card.Section>

              <div style={{ paddingTop: 'var(--mantine-spacing-md)' }}>
                {loading ? (
                  <Stack align="center" py="xl">
                    <Loader size="sm" type="dots" />
                    <Text size="xs" c="dimmed">
                      {t('dashboard.upcoming.loading')}
                    </Text>
                  </Stack>
                ) : error ? (
                  <Alert variant="light" color="red" title={t('common.error')} radius="md">
                    {error}
                  </Alert>
                ) : upcomingExams.length === 0 ? (
                  <Stack align="center" py="xl" gap="xs">
                    <IconCalendarTime size={48} color="var(--mantine-color-gray-3)" stroke={1.5} />
                    <Text c="dimmed" size="sm" ta="center">
                      {t('dashboard.upcoming.empty')}
                    </Text>
                    <Button variant="subtle" size="xs">
                      {t('dashboard.upcoming.viewCalendar')}
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
                            {t('dashboard.upcoming.code')}: {exam.examCode}
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
