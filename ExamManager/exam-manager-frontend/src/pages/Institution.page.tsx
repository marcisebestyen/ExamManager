import { useMemo, useState } from 'react';
import { IconBuildingCommunity, IconCircleKey, IconDownload, IconEdit, IconHash, IconId, IconMapPin, IconNumber123, IconPlus, IconRoad, IconStairs, IconTrash, IconUpload } from '@tabler/icons-react';
import { keepPreviousData, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, MRT_ColumnDef, MRT_Row, useMantineReactTable } from 'mantine-react-table';
import { ActionIcon, Button, Flex, Group, MantineProvider, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import { IInstitution, InstitutionFormData } from '@/interfaces/IInstitution';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
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

const validateRequired = (value: string | number) => {
  if (typeof value === 'string') {return !!value.trim().length;}
  if (typeof value === 'number') {return value > 0;}
  return false;
};

function validateInstitution(institution: InstitutionFormData) {
  const errors: Record<string, string> = {};
  if (!validateRequired(institution.name)) {errors.name = 'Name is required';}
  if (!validateRequired(institution.educationalId))
    {errors.educationalId = 'Educational ID is required';}
  if (!validateRequired(institution.zipCode)) {errors.zipCode = 'Zip Code is required';}
  if (!validateRequired(institution.town)) {errors.town = 'Town is required';}
  if (!validateRequired(institution.street)) {errors.street = 'Street is required';}
  if (!validateRequired(institution.number)) {errors.number = 'Number is required';}
  return errors;
}

function IconDoorEnter(props: {
  label: string;
  leftSection: React.JSX.Element;
  onChange: any;
  value: any;
  defaultValue: any;
  checked: any;
  defaultChecked: any;
  error: any;
  onFocus: any;
  onBlur: any;
}) {
  return null;
}

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
        <TextInput
          label="Name"
          leftSection={<IconBuildingCommunity size={16} />}
          {...form.getInputProps('name')}
          required
        />
        <TextInput
          label="Educational ID"
          leftSection={<IconId size={16} />}
          {...form.getInputProps('educationalId')}
          required
        />
        <Group grow>
          <TextInput
            label="Zip Code"
            type="number"
            leftSection={<IconHash size={16} />}
            {...form.getInputProps('zipCode')}
            required
          />
          <TextInput
            label="Town"
            leftSection={<IconMapPin size={16} />}
            {...form.getInputProps('town')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label="Street"
            leftSection={<IconRoad size={16} />}
            {...form.getInputProps('street')}
            required />
          <TextInput
            label="Number"
            leftSection={<IconNumber123 size={16} />}
            {...form.getInputProps('number')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label="Floor"
            leftSection={<IconStairs size={16} />}
            {...form.getInputProps('floor')}
          />
          <TextInput
            label="Door"
            leftSection={<IconCircleKey size={16} />}
            {...form.getInputProps('door')}
          />
        </Group>
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" variant="filled" radius="md">
            Create Institution
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
        <TextInput
          label="Name"
          leftSection={<IconBuildingCommunity size={16} />}
          {...form.getInputProps('name')}
          required
        />
        <TextInput
          label="Educational ID"
          leftSection={<IconId size={16} />}
          {...form.getInputProps('educationalId')}
          required
        />
        <Group grow>
          <TextInput
            label="Zip Code"
            type="number"
            leftSection={<IconHash size={16} />}
            {...form.getInputProps('zipCode')}
            required
          />
          <TextInput
            label="Town"
            leftSection={<IconMapPin size={16} />}
            {...form.getInputProps('town')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label="Street"
            leftSection={<IconRoad size={16} />}
            {...form.getInputProps('street')}
            required
          />
          <TextInput
            label="Number"
            leftSection={<IconNumber123 size={16} />}
            {...form.getInputProps('number')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label="Floor"
            leftSection={<IconStairs size={16} />}
            {...form.getInputProps('floor')}
          />
          <TextInput
            label="Door"
            leftSection={<IconCircleKey size={16} />}
            {...form.getInputProps('door')}
          />
        </Group>
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

const DeleteInstitutionModal = ({ institution }: { institution: IInstitution }) => {
  const { mutateAsync: deleteInstitution } = useDeleteInstitution();

  const handleDelete = async () => {
    await deleteInstitution(institution.id);
    modals.close('delete-institution');
  };

  return (
    <Stack>
      <Text size="sm">
        Are you sure you want to delete <b>{institution.name}</b>? This action cannot be undone.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          Cancel
        </Button>
        <Button color="red" variant="filled" onClick={handleDelete}>
          Delete Institution
        </Button>
      </Flex>
    </Stack>
  );
};

const InstitutionTable = () => {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const {
    data: fetchedInstitutions = [],
    isError: isLoadingInstitutionsError,
    isFetching: isFetchingInstitutions,
    isLoading: isLoadingInstitutions,
  } = useGetInstitutions();

  const { isPending: isDeletingInstitution } = useDeleteInstitution();

  const columns = useMemo<MRT_ColumnDef<IInstitution>[]>(
    () => [
      { accessorKey: 'name', header: 'Name', size: 250 },
      { accessorKey: 'educationalId', header: 'Educational ID', size: 150 },
      { accessorKey: 'zipCode', header: 'Zip Code', size: 100 },
      { accessorKey: 'town', header: 'Town', size: 150 },
      { accessorKey: 'street', header: 'Street', size: 150 },
      { accessorKey: 'number', header: 'Number', size: 80 },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-institution',
      title: <Text fw={700}>Create New Institution</Text>,
      children: <CreateInstitutionForm />,
    });

  const openEditModal = (institution: IInstitution) =>
    modals.open({
      id: 'edit-institution',
      title: <Text fw={700}>Edit Institution</Text>,
      children: <EditInstitutionForm initialInstitution={institution} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IInstitution>) =>
    modals.open({
      id: 'delete-institution',
      title: (
        <Text fw={700} c="red">
          Delete Institution
        </Text>
      ),
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
    autoResetPageIndex: false,
    onPaginationChange: setPagination,
    state: {
      isLoading: isLoadingInstitutions,
      isSaving: isDeletingInstitution,
      showAlertBanner: isLoadingInstitutionsError,
      showProgressBars: isFetchingInstitutions,
      pagination,
    },
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    mantineToolbarAlertBannerProps: isLoadingInstitutionsError
      ? { color: 'red', children: 'Error loading data' }
      : undefined,
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    positionActionsColumn: 'first',
    initialState: { showGlobalFilter: true, density: 'xs' },
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
        entityName="Institutions"
        onDownloadTemplate={api.Imports.downloadTemplateInstitutions}
        onImport={api.Imports.importInstitutions}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['institutions'] })}
      />
    </>
  );
};

function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (institutionData: InstitutionFormData) =>
      api.Institutions.createInstitution(institutionData),
    onSuccess: (created) => {
      notifications.show({
        title: 'Success!',
        message: `Institution "${created.name}" created successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create institution.',
        color: 'red',
      });
    },
  });
}

function useGetInstitutions() {
  return useQuery<IInstitution[]>({
    queryKey: ['institutions'],
    queryFn: () => api.Institutions.getAllInstitutions().then((res) => res.data),
    placeholderData: keepPreviousData,
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
    onSuccess: (updated) => {
      notifications.show({
        title: 'Success!',
        message: `Institution "${updated.name}" updated successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: () => {
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
    mutationFn: (id: number) => api.Institutions.deleteInstitution(id).then(() => id),
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: `Institution successfully deleted.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: () => {
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
          <Stack mb="lg">
            <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
              Institutions
            </Title>
          </Stack>
          <InstitutionTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default InstitutionPage;
