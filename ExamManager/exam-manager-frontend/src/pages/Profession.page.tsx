import { useMemo } from 'react';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
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
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import { IProfession, ProfessionFormData } from '@/interfaces/IProfession';
import api from '../api/api';
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
        <TextInput label="Keor ID" {...form.getInputProps('keorId')} required />
        <TextInput label="Profession Name" {...form.getInputProps('professionName')} required />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" mr="xs">
            Create
          </Button>
          <Button variant="outline" onClick={() => modals.close('create-profession')}>
            Cancel
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

// ## Edit Profession Form Component
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
        <TextInput label="Keor ID" {...form.getInputProps('keorId')} required />
        <TextInput label="Profession Name" {...form.getInputProps('professionName')} required />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" mr="xs">
            Save
          </Button>
          <Button variant="outline" onClick={() => modals.close('edit-profession')}>
            Cancel
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

// ## Profession Table Component
const ProfessionTable = () => {
  const {
    data: fetchedProfessions = [],
    isError: isLoadingProfessionsError,
    isFetching: isFetchingProfessions,
    isLoading: isLoadingProfessions,
  } = useGetProfessions();
  const { mutateAsync: deleteProfession, isPending: isDeletingProfession } = useDeleteProfession();

  const columns = useMemo<MRT_ColumnDef<IProfession>[]>(
    () => [
      { accessorKey: 'id', header: 'ID', size: 80 },
      { accessorKey: 'keorId', header: 'Keor ID' },
      { accessorKey: 'professionName', header: 'Profession Name' },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-profession',
      title: <Title order={3}>Create New Profession</Title>,
      children: <CreateProfessionForm />,
    });

  const openEditModal = (profession: IProfession) =>
    modals.open({
      id: 'edit-profession',
      title: <Title order={3}>Edit Profession</Title>,
      children: <EditProfessionForm initialProfession={profession} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IProfession>) =>
    modals.openConfirmModal({
      title: 'Are you sure you want to delete this profession?',
      children: (
        <Text>
          Are you sure you want to delete "{row.original.professionName}"? This action cannot be
          undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteProfession(row.original.id),
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedProfessions,
    enableEditing: false, // Custom modal handles editing
    enableRowActions: true,
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingProfessionsError
      ? { color: 'red', children: 'Error loading data' }
      : undefined,
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    positionActionsColumn: 'first',
    renderRowActions: ({ row }) => (
      <Flex gap="md">
        <Tooltip label="Edit">
          <ActionIcon
            color="blue"
            variant="filled"
            radius="md"
            onClick={() => openEditModal(row.original)}
          >
            <IconEdit />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon
            color="red"
            variant="filled"
            radius="md"
            onClick={() => openDeleteConfirmModal(row)}
          >
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    renderTopToolbarCustomActions: () => (
      <Button variant="outline" radius="md" onClick={openCreateModal}>
        Create New Entry
      </Button>
    ),
    state: {
      isLoading: isLoadingProfessions,
      isSaving: isDeletingProfession,
      showAlertBanner: isLoadingProfessionsError,
      showProgressBars: isFetchingProfessions,
    },
  });

  return <MantineReactTable table={table} />;
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
          <Title order={2}>Professions</Title>
          <ProfessionTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default ProfessionPage;

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
