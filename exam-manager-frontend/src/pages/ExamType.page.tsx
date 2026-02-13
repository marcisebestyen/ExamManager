import '@mantine/core/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo, useState } from 'react';
import {
  IconCategory,
  IconDownload,
  IconEdit,
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
  useMantineReactTable,
} from 'mantine-react-table';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Button,
  Flex,
  MantineProvider,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
import { Skeleton } from '../components/Skeleton';
import { ExamTypeFormData, IExamType } from '../interfaces/IExamType';

interface JsonPatchOperation {
  op: 'replace';
  path: string;
  value?: any;
}

const generatePatchDocument = (oldData: IExamType, newData: IExamType): JsonPatchOperation[] => {
  const patch: JsonPatchOperation[] = [];
  for (const key in newData) {
    if (Object.hasOwn(newData, key) && (newData as any)[key] !== (oldData as any)[key]) {
      patch.push({ op: 'replace', path: `/${key}`, value: (newData as any)[key] });
    }
  }
  return patch;
};

const validateRequired = (value: string) => !!value.trim().length;

function validateExamType(examType: ExamTypeFormData, t: any) {
  const errors: { typeName?: string } = {};
  if (!validateRequired(examType.typeName)) {
    errors.typeName = t('examTypes.validation.nameRequired');
  }
  return errors;
}

const CreateExamTypeForm = () => {
  const { t } = useTranslation();
  const { data: fetchedExamTypes = [] } = useGetExamTypes();
  const { mutateAsync: createExamType } = useCreateExamType();

  const form = useForm<ExamTypeFormData>({
    initialValues: { typeName: '', description: '' },
    validate: (values) => validateExamType(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExamTypes.some(
      (examType) => examType.typeName.toLowerCase() === values.typeName.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('typeName', t('examTypes.form.duplicate'));
      return;
    }
    await createExamType(values);
    modals.close('create-exam-type');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t('examTypes.form.nameLabel')}
          description={t('examTypes.form.nameDesc')}
          leftSection={<IconCategory size={16} />}
          {...form.getInputProps('typeName')}
          required
        />
        <Textarea
          label={t('examTypes.form.descriptionLabel')}
          description={t('examTypes.form.descriptionDesc')}
          {...form.getInputProps('description')}
          minRows={3}
          autosize
        />
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

const EditExamTypeForm = ({ initialExamType }: { initialExamType: IExamType }) => {
  const { t } = useTranslation();
  const { data: fetchedExamTypes = [] } = useGetExamTypes();
  const { mutateAsync: updateExamType } = useUpdateExamType();

  const form = useForm<ExamTypeFormData>({
    initialValues: {
      typeName: initialExamType.typeName,
      description: initialExamType.description,
    },
    validate: (values) => validateExamType(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExamTypes.some(
      (examType) =>
        examType.id !== initialExamType.id &&
        examType.typeName.toLowerCase() === values.typeName.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('typeName', t('examTypes.form.duplicate'));
      return;
    }
    const newValues: IExamType = { ...initialExamType, ...values };
    await updateExamType({ newValues, oldValues: initialExamType });
    modals.close('edit-exam-type');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t('examTypes.form.nameLabel')}
          leftSection={<IconCategory size={16} />}
          {...form.getInputProps('typeName')}
          required
        />
        <Textarea
          label={t('examTypes.form.descriptionLabel')}
          {...form.getInputProps('description')}
          minRows={3}
          autosize
        />
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

const DeleteExamTypeModal = ({ examType }: { examType: IExamType }) => {
  const { t } = useTranslation();
  const { mutateAsync: deleteExamType } = useDeleteExamType();

  return (
    <Stack>
      <Text size="sm">{t('exams.deleteConfirm', { name: examType.typeName })}</Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          {t('exams.actions.cancel')}
        </Button>
        <Button
          color="red"
          variant="filled"
          onClick={async () => {
            await deleteExamType(examType.id);
            modals.close('delete-exam-type');
          }}
        >
          {t('exams.actions.delete')}
        </Button>
      </Flex>
    </Stack>
  );
};

const ExamTypeTable = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: fetchedExamTypes = [],
    isError: isLoadingExamTypesError,
    isFetching: isFetchingExamTypes,
    isLoading: isLoadingExamTypes,
  } = useGetExamTypes();
  const { isPending: isDeletingExamType } = useDeleteExamType();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = useMemo<MRT_ColumnDef<IExamType>[]>(
    () => [
      {
        accessorKey: 'typeName',
        header: t('examTypes.table.name'),
        size: 200,
        enableClickToCopy: true,
      },
      { accessorKey: 'description', header: t('examTypes.table.description'), size: 400 },
    ],
    [t]
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedExamTypes,
    enableRowActions: true,
    getRowId: (row) => String(row.id),
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
      isLoading: isLoadingExamTypes,
      isSaving: isDeletingExamType,
      showAlertBanner: isLoadingExamTypesError,
      showProgressBars: isFetchingExamTypes,
      pagination,
    },
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    positionActionsColumn: 'first',
    initialState: { showGlobalFilter: true, density: 'xs' },
    renderRowActions: ({ row }) => (
      <Flex gap="sm">
        <Tooltip label={t('exams.actions.edit')}>
          <ActionIcon
            color="blue"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'edit-exam-type',
                title: <Text fw={700}>{t('examTypes.form.editTitle')}</Text>,
                children: <EditExamTypeForm initialExamType={row.original} />,
              })
            }
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('exams.actions.delete')}>
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'delete-exam-type',
                title: (
                  <Text fw={700} c="red">
                    {t('examTypes.form.deleteTitle')}
                  </Text>
                ),
                children: <DeleteExamTypeModal examType={row.original} />,
              })
            }
          >
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
          onClick={() =>
            modals.open({
              id: 'create-exam-type',
              title: <Text fw={700}>{t('examTypes.form.createTitle')}</Text>,
              children: <CreateExamTypeForm />,
            })
          }
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
          onClick={async () => {
            setIsExporting(true);
            try {
              const ids = table.getPrePaginationRowModel().rows.map((row: any) => row.original.id);
              if (ids.length === 0) {
                notifications.show({
                  title: 'Info',
                  message: t('examiners.notifications.exportNoData'),
                  color: 'blue',
                });
                return;
              }
              const response = await api.Exports.exportExamTypesFiltered(ids);
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute(
                'download',
                `ExamTypes_${new Date().toISOString().slice(0, 10)}.xlsx`
              );
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
            } catch {
              notifications.show({
                title: t('common.error'),
                message: t('exams.notifications.exportFailed'),
                color: 'red',
              });
            } finally {
              setIsExporting(false);
            }
          }}
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
        entityName={t('examTypes.title')}
        onDownloadTemplate={api.Imports.downloadTemplateExamTypes}
        onImport={api.Imports.importExamTypes}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['examTypes'] })}
      />
    </>
  );
};

function useCreateExamType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examTypeData: ExamTypeFormData) => api.ExamTypes.createExamType(examTypeData),
    onSuccess: (createdExamType) => {
      notifications.show({
        title: t('common.success'),
        message: t('examTypes.notifications.createSuccess', { name: createdExamType.typeName }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
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

function useGetExamTypes() {
  return useQuery<IExamType[]>({
    queryKey: ['examTypes'],
    queryFn: async () => {
      const response = await api.ExamTypes.getAllExamTypes();
      return response.data;
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function useUpdateExamType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newValues,
      oldValues,
    }: {
      newValues: IExamType;
      oldValues: IExamType;
    }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.ExamTypes.updateExamType(newValues.id, patchDocument);
      }
      return newValues;
    },
    onSuccess: (updatedExamType) => {
      notifications.show({
        title: t('common.success'),
        message: t('examTypes.notifications.updateSuccess', { name: updatedExamType.typeName }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
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

function useDeleteExamType() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examTypeId: number) =>
      api.ExamTypes.deleteExamType(examTypeId).then(() => examTypeId),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('examTypes.notifications.deleteSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
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

const ExamTypePage = () => {
  const { t } = useTranslation();
  return (
    <MantineProvider>
      <QueryClientProvider client={rootQueryClient}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                {t('examTypes.title')}
              </Title>
            </Stack>
            <ExamTypeTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default ExamTypePage;
