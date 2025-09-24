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
import { IInstitution, InstitutionFormData } from '@/interfaces/IInstitution';
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
  oldData: IInstitution,
  newData: IInstitution
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

const InstitutionTable = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({});

  const columns = useMemo<MRT_ColumnDef<IInstitution>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableEditing: false,
        enableCreating: false,
        size: 80,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.name,
          onFocus: () => setValidationErrors({ ...validationErrors, name: undefined }),
        },
      },
      {
        accessorKey: 'educationalId',
        header: 'Educational ID',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.educationalId,
          onFocus: () => setValidationErrors({ ...validationErrors, educationalId: undefined }),
        },
      },
      {
        accessorKey: 'zipCode',
        header: 'Zip Code',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.zipCode,
          onFocus: () => setValidationErrors({ ...validationErrors, zipCode: undefined }),
        },
      },
      {
        accessorKey: 'town',
        header: 'Town',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.town,
          onFocus: () => setValidationErrors({ ...validationErrors, town: undefined }),
        },
      },
      {
        accessorKey: 'street',
        header: 'Street',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.street,
          onFocus: () => setValidationErrors({ ...validationErrors, street: undefined }),
        },
      },
      {
        accessorKey: 'number',
        header: 'Number',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.number,
          onFocus: () => setValidationErrors({ ...validationErrors, number: undefined }),
        },
      },
      {
        accessorKey: 'floor',
        header: 'Floor',
        mantineEditTextInputProps: {
          errors: validationErrors?.floor,
          onFocus: () => setValidationErrors({ ...validationErrors, floor: undefined }),
        },
      },
      {
        accessorKey: 'door',
        header: 'Door',
        mantineEditTextInputProps: {
          errors: validationErrors?.door,
          onFocus: () => setValidationErrors({ ...validationErrors, door: undefined }),
        },
      },
    ],
    [validationErrors]
  );

  const { mutateAsync: createInstitution, isPending: isCreatingInstitution } =
    useCreateInstitution();
  const {
    data: fetchedInstitutions = [],
    isError: isLoadingInstitutionsError,
    isFetching: isFetchingInstitutions,
    isLoading: isLoadingInstitutions,
  } = useGetInstitutions();
  const { mutateAsync: updateInstitution, isPending: isUpdatingInstitution } =
    useUpdateInstitution();
  const { mutateAsync: deleteInstitution, isPending: isDeletingInstitution } =
    useDeleteInstitution();

  const handleCreateInstitution: MRT_TableOptions<IInstitution>['onCreatingRowSave'] = async ({
    values,
    exitCreatingMode,
  }) => {
    const newValidationErrors = validateInstitution(values);

    const isDuplicate = fetchedInstitutions.some(
      (institution) =>
        institution.educationalId.toLowerCase() === values.educationalId.toLowerCase()
    );

    if (isDuplicate) {
      notifications.show({
        title: 'Creation Failed',
        message:
          'An institution with this educational ID already exists. Please use a different educational ID.',
        color: 'red',
      });
      setValidationErrors({
        ...validationErrors,
        educationalId: 'An institution with this educational ID already exists.',
      });
      return;
    }

    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }

    setValidationErrors({});
    await createInstitution(values as InstitutionFormData);
    exitCreatingMode();
  };

  const handleSaveInstitution: MRT_TableOptions<IInstitution>['onEditingRowSave'] = async ({
    values,
    row,
    table,
  }) => {
    const newValidationErrors = validateInstitution(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});

    const oldValues = row.original as IInstitution;
    await updateInstitution({ newValues: values, oldValues });
    table.setEditingRow(null);
  };

  const openDeleteConfirmModal = (row: MRT_Row<IInstitution>) =>
    modals.openConfirmModal({
      title: 'Are you sure you want to delete this institution?',
      children: (
        <Text>
          Are you sure you want to delete {row.original.educationalId}? This action cannot be
          undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteInstitution(row.original.id),
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedInstitutions,
    createDisplayMode: 'modal',
    editDisplayMode: 'modal',
    enableEditing: true,
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingInstitutionsError
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
    onCreatingRowSave: handleCreateInstitution,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveInstitution,
    renderCreateRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Create New Institution</Title>
        {internalEditComponents}
        <Flex justify="flex-end" mt="xl">
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </Flex>
      </Stack>
    ),
    renderEditRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Edit Institution</Title>
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
      isLoading: isLoadingInstitutions,
      isSaving: isCreatingInstitution || isUpdatingInstitution || isDeletingInstitution,
      showAlertBanner: isLoadingInstitutionsError,
      showProgressBars: isFetchingInstitutions,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (institutionData: InstitutionFormData) => {
      return await api.Institutions.createInstitution(institutionData);
    },
    onSuccess: (createdInstitution) => {
      notifications.show({
        title: 'Success!',
        message: `${createdInstitution.educationalId} created successfully.`,
        color: 'teal',
      });
      queryClient.setQueryData(
        ['institutions'],
        (prevInstitution: any) => [...prevInstitution, createdInstitution] as IInstitution[]
      );
    },
  });
}

function useGetInstitutions() {
  return useQuery<IInstitution[]>({
    queryKey: ['institutions'],
    queryFn: async () => {
      const response = await api.Institutions.getAllInstitutions();
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
}

function useUpdateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newValues,
      oldValues,
    }: {
      newValues: IInstitution;
      oldValues: IInstitution;
    }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.Institutions.updateInstitution(newValues.id, patchDocument);
      }
      return newValues;
    },
    onMutate: async (updatedInstitutionInfo) => {
      await queryClient.cancelQueries({ queryKey: ['institutions'] });
      const previousInstitutions = queryClient.getQueryData(['institutions']);
      queryClient.setQueryData(['institutions'], (prevInstitutions: any) =>
        prevInstitutions?.map((prevInstitution: IInstitution) =>
          prevInstitution.id === updatedInstitutionInfo.newValues.id
            ? updatedInstitutionInfo.newValues
            : prevInstitution
        )
      );
      return { previousInstitutions };
    },
    onError: (err, updatedInstitutionInfo, context) => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update institution. Please try again.',
        color: 'red',
      });
      queryClient.setQueryData(['institutions'], context?.previousInstitutions);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onSuccess: (updatedInstitution) => {
      notifications.show({
        title: 'Success!',
        message: `${updatedInstitution.educationalId} updated successfully.`,
        color: 'teal',
      });
    },
  });
}

function useDeleteInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (institutionId: number) => {
      await api.Institutions.deleteInstitution(institutionId);
      return institutionId;
    },
    onMutate: (institutionId: number) => {
      queryClient.setQueryData(['institutions'], (prevInstitutions: any) =>
        prevInstitutions?.filter((institution: IInstitution) => institution.id !== institutionId)
      );
    },
    onSuccess: (deletedInstitutionId) => {
      notifications.show({
        title: 'Success!',
        message: `Institution with ID ${deletedInstitutionId} successfully deleted.`,
        color: 'teal',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}

const queryClient = new QueryClient();

const InstitutionPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Title order={2}>Institutions</Title>
          <InstitutionTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  );
};

export default InstitutionPage;

const validateRequired = (value: string) => !!value.length;

function validateInstitution(institution: IInstitution) {
  return {
    name: !validateRequired(institution.name) ? 'Name is required' : '',
    educationalId: !validateRequired(institution.educationalId) ? 'Educational ID is required' : '',
    zipCode: !validateRequired(String(institution.zipCode)) ? 'Zip Code is required' : '',
    town: !validateRequired(institution.town) ? 'Town is required' : '',
    street: !validateRequired(institution.street) ? 'Street is required' : '',
    number: !validateRequired(institution.number) ? 'Number is required' : '',
  };
}
