import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo } from 'react';
import { IconCheck, IconHistory, IconRefresh, IconX } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { ActionIcon, Badge, Button, Flex, Text as MantineText, Stack, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { modals, ModalsProvider } from '@mantine/modals';
import { notifications, Notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { ActivityType, IBackupHistory } from '../interfaces/IBackup';

const BackupTable = () => {
  const {
    data: fetchedBackups = [],
    isError: isLoadingError,
    isFetching,
    isLoading,
    refetch,
  } = useGetBackups();

  const { mutate: restoreBackup } = useRestoreBackup();

  const handleRestoreClick = (row: IBackupHistory) => {
    modals.openConfirmModal({
      title: 'DANGER: Database Restore',
      centered: true,
      children: (
        <Stack>
          <MantineText size="sm">Are you sure you want to restore the database to the version from:</MantineText>
          <MantineText fw={700} c="blue">
            {new Date(row.backupDate).toLocaleString()}
          </MantineText>
          <MantineText c="red" fw={700} size="sm">
            WARNING: This will overwrite the CURRENT database! Any data created after this backup
            date will be permanently lost.
          </MantineText>
        </Stack>
      ),
      labels: { confirm: 'YES, RESTORE DATABASE', cancel: 'Cancel' },
      confirmProps: { color: 'red', variant: 'outline', radius: 'md' },
      cancelProps: { radius: 'md', variant: 'subtle' },
      onConfirm: async () => {
        const id = notifications.show({
          loading: true,
          title: 'Restoring Database',
          message: 'Please wait. Do not close this window...',
          autoClose: false,
          withCloseButton: false,
        });

        try {
          restoreBackup(row.id);
          notifications.hide(id);
        } catch (e) {
          notifications.hide(id);
        }
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
          if (val === ActivityType.Auto) {
            return (
              <Badge color="blue" variant="light">
                Automatic
              </Badge>
            );
          } else if (val === ActivityType.Manual) {
            return (
              <Badge color="orange" variant="light">
                Manual
              </Badge>
            );
          } else {
            return (
              <Badge color="grape" variant="filled">
                Restore
              </Badge>
            );
          }
        },
      },
      {
        accessorKey: 'operatorUserName',
        header: 'Initiated By',
        size: 150,
        Cell: ({ cell, row }) => {
          const isAuto = row.original.activityType === ActivityType.Auto;
          return (
            <span style={{ fontWeight: isAuto ? 'bold' : 'normal' }}>
              {cell.getValue<string>() || 'System'}
            </span>
          );
        },
      },
      {
        accessorKey: 'isSuccessful',
        header: 'Status',
        size: 100,
        Cell: ({ cell }) => {
          const success = cell.getValue<boolean>();
          return success ? (
            <Tooltip label="Success">
              <ThemeIcon color="teal" variant="light" size="sm" radius="xl">
                <IconCheck size={14} />
              </ThemeIcon>
            </Tooltip>
          ) : (
            <Tooltip label="Failed">
              <ThemeIcon color="red" variant="light" size="sm" radius="xl">
                <IconX size={14} />
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
          return msg ? <span style={{ color: 'red' }}>{msg}</span> : <span>-</span>;
        },
      },
    ],
    []
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedBackups,
    enableEditing: false,
    enableRowActions: true,
    enableDensityToggle: false,
    renderRowActions: ({ row }) => {
      const type = row.original.activityType;
      const isRestorable = type === ActivityType.Manual || type === ActivityType.Auto;
      const isSuccess = row.original.isSuccessful;

      if (!isRestorable || !isSuccess) {
        return (
          <Tooltip label="Cannot restore from this entry">
            <Badge color="gray" variant="outline" size="xs" style={{ textTransform: 'none' }}>
              N/A
            </Badge>
          </Tooltip>
        );
      }

      return (
        <Tooltip label="Restore this version">
          <ActionIcon color="red" variant="subtle" onClick={() => handleRestoreClick(row.original)}>
            <IconHistory size={20} />
          </ActionIcon>
        </Tooltip>
      );
    },
    initialState: {
      sorting: [{ id: 'backupDate', desc: true }],
      density: 'xs',
    },
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingError
      ? {
          color: 'red',
          children: 'Error loading backup history',
        }
      : undefined,
    state: {
      isLoading,
      showAlertBanner: isLoadingError,
      showProgressBars: isFetching,
    },
    positionActionsColumn: 'first',
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          variant="outline"
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
    queryFn: async () => {
      const response = await api.Backups.getHistory();
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
}

function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Backups.restoreBackup(id),
    onSuccess: () => {
      notifications.show({
        title: 'System Restored Successfully',
        message: 'The database has been reverted. You may need to log in again.',
        color: 'teal',
        autoClose: false,
        withCloseButton: true,
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

const queryClient = new QueryClient();

const BackupPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Title order={2} mb="md">
            Backup History
          </Title>
          <BackupTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  );
};

export default BackupPage;
