import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import React, { useMemo, useState } from 'react';
import {
  IconCalendar,
  IconDownload,
  IconEdit,
  IconId,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUpload,
  IconUser,
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
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
import { Skeleton } from '../components/Skeleton';
import { ExaminerFormData, IExaminer } from '../interfaces/IExaminer';

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
}

const generatePatchDocument = (oldData: IExaminer, newData: IExaminer): JsonPatchOperation[] => {
  const patch: JsonPatchOperation[] = [];
  for (const key in newData) {
    if (Object.hasOwn(newData, key) && (newData as any)[key] !== (oldData as any)[key]) {
      let val = (newData as any)[key];
      if (key === 'dateOfBirth' && val) {
        val = new Date(val).toISOString();
      }
      patch.push({ op: 'replace', path: `/${key}`, value: val });
    }
  }
  return patch;
};

const validateRequired = (value: string) => !!value?.trim().length;

const validateDateRange = (dateString: string) => {
  if (!dateString) {return false;}
  const date = new Date(dateString);
  const now = new Date();
  const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  return date >= minAge && date < now;
};

function validateExaminer(examiner: ExaminerFormData, t: any) {
  const errors: Record<string, string> = {};
  if (!validateRequired(examiner.firstName)) {errors.firstName = t('examiners.validation.firstName');}
  if (!validateRequired(examiner.lastName)) {errors.lastName = t('examiners.validation.lastName');}
  if (!validateRequired(examiner.dateOfBirth)) {
    errors.dateOfBirth = t('examiners.validation.dobRequired');
  } else if (!validateDateRange(examiner.dateOfBirth)) {
    errors.dateOfBirth = t('examiners.validation.dobInvalid');
  }
  if (!validateRequired(examiner.email)) {
    errors.email = t('examiners.validation.emailRequired');
  } else if (!/^\S+@\S+\.\S+$/.test(examiner.email)) {
    errors.email = t('examiners.validation.emailInvalid');
  }
  if (!validateRequired(examiner.phone)) {errors.phone = t('examiners.validation.phone');}
  if (!validateRequired(examiner.identityCardNumber))
    {errors.identityCardNumber = t('examiners.validation.idCard');}
  return errors;
}

const CreateExaminerForm = () => {
  const { t } = useTranslation();
  const { data: fetchedExaminers = [] } = useGetExaminers();
  const { mutateAsync: createExaminer } = useCreateExaminer();

  const form = useForm<ExaminerFormData>({
    initialValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      identityCardNumber: '',
    },
    validate: (values) => validateExaminer(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExaminers.some(
      (ex) => ex.identityCardNumber.toLowerCase() === values.identityCardNumber.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('identityCardNumber', t('examiners.form.duplicateId'));
      return;
    }
    await createExaminer(values);
    modals.close('create-examiner');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t('examiners.table.firstName')}
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('firstName')}
          required
        />
        <TextInput
          label={t('examiners.table.lastName')}
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('lastName')}
          required
        />
        <DateInput
          label={t('examiners.table.dob')}
          leftSection={<IconCalendar size={16} />}
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('dateOfBirth')}
          required
        />
        <TextInput
          label={t('examiners.table.email')}
          type="email"
          leftSection={<IconMail size={16} />}
          {...form.getInputProps('email')}
          required
        />
        <TextInput
          label={t('examiners.table.phone')}
          type="tel"
          leftSection={<IconPhone size={16} />}
          {...form.getInputProps('phone')}
          required
        />
        <TextInput
          label={t('examiners.table.idCard')}
          leftSection={<IconId size={16} />}
          {...form.getInputProps('identityCardNumber')}
          required
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

const EditExaminerForm = ({ initialExaminer }: { initialExaminer: IExaminer }) => {
  const { t } = useTranslation();
  const { data: fetchedExaminers = [] } = useGetExaminers();
  const { mutateAsync: updateExaminer } = useUpdateExaminer();

  const form = useForm<ExaminerFormData>({
    initialValues: {
      firstName: initialExaminer.firstName,
      lastName: initialExaminer.lastName,
      dateOfBirth: initialExaminer.dateOfBirth,
      email: initialExaminer.email,
      phone: initialExaminer.phone,
      identityCardNumber: initialExaminer.identityCardNumber,
    },
    validate: (values) => validateExaminer(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExaminers.some(
      (ex) =>
        ex.id !== initialExaminer.id &&
        ex.identityCardNumber.toLowerCase() === values.identityCardNumber.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('identityCardNumber', t('examiners.form.duplicateId'));
      return;
    }
    const newValues: IExaminer = { ...initialExaminer, ...values };
    await updateExaminer({ newValues, oldValues: initialExaminer });
    modals.close('edit-examiner');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t('examiners.table.firstName')}
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('firstName')}
          required
        />
        <TextInput
          label={t('examiners.table.lastName')}
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('lastName')}
          required
        />
        <DateInput
          label={t('examiners.table.dob')}
          leftSection={<IconCalendar size={16} />}
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('dateOfBirth')}
          required
        />
        <TextInput
          label={t('examiners.table.email')}
          type="email"
          leftSection={<IconMail size={16} />}
          {...form.getInputProps('email')}
          required
        />
        <TextInput
          label={t('examiners.table.phone')}
          type="tel"
          leftSection={<IconPhone size={16} />}
          {...form.getInputProps('phone')}
          required
        />
        <TextInput
          label={t('examiners.table.idCard')}
          leftSection={<IconId size={16} />}
          {...form.getInputProps('identityCardNumber')}
          required
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

const DeleteExaminerModal = ({ examiner }: { examiner: IExaminer }) => {
  const { t } = useTranslation();
  const { mutateAsync: deleteExaminer } = useDeleteExaminer();

  return (
    <Stack>
      <Text size="sm">
        {t('exams.deleteConfirm', { name: `${examiner.firstName} ${examiner.lastName}` })}
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          {t('exams.actions.cancel')}
        </Button>
        <Button
          color="red"
          variant="filled"
          onClick={async () => {
            await deleteExaminer(examiner.id);
            modals.close('delete-examiner');
          }}
        >
          {t('exams.actions.delete')}
        </Button>
      </Flex>
    </Stack>
  );
};

const ExaminerTable = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const {
    data: fetchedExaminers = [],
    isError: isLoadingExaminersError,
    isFetching: isFetchingExaminers,
    isLoading: isLoadingExaminers,
  } = useGetExaminers();
  const { isPending: isDeletingExaminer } = useDeleteExaminer();

  const columns = useMemo<MRT_ColumnDef<IExaminer>[]>(
    () => [
      { accessorKey: 'firstName', header: t('examiners.table.firstName') },
      { accessorKey: 'lastName', header: t('examiners.table.lastName') },
      {
        accessorKey: 'dateOfBirth',
        header: t('examiners.table.dob'),
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString(
            i18n.language === 'hu' ? 'hu-HU' : 'en-CA'
          ),
      },
      { accessorKey: 'email', header: t('examiners.table.email') },
      { accessorKey: 'phone', header: t('examiners.table.phone') },
      { accessorKey: 'identityCardNumber', header: t('examiners.table.idCard') },
    ],
    [t, i18n.language]
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedExaminers,
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
      isLoading: isLoadingExaminers,
      isSaving: isDeletingExaminer,
      showAlertBanner: isLoadingExaminersError,
      showProgressBars: isFetchingExaminers,
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
                id: 'edit-examiner',
                title: <Text fw={700}>{t('examiners.form.editTitle')}</Text>,
                children: <EditExaminerForm initialExaminer={row.original} />,
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
                id: 'delete-examiner',
                title: (
                  <Text fw={700} c="red">
                    {t('examiners.form.deleteTitle')}
                  </Text>
                ),
                children: <DeleteExaminerModal examiner={row.original} />,
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
              id: 'create-examiner',
              title: <Text fw={700}>{t('examiners.form.createTitle')}</Text>,
              children: <CreateExaminerForm />,
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
              const response = await api.Exports.exportExaminersFiltered(ids);
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute(
                'download',
                `Examiners_${new Date().toISOString().slice(0, 10)}.xlsx`
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
        entityName={t('examiners.title')}
        onDownloadTemplate={api.Imports.downloadTemplateExaminers}
        onImport={api.Imports.importExaminers}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['examiners'] })}
      />
    </>
  );
};

function useCreateExaminer() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExaminerFormData) => api.Examiners.createExaminer(data),
    onSuccess: (created) => {
      notifications.show({
        title: t('common.success'),
        message: t('examiners.notifications.createSuccess', {
          name: `${created.firstName} ${created.lastName}`,
        }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
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

function useGetExaminers() {
  return useQuery<IExaminer[]>({
    queryKey: ['examiners'],
    queryFn: () => api.Examiners.getAllExaminers().then((res) => res.data),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function useUpdateExaminer() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newValues,
      oldValues,
    }: {
      newValues: IExaminer;
      oldValues: IExaminer;
    }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.Examiners.updateExaminer(newValues.id, patchDocument);
      }
      return newValues;
    },
    onSuccess: (updated) => {
      notifications.show({
        title: t('common.success'),
        message: t('examiners.notifications.updateSuccess', { name: updated.firstName }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
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

function useDeleteExaminer() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Examiners.deleteExaminer(id).then(() => id),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('examiners.notifications.deleteSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
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

const ExaminerPage = () => {
  const { t } = useTranslation();
  return (
    <MantineProvider>
      <QueryClientProvider client={rootQueryClient}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                {t('examiners.title')}
              </Title>
            </Stack>
            <ExaminerTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default ExaminerPage;
