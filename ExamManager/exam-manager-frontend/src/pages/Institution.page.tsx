import { useMemo, useState } from 'react';
import { IconDownload, IconEdit, IconTrash } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef, type MRT_Row } from 'mantine-react-table';
import { ActionIcon, Button, Flex, Group, MantineProvider, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import { IInstitution, InstitutionFormData } from '@/interfaces/IInstitution';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';

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
  const newComparableData = { ...newData, zipCode: Number(newData.zipCode) };

  for (const key in newComparableData) {
    if (
      Object.hasOwn(newComparableData, key) &&
      (newComparableData as any)[key] !== (oldData as any)[key]
    ) {
      patch.push({
        op: 'replace',
        path: `/${key}`,
        value: (newComparableData as any)[key],
      });
    }
  }
  return patch;
};

const CreateInstitutionForm = () => {
  const { data: fetchedInstitutions = [] } = useGetInstitutions();
  const { mutateAsync: createInstitution } = useCreateInstitution();

  const form = useForm<InstitutionFormData>({
    initialValues: {
      name: '',
      educationalId: '',
      zipCode: 0,
      town: '',
      street: '',
      number: '',
      floor: '',
      door: '',
    },
    validate: validateInstitution,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedInstitutions.some(
      (inst) => inst.educationalId.toLowerCase() === values.educationalId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError(
        'educationalId',
        'An institution with this educational ID already exists.'
      );
      return;
    }
    await createInstitution(values);
    modals.close('create-institution');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Name" {...form.getInputProps('name')} required />
        <TextInput label="Educational ID" {...form.getInputProps('educationalId')} required />
        <Group grow>
          <TextInput label="Zip Code" type="number" {...form.getInputProps('zipCode')} required />
          <TextInput label="Town" {...form.getInputProps('town')} required />
        </Group>
        <Group grow>
          <TextInput label="Street" {...form.getInputProps('street')} required />
          <TextInput label="Number" {...form.getInputProps('number')} required />
        </Group>
        <Group grow>
          <TextInput label="Floor" {...form.getInputProps('floor')} />
          <TextInput label="Door" {...form.getInputProps('door')} />
        </Group>
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant="outline" radius="md" mr="xs">
            Create
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditInstitutionForm = ({ initialInstitution }: { initialInstitution: IInstitution }) => {
  const { data: fetchedInstitutions = [] } = useGetInstitutions();
  const { mutateAsync: updateInstitution } = useUpdateInstitution();

  const form = useForm<InstitutionFormData>({
    initialValues: {
      name: initialInstitution.name,
      educationalId: initialInstitution.educationalId,
      zipCode: initialInstitution.zipCode,
      town: initialInstitution.town,
      street: initialInstitution.street,
      number: initialInstitution.number,
      floor: initialInstitution.floor || '',
      door: initialInstitution.door || '',
    },
    validate: validateInstitution,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedInstitutions.some(
      (inst) =>
        inst.id !== initialInstitution.id &&
        inst.educationalId.toLowerCase() === values.educationalId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError(
        'educationalId',
        'An institution with this educational ID already exists.'
      );
      return;
    }
    const newValues: IInstitution = {
      ...initialInstitution,
      ...values,
      zipCode: Number(values.zipCode),
    };
    await updateInstitution({ newValues, oldValues: initialInstitution });
    modals.close('edit-institution');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Name" {...form.getInputProps('name')} required />
        <TextInput label="Educational ID" {...form.getInputProps('educationalId')} required />
        <Group grow>
          <TextInput label="Zip Code" type="number" {...form.getInputProps('zipCode')} required />
          <TextInput label="Town" {...form.getInputProps('town')} required />
        </Group>
        <Group grow>
          <TextInput label="Street" {...form.getInputProps('street')} required />
          <TextInput label="Number" {...form.getInputProps('number')} required />
        </Group>
        <Group grow>
          <TextInput label="Floor" {...form.getInputProps('floor')} />
          <TextInput label="Door" {...form.getInputProps('door')} />
        </Group>
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant="outline" radius="md" mr="xs">
            Save
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const DeleteInstitutionModal = ({ institution }: { institution: IInstitution }) => {
  const { mutateAsync: deleteInstitution } = useDeleteInstitution();

  const handleDelete = async () => {
    await deleteInstitution(institution.id);
    modals.close('delete-institution');
  };

  return (
    <Stack>
      <Text>
        Are you sure you want to delete "{institution.name}"? This action cannot be undone.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button color="red" variant="outline" radius="md" mr="xs" onClick={handleDelete}>
          Delete
        </Button>
      </Flex>
    </Stack>
  );
};

const InstitutionTable = () => {
  const {
    data: fetchedInstitutions = [],
    isError: isLoadingInstitutionsError,
    isFetching: isFetchingInstitutions,
    isLoading: isLoadingInstitutions,
  } = useGetInstitutions();
  const { mutateAsync: deleteInstitution, isPending: isDeletingInstitution } =
    useDeleteInstitution();
  const [isExporting, setIsExporting] = useState(false);

  const columns = useMemo<MRT_ColumnDef<IInstitution>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'educationalId', header: 'Educational ID' },
      { accessorKey: 'zipCode', header: 'Zip Code' },
      { accessorKey: 'town', header: 'Town' },
      { accessorKey: 'street', header: 'Street' },
      { accessorKey: 'number', header: 'Number' },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-institution',
      title: <Title order={3}>Create New Institution</Title>,
      children: <CreateInstitutionForm />,
    });

  const openEditModal = (institution: IInstitution) =>
    modals.open({
      id: 'edit-institution',
      title: <Title order={3}>Edit Institution</Title>,
      children: <EditInstitutionForm initialInstitution={institution} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IInstitution>) =>
    modals.open({
      id: 'delete-institution',
      title: <Title order={3}>Delete Institution</Title>,
      children: <DeleteInstitutionModal institution={row.original} />,
    });

  const handleExportData = async (table: any) => {
    setIsExporting(true);
    try {
      const filteredRows = table.getPrePaginationRowModel().rows;
      const ids = filteredRows.map((row: any) => row.original.id);

      if (ids.length === 0) {
        notifications.show({ title: 'Info', message: 'No data to export', color: 'blue' });
        return;
      }

      const response = await api.Exports.exportInstitutionsFiltered(ids);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Institutions_Filtered_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Error', message: 'Export failed', color: 'red' });
    } finally {
      setIsExporting(false);
    }
  };

  const table = useMantineReactTable({
    columns,
    data: fetchedInstitutions,
    enableEditing: false,
    enableRowActions: true,
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingInstitutionsError
      ? { color: 'red', children: 'Error loading data' }
      : undefined,
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    positionActionsColumn: 'first',
    renderRowActions: ({ row }) => (
      <Flex gap="md">
        <Tooltip label="Edit">
          <ActionIcon
            color="blue"
            variant="outline"
            radius="md"
            onClick={() => openEditModal(row.original)}
          >
            <IconEdit />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon
            color="red"
            variant="outline"
            radius="md"
            onClick={() => openDeleteConfirmModal(row)}
          >
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    renderTopToolbarCustomActions: () => (
      <Flex gap="md">
        <Button variant="outline" radius="md" onClick={openCreateModal}>
          Create New Entry
        </Button>

        <Button
          variant="outline"
          color="green"
          radius="md"
          leftSection={<IconDownload size={16} />}
          loading={isExporting}
          onClick={() => handleExportData(table)}
        >
          Export Filtered
        </Button>
      </Flex>
    ),
    state: {
      isLoading: isLoadingInstitutions,
      isSaving: isDeletingInstitution,
      showAlertBanner: isLoadingInstitutionsError,
      showProgressBars: isFetchingInstitutions,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (institutionData: InstitutionFormData) =>
      api.Institutions.createInstitution(institutionData),
    onSuccess: (createdInstitution) => {
      notifications.show({
        title: 'Success!',
        message: `Institution "${createdInstitution.name}" created successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create institution. Please try again.',
        color: 'red',
      });
    },
  });
}

function useGetInstitutions() {
  return useQuery<IInstitution[]>({
    queryKey: ['institutions'],
    queryFn: () => api.Institutions.getAllInstitutions().then((res) => res.data),
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
    onSuccess: (updatedInstitution) => {
      notifications.show({
        title: 'Success!',
        message: `Institution "${updatedInstitution.name}" updated successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: (_err, _vars) => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update institution. Please try again.',
        color: 'red',
      });
    },
  });
}

function useDeleteInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (institutionId: number) =>
      api.Institutions.deleteInstitution(institutionId).then(() => institutionId),
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: `Institution successfully deleted.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: (_err, _id) => {
      notifications.show({
        title: 'Deletion Failed',
        message: 'Could not delete institution. Please try again.',
        color: 'red',
      });
    },
  });
}

const queryClient = new QueryClient();

const InstitutionPage = () => (
  <MantineProvider>
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Title order={2}>Institutions</Title>
          <InstitutionTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default InstitutionPage;

const validateRequired = (value: string | number) => {
  if (typeof value === 'string') {
    return !!value.trim().length;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  return false;
};

function validateInstitution(institution: InstitutionFormData) {
  const errors: Record<string, string> = {};
  if (!validateRequired(institution.name)) {
    errors.name = 'Name is required';
  }
  if (!validateRequired(institution.educationalId)) {
    errors.educationalId = 'Educational ID is required';
  }
  if (!validateRequired(institution.zipCode)) {
    errors.zipCode = 'Zip Code is required';
  }
  if (!validateRequired(institution.town)) {
    errors.town = 'Town is required';
  }
  if (!validateRequired(institution.street)) {
    errors.street = 'Street is required';
  }
  if (!validateRequired(institution.number)) {
    errors.number = 'Number is required';
  }

  return errors;
}
