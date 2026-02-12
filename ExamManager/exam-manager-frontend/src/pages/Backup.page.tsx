import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo } from 'react';
import { IconCheck, IconHistory, IconRefresh, IconX } from '@tabler/icons-react';
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Badge,
  Button,
  Flex,
  MantineProvider,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals, ModalsProvider } from '@mantine/modals';
import { notifications, Notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { ActivityType, IBackupHistory } from '../interfaces/IBackup';

const BackupTable = () => {
  const { t, i18n } = useTranslation();
  // const queryClient = useQueryClient();
  const { data: fetchedBackups = [], isError, isFetching, isLoading, refetch } = useGetBackups();

  const { mutate: restoreBackup } = useRestoreBackup();

  const handleRestoreClick = (row: IBackupHistory) => {
    modals.openConfirmModal({
      id: 'restore-confirm',
      title: (
        <Text fw={700} c="red">
          {t('backups.modal.title')}
        </Text>
      ),
      centered: true,
      children: (
        <Stack gap="md">
          <Text size="sm">{t('backups.modal.desc')}</Text>
          <Text fw={700} c="blue" ta="center" size="lg">
            {new Date(row.backupDate).toLocaleString(i18n.language === 'hu' ? 'hu-HU' : 'en-US')}
          </Text>
          <Text c="red" fw={700} size="sm">
            {t('backups.modal.warning')}
          </Text>
        </Stack>
      ),
      labels: { confirm: t('backups.modal.confirm'), cancel: t('exams.actions.cancel') },
      confirmProps: { color: 'red', variant: 'filled', radius: 'md' },
      cancelProps: { variant: 'subtle', radius: 'md' },
      onConfirm: async () => {
        const notificationId = 'restore-loading';
        notifications.show({
          id: notificationId,
          loading: true,
          title: t('backups.modal.loadingTitle'),
          message: t('backups.modal.loadingMsg'),
          autoClose: false,
          withCloseButton: false,
        });

        restoreBackup(row.id, {
          onSettled: () => notifications.hide(notificationId),
        });
      },
    });
  };

  const columns = useMemo<MRT_ColumnDef<IBackupHistory>[]>(
    () => [
      {
        accessorKey: 'backupDate',
        header: t('backups.table.date'),
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleString(
            i18n.language === 'hu' ? 'hu-HU' : 'en-US'
          ),
        size: 180,
      },
      {
        accessorKey: 'fileName',
        header: t('backups.table.fileName'),
        size: 250,
      },
      {
        accessorKey: 'activityType',
        header: t('backups.table.type'),
        size: 100,
        Cell: ({ cell }) => {
          const val = cell.getValue<ActivityType>();
          if (val === ActivityType.Auto) {
            return (
              <Badge color="blue" variant="light">
                {t('backups.types.auto')}
              </Badge>
            );
          }
          if (val === ActivityType.Manual) {
            return (
              <Badge color="orange" variant="light">
                {t('backups.types.manual')}
              </Badge>
            );
          }
          return (
            <Badge color="grape" variant="filled">
              {t('backups.types.restore')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'operatorUserName',
        header: t('backups.table.initiatedBy'),
        size: 150,
        Cell: ({ cell, row }) => (
          <Text size="sm" fw={row.original.activityType === ActivityType.Auto ? 700 : 400}>
            {cell.getValue<string>() || t('fileHistory.status.system')}
          </Text>
        ),
      },
      {
        accessorKey: 'isSuccessful',
        header: t('fileHistory.table.status'),
        size: 100,
        Cell: ({ cell }) => {
          const success = cell.getValue<boolean>();
          const statusText = success
            ? t('fileHistory.status.success')
            : t('fileHistory.status.failed');
          return (
            <Tooltip label={statusText}>
              <ThemeIcon color={success ? 'teal' : 'red'} variant="light" size="sm" radius="xl">
                {success ? <IconCheck size={14} /> : <IconX size={14} />}
              </ThemeIcon>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'errorMessage',
        header: t('backups.table.errorDetails'),
        Cell: ({ cell }) => {
          const msg = cell.getValue<string>();
          return msg ? (
            <Text size="xs" c="red">
              {msg}
            </Text>
          ) : (
            <Text size="xs" c="dimmed">
              -
            </Text>
          );
        },
      },
    ],
    [t, i18n.language]
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedBackups,
    enableRowActions: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    getRowId: (row) => String(row.id),
    localization: {
      actions: t('exams.mrt.actions'),
      showHideFilters: t('exams.mrt.showHideFilters'),
      showHideColumns: t('exams.mrt.showHideColumns'),
      clearFilter: t('exams.mrt.clearFilter'),
      clearSearch: t('exams.mrt.clearSearch'),
      search: t('exams.mrt.search'),
      rowsPerPage: t('exams.mrt.rowsPerPage'),
      of: t('exams.mrt.of'),
    },
    initialState: {
      sorting: [{ id: 'backupDate', desc: true }],
      density: 'xs',
      showGlobalFilter: true,
    },
    state: {
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    positionActionsColumn: 'first',
    renderRowActions: ({ row }) => {
      const type = row.original.activityType;
      const isRestorable = type === ActivityType.Manual || type === ActivityType.Auto;
      const isSuccess = row.original.isSuccessful;

      if (!isRestorable || !isSuccess) {
        return (
          <Badge color="gray" variant="outline" size="xs" style={{ textTransform: 'none' }}>
            N/A
          </Badge>
        );
      }

      return (
        <Tooltip label={t('backups.actions.restoreTooltip')}>
          <ActionIcon color="red" variant="subtle" onClick={() => handleRestoreClick(row.original)}>
            <IconHistory size={18} />
          </ActionIcon>
        </Tooltip>
      );
    },
    renderTopToolbarCustomActions: () => (
      <Flex gap="sm">
        <Button
          variant="filled"
          radius="md"
          leftSection={<IconRefresh size={16} />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          {t('backups.actions.refresh')}
        </Button>
      </Flex>
    ),
  });

  return <MantineReactTable table={table} />;
};

function useGetBackups() {
  return useQuery<IBackupHistory[]>({
    queryKey: ['backupHistory'],
    queryFn: () => api.Backups.getHistory().then((r) => r.data),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function useRestoreBackup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Backups.restoreBackup(id),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('backups.notifications.success'),
        color: 'teal',
        autoClose: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['backupHistory'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('backups.notifications.failed'),
        message: error.response?.data?.message || t('common.error'),
        color: 'red',
        autoClose: 10000,
      });
    },
  });
}

const BackupPage = () => {
  const { t } = useTranslation();
  return (
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                {t('backups.title')}
              </Title>
            </Stack>
            <BackupTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default BackupPage;
