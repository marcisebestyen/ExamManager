import { useMemo, useState } from 'react';
import {
  IconBuildingCommunity,
  IconCircleKey,
  IconDownload,
  IconEdit,
  IconHash,
  IconId,
  IconMapPin,
  IconNumber123,
  IconPlus,
  IconRoad,
  IconStairs,
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
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Button,
  Flex,
  Group,
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
  if (typeof value === 'string') {
    return !!value.trim().length;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  return false;
};

function validateInstitution(institution: InstitutionFormData, t: any) {
  const errors: Record<string, string> = {};
  if (!validateRequired(institution.name)) {
    errors.name = t('institutions.validation.name');
  }
  if (!validateRequired(institution.educationalId)) {
    errors.educationalId = t('institutions.validation.educationalId');
  }
  if (!validateRequired(institution.zipCode)) {
    errors.zipCode = t('institutions.validation.zipCode');
  }
  if (!validateRequired(institution.town)) {
    errors.town = t('institutions.validation.town');
  }
  if (!validateRequired(institution.street)) {
    errors.street = t('institutions.validation.street');
  }
  if (!validateRequired(institution.number)) {
    errors.number = t('institutions.validation.number');
  }
  return errors;
}

const CreateInstitutionForm = () => {
  const { t } = useTranslation();
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
    validate: (values) => validateInstitution(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedInstitutions.some(
      (inst) => inst.educationalId.toLowerCase() === values.educationalId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('educationalId', t('institutions.form.duplicateId'));
      return;
    }
    await createInstitution(values);
    modals.close('create-institution');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t('institutions.table.name')}
          leftSection={<IconBuildingCommunity size={16} />}
          {...form.getInputProps('name')}
          required
        />
        <TextInput
          label={t('institutions.table.educationalId')}
          leftSection={<IconId size={16} />}
          {...form.getInputProps('educationalId')}
          required
        />
        <Group grow>
          <TextInput
            label={t('institutions.table.zipCode')}
            type="number"
            leftSection={<IconHash size={16} />}
            {...form.getInputProps('zipCode')}
            required
          />
          <TextInput
            label={t('institutions.table.town')}
            leftSection={<IconMapPin size={16} />}
            {...form.getInputProps('town')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label={t('institutions.table.street')}
            leftSection={<IconRoad size={16} />}
            {...form.getInputProps('street')}
            required
          />
          <TextInput
            label={t('institutions.table.number')}
            leftSection={<IconNumber123 size={16} />}
            {...form.getInputProps('number')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label={t('institutions.form.floor')}
            leftSection={<IconStairs size={16} />}
            {...form.getInputProps('floor')}
          />
          <TextInput
            label={t('institutions.form.door')}
            leftSection={<IconCircleKey size={16} />}
            {...form.getInputProps('door')}
          />
        </Group>
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            {t('exams.actions.cancel')}
          </Button>
          <Button type="submit" variant="filled" radius="md">
            {t('exams.actions.create')}
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditInstitutionForm = ({ initialInstitution }: { initialInstitution: IInstitution }) => {
  const { t } = useTranslation();
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
    validate: (values) => validateInstitution(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedInstitutions.some(
      (inst) =>
        inst.id !== initialInstitution.id &&
        inst.educationalId.toLowerCase() === values.educationalId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('educationalId', t('institutions.form.duplicateId'));
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
          label={t('institutions.table.name')}
          leftSection={<IconBuildingCommunity size={16} />}
          {...form.getInputProps('name')}
          required
        />
        <TextInput
          label={t('institutions.table.educationalId')}
          leftSection={<IconId size={16} />}
          {...form.getInputProps('educationalId')}
          required
        />
        <Group grow>
          <TextInput
            label={t('institutions.table.zipCode')}
            type="number"
            leftSection={<IconHash size={16} />}
            {...form.getInputProps('zipCode')}
            required
          />
          <TextInput
            label={t('institutions.table.town')}
            leftSection={<IconMapPin size={16} />}
            {...form.getInputProps('town')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label={t('institutions.table.street')}
            leftSection={<IconRoad size={16} />}
            {...form.getInputProps('street')}
            required
          />
          <TextInput
            label={t('institutions.table.number')}
            leftSection={<IconNumber123 size={16} />}
            {...form.getInputProps('number')}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label={t('institutions.form.floor')}
            leftSection={<IconStairs size={16} />}
            {...form.getInputProps('floor')}
          />
          <TextInput
            label={t('institutions.form.door')}
            leftSection={<IconCircleKey size={16} />}
            {...form.getInputProps('door')}
          />
        </Group>
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            {t('exams.actions.cancel')}
          </Button>
          <Button type="submit" variant="filled" radius="md">
            {t('exams.actions.save')}
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const DeleteInstitutionModal = ({ institution }: { institution: IInstitution }) => {
  const { t } = useTranslation();
  const { mutateAsync: deleteInstitution } = useDeleteInstitution();

  const handleDelete = async () => {
    await deleteInstitution(institution.id);
    modals.close('delete-institution');
  };

  return (
    <Stack>
      <Text size="sm">{t('exams.deleteConfirm', { name: institution.name })}</Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          {t('exams.actions.cancel')}
        </Button>
        <Button color="red" variant="filled" onClick={handleDelete}>
          {t('exams.actions.delete')}
        </Button>
      </Flex>
    </Stack>
  );
};

const InstitutionTable = () => {
  const { t } = useTranslation();
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
      { accessorKey: 'name', header: t('institutions.table.name'), size: 250 },
      { accessorKey: 'educationalId', header: t('institutions.table.educationalId'), size: 150 },
      { accessorKey: 'zipCode', header: t('institutions.table.zipCode'), size: 100 },
      { accessorKey: 'town', header: t('institutions.table.town'), size: 150 },
      { accessorKey: 'street', header: t('institutions.table.street'), size: 150 },
      { accessorKey: 'number', header: t('institutions.table.number'), size: 80 },
      { accessorKey: 'floor', header: t('institutions.table.floor'), size: 40 },
      { accessorKey: 'door', header: t('institutions.table.door'), size: 40 },
    ],
    [t]
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-institution',
      title: <Text fw={700}>{t('institutions.form.createTitle')}</Text>,
      children: <CreateInstitutionForm />,
    });

  const openEditModal = (institution: IInstitution) =>
    modals.open({
      id: 'edit-institution',
      title: <Text fw={700}>{t('institutions.form.editTitle')}</Text>,
      children: <EditInstitutionForm initialInstitution={institution} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IInstitution>) =>
    modals.open({
      id: 'delete-institution',
      title: (
        <Text fw={700} c="red">
          {t('institutions.form.deleteTitle')}
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
        notifications.show({
          title: 'Info',
          message: t('examiners.notifications.exportNoData'),
          color: 'blue',
        });
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
      notifications.show({
        title: t('common.error'),
        message: t('exams.notifications.exportFailed'),
        color: 'red',
      });
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
    localization: {
      actions: t('exams.mrt.actions'),
      showHideFilters: t('exams.mrt.showHideFilters'),
      showHideColumns: t('exams.mrt.showHideColumns'),
      clearFilter: t('exams.mrt.clearFilter'),
      clearSearch: t('exams.mrt.clearSearch'),
      search: t('exams.mrt.search'),
      rowsPerPage: t('exams.mrt.rowsPerPage'),
      of: t('exams.mrt.of'),
    },
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
        <Tooltip label={t('exams.actions.edit')}>
          <ActionIcon color="blue" variant="subtle" onClick={() => openEditModal(row.original)}>
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('exams.actions.delete')}>
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
          {t('exams.actions.create')}
        </Button>
        <Button
          variant="filled"
          color="violet"
          radius="md"
          leftSection={<IconUpload size={16} />}
          onClick={openImport}
        >
          {t('exams.actions.import')}
        </Button>
        <Button
          variant="filled"
          color="green"
          radius="md"
          leftSection={<IconDownload size={16} />}
          loading={isExporting}
          onClick={() => handleExportData(table)}
        >
          {t('exams.actions.export')}
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
        entityName={t('institutions.title')}
        onDownloadTemplate={api.Imports.downloadTemplateInstitutions}
        onImport={api.Imports.importInstitutions}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['institutions'] })}
      />
    </>
  );
};

function useCreateInstitution() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (institutionData: InstitutionFormData) =>
      api.Institutions.createInstitution(institutionData),
    onSuccess: (created) => {
      notifications.show({
        title: t('common.success'),
        message: t('institutions.notifications.createSuccess', { name: created.name }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.message || t('common.error'),
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
  const { t } = useTranslation();
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
        title: t('common.success'),
        message: t('institutions.notifications.updateSuccess', { name: updated.name }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: () => {
      notifications.show({
        title: t('common.error'),
        message: t('common.error'),
        color: 'red',
      });
    },
  });
}

function useDeleteInstitution() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Institutions.deleteInstitution(id).then(() => id),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('institutions.notifications.deleteSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onError: () => {
      notifications.show({
        title: t('common.error'),
        message: t('common.error'),
        color: 'red',
      });
    },
  });
}

const rootQueryClient = new QueryClient();

const InstitutionPage = () => {
  const { t } = useTranslation();
  return (
    <MantineProvider>
      <QueryClientProvider client={rootQueryClient}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                {t('institutions.title')}
              </Title>
            </Stack>
            <InstitutionTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default InstitutionPage;
