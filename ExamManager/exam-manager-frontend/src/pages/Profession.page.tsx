import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';

import { useMemo, useState } from 'react';
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
  MRT_EditActionButtons,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
} from 'mantine-react-table';
import { ActionIcon, Button, Flex, Stack, Text, Title, Tooltip } from '@mantine/core';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import { IProfession, ProfessionFormData } from '@/interfaces/IProfession';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';

import '@mantine/notifications/styles.css';

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
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

const ProfessionTable = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({});

  const columns = useMemo<MRT_ColumnDef<IProfession>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableEditing: false,
        enableCreating: false,
        size: 80,
      },
      {
        accessorKey: 'keorId',
        header: 'Keor ID',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.keorId,
          onFocus: () => setValidationErrors({ ...validationErrors, keorId: undefined }),
        },
      },
      {
        accessorKey: 'professionName',
        header: 'Profession Name',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.professionName,
          onFocus: () => setValidationErrors({ ...validationErrors, professionName: undefined }),
        },
      },
    ],
    [validationErrors]
  );

  const { mutateAsync: createProfession, isPending: isCreatingProfession } = useCreateProfession();
  const {
    data: fetchedProfessions = [],
    isError: isLoadingProfessionsError,
    isFetching: isFetchingProfessions,
    isLoading: isLoadingProfessions,
  } = useGetProfessions();
  const { mutateAsync: updateProfession, isPending: isUpdatingProfession } = useUpdateProfession();
  const { mutateAsync: deleteProfession, isPending: isDeletingProfession } = useDeleteProfession();

  const handleCreateProfession: MRT_TableOptions<IProfession>['onCreatingRowSave'] = async ({
    values,
    exitCreatingMode,
  }) => {
    const newValidationErrors = validateProfession(values);

    const isDuplicate = fetchedProfessions.some(
      (profession) => profession.keorId.toLowerCase() === values.keorId.toLowerCase()
    );

    if (isDuplicate) {
      notifications.show({
        title: 'Creation Failed',
        message: 'A profession with this Keor ID already exists. Please use a different Keor ID.',
        color: 'red',
      });
      setValidationErrors({
        ...validationErrors,
        keorId: 'A profession with this Keor ID already exists.',
      });
      return;
    }

    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }

    setValidationErrors({});
    await createProfession(values as ProfessionFormData);
    exitCreatingMode();
  };

  const handleSaveProfession: MRT_TableOptions<IProfession>['onEditingRowSave'] = async ({
    values,
    row,
    table,
  }) => {
    const newValidationError = validateProfession(values);
    if (Object.values(newValidationError).some((error) => error)) {
      setValidationErrors(newValidationError);
      return;
    }
    setValidationErrors({});

    const oldValues = row.original as IProfession;
    await updateProfession({ newValues: values, oldValues });
    table.setEditingRow(null);
  };

  const openDeleteConfirmModal = (row: MRT_Row<IProfession>) =>
    modals.openConfirmModal({
      title: 'Are you sure you want to delete this profession?',
      children: (
        <Text>
          Are you sure you want to delete {row.original.keorId}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteProfession(row.original.id),
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedProfessions,
    createDisplayMode: 'modal',
    editDisplayMode: 'modal',
    enableEditing: true,
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingProfessionsError
      ? {
          color: 'red',
          children: 'Error loading data',
        }
      : undefined,
    mantineTableContainerProps: {
      style: {
        minHeight: '500px',
      },
    },
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateProfession,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveProfession,
    renderCreateRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Create New Profession</Title>
        {internalEditComponents}
        <Flex justify="flex-end" mt="xl">
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </Flex>
      </Stack>
    ),
    renderEditRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Edit Profession</Title>
        {internalEditComponents}
        <Flex justify="flex-end" mt="xl">
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </Flex>
      </Stack>
    ),
    renderRowActions: ({ row, table }) => (
      <Flex gap="md">
        <Tooltip label="Edit">
          <ActionIcon radius="md" onClick={() => table.setEditingRow(row)}>
            <IconEdit />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon color="red" radius="md" onClick={() => openDeleteConfirmModal(row)}>
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        variant="outline"
        radius="md"
        onClick={() => {
          table.setCreatingRow(true);
        }}
      >
        Create New Entry
      </Button>
    ),
    state: {
      isLoading: isLoadingProfessions,
      isSaving: isCreatingProfession || isUpdatingProfession || isDeletingProfession,
      showAlertBanner: isLoadingProfessionsError,
      showProgressBars: isFetchingProfessions,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateProfession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (professionData: ProfessionFormData) => {
      return await api.Professions.createProfession(professionData);
    },
    onSuccess: (createdProfession) => {
      notifications.show({
        title: 'Success!',
        message: `${createdProfession.keorId} created successfully.`,
        color: 'teal',
      });
      queryClient.setQueryData(
        ['professions'],
        (prevProfessions: any) => [...prevProfessions, createdProfession] as IProfession[]
      );
    },
  });
}

function useGetProfessions() {
  return useQuery<IProfession[]>({
    queryKey: ['professions'],
    queryFn: async () => {
      const response = await api.Professions.getAllProfessions();
      return response.data;
    },
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
    onMutate: async (updatedProfessionInfo) => {
      await queryClient.cancelQueries({ queryKey: ['professions'] });
      const previousProfessions = queryClient.getQueryData(['professions']);
      queryClient.setQueryData(['professions'], (prevProfessions: any) =>
        prevProfessions?.map((prevProfession: IProfession) =>
          prevProfession.id === updatedProfessionInfo.newValues.id
            ? updatedProfessionInfo.newValues
            : prevProfession
        )
      );
      return { previousProfessions };
    },
    onError: (err, updatedProfessionInfo, context) => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update profession. Please try again.',
        color: 'red',
      });
      queryClient.setQueryData(['professions'], context?.previousProfessions);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onSuccess: (updatedProfession) => {
      notifications.show({
        title: 'Success!',
        message: `${updatedProfession.keorId} updated successfully.`,
        color: 'teal',
      });
    },
  });
}

function useDeleteProfession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (professionId: number) => {
      await api.Professions.deleteProfession(professionId);
      return professionId;
    },
    onMutate: (professionId: number) => {
      queryClient.setQueryData(['professions'], (prevProfessions: any) =>
        prevProfessions?.filter((profession: IProfession) => profession.id !== professionId)
      );
    },
    onSuccess: (deletedProfessionId) => {
      notifications.show({
        title: 'Success!',
        message: `Profession with ID ${deletedProfessionId} deleted successfully.`,
        color: 'teal',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
  });
}

const queryClient = new QueryClient();

const ProfessionPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Title order={2}>Professions</Title>
          <ProfessionTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  );
};

export default ProfessionPage;

const validateRequired = (value: string) => !!value.length;

function validateProfession(profession: IProfession) {
  return {
    keorId: !validateRequired(profession.keorId) ? 'Keor ID is required!' : '',
    professionName: !validateRequired(profession.professionName) ? 'Profession Name is required!' : '',
  }
}