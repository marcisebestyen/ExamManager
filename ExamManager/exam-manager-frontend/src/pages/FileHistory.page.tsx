import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo } from 'react';
import { IconCheck, IconDownload, IconFileSpreadsheet, IconFileTypePdf, IconRefresh, IconX } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { ActionIcon, Badge, Button, Flex, Group, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { IFileHistory } from '../interfaces/IFileHistory';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) {return '0 Bytes';}
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k**i).toFixed(dm))} ${sizes[i]}`;
};

const FileHistoryTable = () => {
  const { data: historyData = [], isError, isFetching, isLoading, refetch } = useGetFileHistory();

  const { mutate: downloadFile, isPending: isDownloading } = useDownloadFile();

  const columns = useMemo<MRT_ColumnDef<IFileHistory>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date (Local)',
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString(),
        size: 180,
      },
      {
        accessorKey: 'fileName',
        header: 'File Name',
        size: 250,
        Cell: ({ row }) => (
          <Group gap="xs">
            {row.original.contentType.includes('pdf') ? (
              <IconFileTypePdf size={20} color="red" />
            ) : (
              <IconFileSpreadsheet size={20} color="green" />
            )}
            <Text size="sm">{row.original.fileName}</Text>
          </Group>
        ),
      },
      {
        accessorKey: 'fileSizeInBytes',
        header: 'Size',
        size: 100,
        Cell: ({ cell }) => formatBytes(cell.getValue<number>()),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        size: 120,
        Cell: ({ cell }) => {
          const action = cell.getValue<string>();
          let color = 'gray';
          if (action === 'Import') {color = 'blue';}
          if (action === 'Export') {color = 'teal';}
          if (action === 'GenerateReport') {color = 'grape';}
          if (action === 'DownloadTemplate') {color = 'cyan';}

          return (
            <Badge color={color} variant="light">
              {action}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 120,
        Cell: ({ cell }) => {
          const cat = cell.getValue<string>();
          // Dynamic Colors for Categories
          let color = 'gray';
          if (cat === 'Exam') {color = 'violet';}
          if (cat === 'Examiner') {color = 'indigo';}
          if (cat === 'Institution') {color = 'orange';}
          if (cat === 'Profession') {color = 'pink';}

          return (
            <Badge color={color} variant="dot">
              {cat}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'operatorUserName',
        header: 'Operator',
        size: 150,
        Cell: ({ cell }) => (
          <Text size="sm" fw={500}>
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
          return success ? (
            <Tooltip label="Operation Successful">
              <ThemeIcon color="teal" variant="light" size="sm" radius="xl">
                <IconCheck size={14} />
              </ThemeIcon>
            </Tooltip>
          ) : (
            <Tooltip label="Operation Failed">
              <ThemeIcon color="red" variant="light" size="sm" radius="xl">
                <IconX size={14} />
              </ThemeIcon>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'processingNotes',
        header: 'Notes',
        size: 200,
        Cell: ({ cell }) => (
          <Text size="xs" c="dimmed" truncate>
            {cell.getValue<string>()}
          </Text>
        ),
      },
    ],
    []
  );

  const table = useMantineReactTable({
    columns,
    data: historyData,
    enableEditing: false,
    enableRowActions: true,
    enableDensityToggle: false,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      density: 'xs',
    },
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isError
      ? {
          color: 'red',
          children: 'Error loading file history log.',
        }
      : undefined,
    state: {
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    positionActionsColumn: 'first',
    renderRowActions: ({ row }) => (
      <Tooltip label="Download Archived File">
        <ActionIcon
          color="blue"
          variant="subtle"
          onClick={() => downloadFile(row.original)}
          loading={isDownloading}
        >
          <IconDownload size={20} />
        </ActionIcon>
      </Tooltip>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button
          variant="outline"
          radius="md"
          leftSection={<IconRefresh size={16} />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          Refresh History
        </Button>
      </Flex>
    ),
  });

  return <MantineReactTable table={table} />;
};

function useGetFileHistory() {
  return useQuery<IFileHistory[]>({
    queryKey: ['fileHistory'],
    queryFn: async () => {
      const response = await api.FileHistory.getAll();
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
}

function useDownloadFile() {
  return useMutation({
    mutationFn: async (fileEntry: IFileHistory) => {
      const response = await api.FileHistory.downloadFile(fileEntry.id);
      return {
        data: response.data,
        fileName: fileEntry.fileName,
        contentType: fileEntry.contentType,
      };
    },
    onSuccess: ({ data, fileName, contentType }) => {
      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      notifications.show({
        title: 'Download Started',
        message: `Downloading ${fileName}...`,
        color: 'teal',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Download Failed',
        message: 'The file could not be retrieved from the archive.',
        color: 'red',
      });
    },
  });
}

const queryClient = new QueryClient();

const FileHistoryPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Stack gap="xs">
            <Title order={2}>File Archive & Audit Log</Title>
            <FileHistoryTable />
          </Stack>
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  );
};

export default FileHistoryPage;
