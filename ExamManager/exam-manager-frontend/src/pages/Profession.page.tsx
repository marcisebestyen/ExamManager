import { useMemo, useState } from 'react';
import {
  IconBriefcase,
  IconDownload,
  IconEdit,
  IconId,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  MantineReactTable,
  MRT_ColumnDef,
  MRT_Row,
  useMantineReactTable,
} from 'mantine-react-table';
import {
  ActionIcon,
  Button,
  Flex,
  MantineProvider,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import { IProfession, ProfessionFormData } from '@/interfaces/IProfession';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
import { Skeleton } from '../components/Skeleton';

interface JsonPatchOperation {
  op: 'replace';
  path: string;
  value?: any;
}

const generatePatchDocument = (
  oldData: IProfession,
  newData: IProfession
): JsonPatchOperation[] => {
  const patch: JsonPatchOperation[] = [];
  for (const key in newData) {
    if (Object.hasOwn(newData, key) && (newData as any)[key] !== (oldData as any)[key]) {
      patch.push({
        op: 'replace',
        path: `/${key}`,
        value: (newData as any)[key],
      });
    }
  }
  return patch;
};

const validateRequired = (value: string) => !!value.trim().length;

function validateProfession(profession: ProfessionFormData) {
  const errors: { keorId?: string; professionName?: string } = {};
  if (!validateRequired(profession.keorId)) {
    errors.keorId = 'Keor ID is required';
  }
  if (!validateRequired(profession.professionName)) {
    errors.professionName = 'Profession Name is required';
  }
  return errors;
}

const CreateProfessionForm = () => {
  const { data: fetchedProfessions = [] } = useGetProfessions();
  const { mutateAsync: createProfession } = useCreateProfession();

  const form = useForm<ProfessionFormData>({
    initialValues: { keorId: '', professionName: '' },
    validate: validateProfession,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedProfessions.some(
      (p) => p.keorId.toLowerCase() === values.keorId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('keorId', 'A profession with this Keor ID already exists.');
      return;
    }
    await createProfession(values);
    modals.close('create-profession');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label="Keor ID"
          description="Unique identifier for the profession"
          leftSection={<IconId size={16} />}
          {...form.getInputProps('keorId')}
          required
        />
        <TextInput
          label="Profession Name"
          description="Official name of the profession"
          leftSection={<IconBriefcase size={16} />}
          {...form.getInputProps('professionName')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" variant="filled" radius="md">
            Create Profession
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditProfessionForm = ({ initialProfession }: { initialProfession: IProfession }) => {
  const { data: fetchedProfessions = [] } = useGetProfessions();
  const { mutateAsync: updateProfession } = useUpdateProfession();

  const form = useForm<ProfessionFormData>({
    initialValues: {
      keorId: initialProfession.keorId,
      professionName: initialProfession.professionName,
    },
    validate: validateProfession,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedProfessions.some(
      (p) => p.id !== initialProfession.id && p.keorId.toLowerCase() === values.keorId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('keorId', 'A profession with this Keor ID already exists.');
      return;
    }
    const newValues: IProfession = { ...initialProfession, ...values };
    await updateProfession({ newValues, oldValues: initialProfession });
    modals.close('edit-profession');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label="Keor ID"
          leftSection={<IconId size={16} />}
          {...form.getInputProps('keorId')}
          required
        />
        <TextInput
          label="Profession Name"
          leftSection={<IconBriefcase size={16} />}
          {...form.getInputProps('professionName')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" variant="filled" radius="md">
            Save Changes
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const DeleteProfessionModal = ({ profession }: { profession: IProfession }) => {
  const { mutateAsync: deleteProfession } = useDeleteProfession();

  const handleDelete = async () => {
    await deleteProfession(profession.id);
    modals.close('delete-profession');
  };

  return (
    <Stack>
      <Text size="sm">
        Are you sure you want to delete <b>{profession.professionName}</b>? This action cannot be
        undone.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          Cancel
        </Button>
        <Button color="red" variant="filled" onClick={handleDelete}>
          Delete Profession
        </Button>
      </Flex>
    </Stack>
  );
};

const ProfessionTable = () => {
  const queryClient = useQueryClient();

  const {
    data: fetchedProfessions = [],
    isError: isLoadingProfessionsError,
    isFetching: isFetchingProfessions,
    isLoading: isLoadingProfessions,
  } = useGetProfessions();
  const { isPending: isDeletingProfession } = useDeleteProfession();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<MRT_ColumnDef<IProfession>[]>(
    () => [
      {
        accessorKey: 'keorId',
        header: 'Keor ID',
        size: 150,
        enableClickToCopy: true,
      },
      {
        accessorKey: 'professionName',
        header: 'Profession Name',
        size: 300,
      },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-profession',
      title: <Text fw={700}>Create New Profession</Text>,
      children: <CreateProfessionForm />,
    });

  const openEditModal = (profession: IProfession) =>
    modals.open({
      id: 'edit-profession',
      title: <Text fw={700}>Edit Profession</Text>,
      children: <EditProfessionForm initialProfession={profession} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IProfession>) =>
    modals.open({
      id: 'delete-profession',
      title: (
        <Text fw={700} c="red">
          Delete Profession
        </Text>
      ),
      children: <DeleteProfessionModal profession={row.original} />,
    });

  const handleExportData = async (table: any) => {
    setIsExporting(true);
    try {
      const filteredRows = table.getPrePaginationRowModel().rows;
      const ids = filteredRows.map((row: any) => row.original.id);

      if (ids.length === 0) {
        notifications.show({
          title: 'Info',
          message: 'No data to export',
          color: 'blue',
        });
        return;
      }

      const response = await api.Exports.exportProfessionsFiltered(ids);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Professions_Filtered_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Error',
        message: 'Export failed',
        color: 'red',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const table = useMantineReactTable({
    columns,
    data: fetchedProfessions,
    enableEditing: false,
    enableRowActions: true,
    getRowId: (row) => String(row.id),

    autoResetPageIndex: false,
    onPaginationChange: setPagination,
    state: {
      isLoading: isLoadingProfessions,
      isSaving: isDeletingProfession,
      showAlertBanner: isLoadingProfessionsError,
      showProgressBars: isFetchingProfessions,
      pagination,
    },

    mantinePaperProps: {
      shadow: 'sm',
      radius: 'md',
      withBorder: true,
    },
    mantineToolbarAlertBannerProps: isLoadingProfessionsError
      ? { color: 'red', children: 'Error loading data' }
      : undefined,
    mantineTableContainerProps: { style: { minHeight: '500px' } },

    enableDensityToggle: false,
    enableFullScreenToggle: false,
    positionActionsColumn: 'first',
    initialState: {
      showGlobalFilter: true,
      density: 'xs',
    },
    renderRowActions: ({ row }) => (
      <Flex gap="sm">
        <Tooltip label="Edit">
          <ActionIcon color="blue" variant="subtle" onClick={() => openEditModal(row.original)}>
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon color="red" variant="subtle" onClick={() => openDeleteConfirmModal(row)}>
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <Flex gap="sm">
        <Button
          variant="filled"
          radius="md"
          leftSection={<IconPlus size={16} />}
          onClick={openCreateModal}
        >
          Create Entry
        </Button>

        <Button
          variant="filled"
          color="violet"
          radius="md"
          leftSection={<IconUpload size={16} />}
          onClick={openImport}
        >
          Import
        </Button>

        <Button
          variant="filled"
          color="green"
          radius="md"
          leftSection={<IconDownload size={16} />}
          loading={isExporting}
          onClick={() => handleExportData(table)}
        >
          Export
        </Button>
      </Flex>
    ),
  });

  return (
    <>
      <MantineReactTable table={table} />

      <ImportModal
        opened={isImportOpen}
        onClose={closeImport}
        entityName="Professions"
        onDownloadTemplate={api.Imports.downloadTemplateProfessions}
        onImport={api.Imports.importProfessions}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['professions'] })}
      />
    </>
  );
};

function useCreateProfession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (professionData: ProfessionFormData) =>
      api.Professions.createProfession(professionData),
    onSuccess: (createdProfession) => {
      notifications.show({
        title: 'Success!',
        message: `Profession "${createdProfession.professionName}" created successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create profession.',
        color: 'red',
      });
    },
  });
}

function useGetProfessions() {
  return useQuery<IProfession[]>({
    queryKey: ['professions'],
    queryFn: () => api.Professions.getAllProfessions().then((res) => res.data),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function useUpdateProfession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newValues,
      oldValues,
    }: {
      newValues: IProfession;
      oldValues: IProfession;
    }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.Professions.updateProfession(newValues.id, patchDocument);
      }
      return newValues;
    },
    onSuccess: (updatedProfession) => {
      notifications.show({
        title: 'Success!',
        message: `Profession "${updatedProfession.professionName}" updated successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onError: () => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update profession. Please try again.',
        color: 'red',
      });
    },
  });
}

function useDeleteProfession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (professionId: number) =>
      api.Professions.deleteProfession(professionId).then(() => professionId),
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: `Profession successfully deleted.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onError: () => {
      notifications.show({
        title: 'Deletion Failed',
        message: 'Could not delete profession. Please try again.',
        color: 'red',
      });
    },
  });
}

const queryClient = new QueryClient();

const ProfessionPage = () => (
  <MantineProvider>
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Stack mb="lg">
            <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
              Professions
            </Title>
          </Stack>
          <ProfessionTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default ProfessionPage;
