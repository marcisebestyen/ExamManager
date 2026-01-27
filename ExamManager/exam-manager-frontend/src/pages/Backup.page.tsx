import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo } from 'react';
import { IconCheck, IconRefresh, IconX } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Badge, Button, Flex, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
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
          return val === ActivityType.Manual ? (
            <Badge color="blue" variant="light">
              Automatic
            </Badge>
          ) : (
            <Badge color="orange" variant="light">
              Manual
            </Badge>
          );
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
    enableRowActions: false,
    enableDensityToggle: false,
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
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          variant="outline"
          radius='md'
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
