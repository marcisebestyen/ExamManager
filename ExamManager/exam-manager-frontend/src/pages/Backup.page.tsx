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
  const queryClient = useQueryClient();
  const { data: fetchedBackups = [], isError, isFetching, isLoading, refetch } = useGetBackups();

  const { mutate: restoreBackup } = useRestoreBackup();

  const handleRestoreClick = (row: IBackupHistory) => {
    modals.openConfirmModal({
      id: 'restore-confirm',
      title: (
        <Text fw={700} c="red">
          DANGER: Database Restore
        </Text>
      ),
      centered: true,
      children: (
        <Stack gap="md">
          <Text size="sm">Are you sure you want to restore the database to the version from:</Text>
          <Text fw={700} c="blue" ta="center" size="lg">
            {new Date(row.backupDate).toLocaleString()}
          </Text>
          <Text c="red" fw={700} size="sm">
            WARNING: This will overwrite the CURRENT database! Any data created after this backup
            date will be permanently lost.
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Restore Database', cancel: 'Cancel' },
      confirmProps: { color: 'red', variant: 'filled', radius: 'md' },
      cancelProps: { variant: 'subtle', radius: 'md' },
      onConfirm: async () => {
        const notificationId = 'restore-loading';
        notifications.show({
          id: notificationId,
          loading: true,
          title: 'Restoring Database',
          message: 'Please wait. Do not close this window...',
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
        header: 'Date (UTC)',
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString(),
        size: 180,
      },
      {
        accessorKey: 'fileName',
        header: 'File Name',
        size: 250,
      },
      {
        accessorKey: 'activityType',
        header: 'Type',
        size: 100,
        Cell: ({ cell }) => {
          const val = cell.getValue<ActivityType>();
          if (val === ActivityType.Auto)
            {return (
              <Badge color="blue" variant="light">
                Automatic
              </Badge>
            );}
          if (val === ActivityType.Manual)
            {return (
              <Badge color="orange" variant="light">
                Manual
              </Badge>
            );}
          return (
            <Badge color="grape" variant="filled">
              Restore
            </Badge>
          );
        },
      },
      {
        accessorKey: 'operatorUserName',
        header: 'Initiated By',
        size: 150,
        Cell: ({ cell, row }) => (
          <Text size="sm" fw={row.original.activityType === ActivityType.Auto ? 700 : 400}>
            {cell.getValue<string>() || 'System'}
          </Text>
        ),
      },
      {
        accessorKey: 'isSuccessful',
        header: 'Status',
        size: 100,
        Cell: ({ cell }) => {
          const success = cell.getValue<boolean>();
          return (
            <Tooltip label={success ? 'Success' : 'Failed'}>
              <ThemeIcon color={success ? 'teal' : 'red'} variant="light" size="sm" radius="xl">
                {success ? <IconCheck size={14} /> : <IconX size={14} />}
              </ThemeIcon>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'errorMessage',
        header: 'Error Details',
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
    []
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedBackups,
    enableRowActions: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    getRowId: (row) => String(row.id),
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
        <Tooltip label="Restore this version">
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
          Refresh Log
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Backups.restoreBackup(id),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'The database has been reverted successfully.',
        color: 'teal',
        autoClose: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['backupHistory'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Restore Failed',
        message: error.response?.data?.message || 'Critical error during restore.',
        color: 'red',
        autoClose: 10000,
      });
    },
  });
}

const BackupPage = () => (
  <MantineProvider>
    <QueryClientProvider client={new QueryClient()}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Stack mb="lg">
            <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
              Backup History
            </Title>
          </Stack>
          <BackupTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default BackupPage;
