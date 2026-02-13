


import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';



import React, { useMemo, useState } from 'react';
import { IconCalendar, IconCertificate, IconDownload, IconEdit, IconFileTypePdf, IconHash, IconPlus, IconSchool, IconSettings, IconTrash, IconUpload, IconUsers } from '@tabler/icons-react';
import { keepPreviousData, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, MRT_ColumnDef, useMantineReactTable } from 'mantine-react-table';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Badge, Button, Divider, Flex, Group, MantineProvider, Paper, ScrollArea, Select, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { DateInput, DatePickerInput } from '@mantine/dates';
import { useForm, type UseFormReturnType } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
import { Skeleton } from '../components/Skeleton';
import { ExamBoardFormData, ExamFormData, IExam, Status, STATUS_LABELS } from '../interfaces/IExam';


interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
}

const generatePatchDocument = (oldData: IExam, newData: IExam): JsonPatchOperation[] => {
  const patch: JsonPatchOperation[] = [];
  for (const key in newData) {
    if (Object.hasOwn(newData, key) && (newData as any)[key] !== (oldData as any)[key]) {
      let val = (newData as any)[key];
      if (key === 'examDate' && val) {
        val = new Date(val).toISOString();
      }
      if (key !== 'examBoards') {
        patch.push({ op: 'replace', path: `/${key}`, value: val });
      }
    }
  }
  if (
    newData.examBoards &&
    JSON.stringify(oldData.examBoards) !== JSON.stringify(newData.examBoards)
  ) {
    patch.push({
      op: 'replace',
      path: '/examBoards',
      value: newData.examBoards.map((board) => ({
        examinerId: board.examinerId,
        role: board.role,
      })),
    });
  }
  return patch;
};

const ExamBoardManager = ({
  form,
  examiners = [],
}: {
  form: UseFormReturnType<ExamFormData>;
  examiners: any[];
}) => {
  const { t } = useTranslation();
  const examBoards = form.values.examBoards;
  const examinerOptions = examiners.map((ex) => ({
    value: ex.id.toString(),
    label: `${ex.firstName} ${ex.lastName} (${ex.identityCardNumber})`,
  }));

  const roleOptions = [
    { value: 'Chief Examiner', label: t('exams.roles.chief') },
    { value: 'Deputy Chief Examiner', label: t('exams.roles.deputy') },
    { value: 'Examiner', label: t('exams.roles.examiner') },
    { value: 'Assistant Examiner', label: t('exams.roles.assistant') },
    { value: 'External Examiner', label: t('exams.roles.external') },
  ];

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600} size="sm">
          {t('exams.form.committee')}
        </Text>
        <Button
          leftSection={<IconPlus size={14} />}
          variant="light"
          radius="md"
          onClick={() => form.insertListItem('examBoards', { examinerId: 0, role: '' })}
          size="xs"
        >
          {t('exams.form.addExaminer')}
        </Button>
      </Group>

      <ScrollArea.Autosize mah={300}>
        <Stack gap="xs">
          {examBoards.map((_, index) => (
            <Paper key={index} p="xs" withBorder radius="md">
              <Flex align="flex-end" gap="sm">
                <Select
                  label={t('exams.form.examiner')}
                  placeholder={t('exams.form.selectExaminer')}
                  data={examinerOptions}
                  style={{ flex: 2 }}
                  searchable
                  required
                  {...form.getInputProps(`examBoards.${index}.examinerId`)}
                  onChange={(val) =>
                    form.setFieldValue(
                      `examBoards.${index}.examinerId`,
                      val ? parseInt(val, 10) : 0
                    )
                  }
                  value={form.values.examBoards[index].examinerId?.toString()}
                />
                <Select
                  label={t('exams.form.role')}
                  placeholder={t('exams.form.role')}
                  data={roleOptions}
                  style={{ flex: 1 }}
                  required
                  {...form.getInputProps(`examBoards.${index}.role`)}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => form.removeListItem('examBoards', index)}
                  disabled={examBoards.length === 1}
                  mb={4}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Flex>
            </Paper>
          ))}
          {examBoards.length === 0 && (
            <Text c="dimmed" ta="center" size="sm" py="md">
              {t('exams.form.noExaminers')}
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
      {form.errors['examBoards.general'] && (
        <Text c="red" size="xs">
          {form.errors['examBoards.general']}
        </Text>
      )}
    </Stack>
  );
};

const CreateExamForm = () => {
  const { t } = useTranslation();
  const { data: examiners = [] } = useQuery({
    queryKey: ['examiners'],
    queryFn: () => api.Examiners.getAllExaminers().then((r) => r.data),
  });
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.Institutions.getAllInstitutions().then((r) => r.data),
  });
  const { data: examTypes = [] } = useQuery({
    queryKey: ['examTypes'],
    queryFn: () => api.ExamTypes.getAllExamTypes().then((r) => r.data),
  });
  const { data: professions = [] } = useQuery({
    queryKey: ['professions'],
    queryFn: () => api.Professions.getAllProfessions().then((r) => r.data),
  });

  const { data: fetchedExams = [] } = useGetExams();
  const { mutateAsync: createExam } = useCreateExam();

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const form = useForm<ExamFormData>({
    initialValues: {
      examName: '',
      examCode: '',
      examDate: '',
      status: Status.PLANNED,
      professionId: 0,
      institutionId: 0,
      examTypeId: 0,
      examBoards: [{ examinerId: 0, role: '' }],
    },
    validate: (values) => validateExam(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (fetchedExams.some((e) => e.examCode.toLowerCase() === values.examCode.toLowerCase())) {
      form.setFieldError('examCode', t('exams.form.exists'));
      return;
    }
    await createExam(values);
    modals.close('create-exam');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label={t('exams.table.name')}
          placeholder={t('exams.form.namePlaceholder')}
          {...form.getInputProps('examName')}
          required
        />
        <TextInput
          label={t('exams.table.code')}
          placeholder={t('exams.form.codePlaceholder')}
          leftSection={<IconHash size={16} />}
          {...form.getInputProps('examCode')}
          required
        />

        <Group grow>
          <DateInput
            label={t('exams.table.date')}
            valueFormat="YYYY-MM-DD"
            leftSection={<IconCalendar size={16} />}
            {...form.getInputProps('examDate')}
            minDate={minDate}
            required
          />
          <Select
            label={t('exams.table.status')}
            data={[
              { value: '0', label: t('exams.status.planned') },
              { value: '1', label: t('exams.status.active') },
              { value: '2', label: t('exams.status.postponed') },
              { value: '3', label: t('exams.status.completed') },
            ]}
            value={form.values.status.toString()}
            onChange={(val) => form.setFieldValue('status', val ? parseInt(val, 10) : 0)}
            required
          />
        </Group>

        <Select
          label={t('exams.table.profession')}
          searchable
          leftSection={<IconCertificate size={16} />}
          data={professions.map((p) => ({ value: p.id.toString(), label: p.professionName }))}
          {...form.getInputProps('professionId')}
          onChange={(v) => form.setFieldValue('professionId', v ? parseInt(v, 10) : 0)}
          value={form.values.professionId?.toString()}
          required
        />
        <Select
          label={t('exams.table.institution')}
          searchable
          leftSection={<IconSchool size={16} />}
          data={institutions.map((i) => ({ value: i.id.toString(), label: i.name }))}
          {...form.getInputProps('institutionId')}
          onChange={(v) => form.setFieldValue('institutionId', v ? parseInt(v, 10) : 0)}
          value={form.values.institutionId?.toString()}
          required
        />
        <Select
          label={t('exams.table.type')}
          searchable
          leftSection={<IconSettings size={16} />}
          data={examTypes.map((et) => ({ value: et.id.toString(), label: et.typeName }))}
          {...form.getInputProps('examTypeId')}
          onChange={(v) => form.setFieldValue('examTypeId', v ? parseInt(v, 10) : 0)}
          value={form.values.examTypeId?.toString()}
          required
        />

        <Divider label={t('exams.form.committee')} labelPosition="center" />
        <ExamBoardManager form={form} examiners={examiners} />

        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            {t('exams.actions.cancel')}
          </Button>
          <Button type="submit" variant="filled" radius="md">
            {t('exams.actions.createSubmit')}
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditExamForm = ({ initialExam }: { initialExam: IExam }) => {
  const { t } = useTranslation();
  const { data: examiners = [] } = useQuery({
    queryKey: ['examiners'],
    queryFn: () => api.Examiners.getAllExaminers().then((r) => r.data),
  });
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.Institutions.getAllInstitutions().then((r) => r.data),
  });
  const { data: examTypes = [] } = useQuery({
    queryKey: ['examTypes'],
    queryFn: () => api.ExamTypes.getAllExamTypes().then((r) => r.data),
  });
  const { data: professions = [] } = useQuery({
    queryKey: ['professions'],
    queryFn: () => api.Professions.getAllProfessions().then((r) => r.data),
  });

  const { data: fetchedExams = [] } = useGetExams();
  const { mutateAsync: updateExam } = useUpdateExam();

  const form = useForm<ExamFormData>({
    initialValues: {
      examName: initialExam.examName,
      examCode: initialExam.examCode,
      examDate: initialExam.examDate,
      status: initialExam.status,
      professionId: initialExam.professionId,
      institutionId: initialExam.institutionId,
      examTypeId: initialExam.examTypeId,
      examBoards: initialExam.examBoards.map((b) => ({ examinerId: b.examinerId, role: b.role })),
    },
    validate: (values) => validateExam(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (
      fetchedExams.some(
        (e) => e.id !== initialExam.id && e.examCode.toLowerCase() === values.examCode.toLowerCase()
      )
    ) {
      form.setFieldError('examCode', t('exams.form.exists'));
      return;
    }
    const newValues = { ...initialExam, ...values } as IExam;
    await updateExam({ newValues, oldValues: initialExam });
    modals.close('edit-exam');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput label={t('exams.table.name')} {...form.getInputProps('examName')} required />
        <TextInput
          label={t('exams.table.code')}
          leftSection={<IconHash size={16} />}
          {...form.getInputProps('examCode')}
          required
        />

        <Group grow>
          <DateInput
            label={t('exams.table.date')}
            valueFormat="YYYY-MM-DD"
            leftSection={<IconCalendar size={16} />}
            {...form.getInputProps('examDate')}
            required
          />
          <Select
            label={t('exams.table.status')}
            data={[
              { value: '0', label: t('exams.status.planned') },
              { value: '1', label: t('exams.status.active') },
              { value: '2', label: t('exams.status.postponed') },
              { value: '3', label: t('exams.status.completed') },
            ]}
            value={form.values.status.toString()}
            onChange={(val) => form.setFieldValue('status', val ? parseInt(val, 10) : 0)}
            required
          />
        </Group>

        <Select
          label={t('exams.table.profession')}
          searchable
          leftSection={<IconCertificate size={16} />}
          data={professions.map((p) => ({ value: p.id.toString(), label: p.professionName }))}
          {...form.getInputProps('professionId')}
          onChange={(v) => form.setFieldValue('professionId', v ? parseInt(v, 10) : 0)}
          value={form.values.professionId?.toString()}
          required
        />
        <Select
          label={t('exams.table.institution')}
          searchable
          leftSection={<IconSchool size={16} />}
          data={institutions.map((i) => ({ value: i.id.toString(), label: i.name }))}
          {...form.getInputProps('institutionId')}
          onChange={(v) => form.setFieldValue('institutionId', v ? parseInt(v, 10) : 0)}
          value={form.values.institutionId?.toString()}
          required
        />
        <Select
          label={t('exams.table.type')}
          searchable
          leftSection={<IconSettings size={16} />}
          data={examTypes.map((et) => ({ value: et.id.toString(), label: et.typeName }))}
          {...form.getInputProps('examTypeId')}
          onChange={(v) => form.setFieldValue('examTypeId', v ? parseInt(v, 10) : 0)}
          value={form.values.examTypeId?.toString()}
          required
        />

        <Divider label={t('exams.form.committee')} labelPosition="center" />
        <ExamBoardManager form={form} examiners={examiners} />

        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
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

const DeleteExamModal = ({ exam }: { exam: IExam }) => {
  const { t } = useTranslation();
  const { mutateAsync: deleteExam } = useDeleteExam();
  return (
    <Stack>
      <Text size="sm">{t('exams.deleteConfirm', { name: exam.examName })}</Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          {t('exams.actions.cancel')}
        </Button>
        <Button
          color="red"
          variant="filled"
          onClick={async () => {
            await deleteExam(exam.id);
            modals.close('delete-exam');
          }}
        >
          {t('exams.actions.delete')}
        </Button>
      </Flex>
    </Stack>
  );
};

const ExamTable = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const { data: fetchedExams = [], isError, isFetching, isLoading } = useGetExams();
  const { isPending: isDeleting } = useDeleteExam();
  const { mutateAsync: downloadReport, isPending: isDownloading } = useDownloadExamBoardReport();

  const filteredData = useMemo(() => {
    const [start, end] = dateRange;
    if (!start && !end) {
      return fetchedExams;
    }

    return fetchedExams.filter((exam) => {
      const currentExamDate = new Date(exam.examDate);

      if (start) {
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        if (currentExamDate < startDate) {
          return false;
        }
      }

      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        if (currentExamDate > endDate) {
          return false;
        }
      }
      return true;
    });
  }, [fetchedExams, dateRange]);

  const columns = useMemo<MRT_ColumnDef<IExam>[]>(
    () => [
      { accessorKey: 'examName', header: t('exams.table.name'), size: 200 },
      { accessorKey: 'examCode', header: t('exams.table.code'), size: 100 },
      {
        accessorKey: 'examDate',
        header: t('exams.table.date'),
        size: 120,
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleDateString(
            i18n.language === 'hu' ? 'hu-HU' : 'en-CA'
          ),
      },
      {
        accessorKey: 'status',
        header: t('exams.table.status'),
        size: 120,
        Cell: ({ cell }) => {
          const status = cell.getValue<Status>();
          const colors = {
            [Status.PLANNED]: 'blue',
            [Status.ACTIVE]: 'green',
            [Status.POSTPONED]: 'yellow',
            [Status.COMPLETED]: 'gray',
          };
          const labels = {
            [Status.PLANNED]: t('exams.status.planned'),
            [Status.ACTIVE]: t('exams.status.active'),
            [Status.POSTPONED]: t('exams.status.postponed'),
            [Status.COMPLETED]: t('exams.status.completed'),
          };
          return (
            <Badge color={colors[status]} variant="light">
              {labels[status]}
            </Badge>
          );
        },
      },
      { accessorKey: 'professionName', header: t('exams.table.profession') },
      { accessorKey: 'institutionName', header: t('exams.table.institution') },
      { accessorKey: 'examTypeName', header: t('exams.table.type') },
      {
        accessorKey: 'examBoards',
        header: t('exams.table.staff'),
        size: 80,
        Cell: ({ row }) => (
          <Group gap={4}>
            <IconUsers size={14} />
            <Text size="xs" fw={500}>
              {row.original.examBoards.length}
            </Text>
          </Group>
        ),
      },
    ],
    [t, i18n.language]
  );

  const table = useMantineReactTable({
    columns,
    data: filteredData,
    enableRowActions: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    getRowId: (row) => String(row.id),
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
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
      isLoading,
      isSaving: isDeleting,
      showAlertBanner: isError,
      showProgressBars: isFetching,
      pagination,
    },
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    initialState: { showGlobalFilter: true, density: 'xs' },
    positionActionsColumn: 'first',
    renderRowActions: ({ row }) => (
      <Flex gap="sm">
        <Tooltip label={t('exams.actions.downloadPdf')}>
          <ActionIcon
            color="orange"
            variant="subtle"
            loading={isDownloading}
            onClick={() => downloadReport(row.original)}
          >
            <IconFileTypePdf size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('exams.actions.edit')}>
          <ActionIcon
            color="blue"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'edit-exam',
                title: <Text fw={700}>{t('exams.actions.edit')}</Text>,
                children: <EditExamForm initialExam={row.original} />,
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
                id: 'delete-exam',
                title: (
                  <Text fw={700} c="red">
                    {t('exams.actions.delete')}
                  </Text>
                ),
                children: <DeleteExamModal exam={row.original} />,
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
              id: 'create-exam',
              title: <Text fw={700}>{t('exams.actions.create')}</Text>,
              children: <CreateExamForm />,
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
              const ids = table.getPrePaginationRowModel().rows.map((r: any) => r.original.id);
              const response = await api.Exports.exportExamsFiltered(ids);
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `Exams_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        <DatePickerInput
          type="range"
          placeholder={t('exams.actions.dateFilter')}
          value={dateRange as any}
          onChange={(val) => setDateRange(val as [Date | null, Date | null])}
          clearable
          size="sm"
          style={{ minWidth: '250px' }}
          leftSection={<IconCalendar size={16} />}
        />
      </Flex>
    ),
  });

  return (
    <>
      <MantineReactTable table={table} />
      <ImportModal
        opened={isImportOpen}
        onClose={closeImport}
        entityName={t('exams.title')}
        onDownloadTemplate={api.Imports.downloadTemplateExams}
        onImport={api.Imports.importExams}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['exams'] })}
      />
    </>
  );
};

function useGetExams() {
  return useQuery<IExam[]>({
    queryKey: ['exams'],
    queryFn: () => api.Exams.getAllExams().then((r) => r.data),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function useCreateExam() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamFormData) => api.Exams.createExam(data),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('exams.notifications.createSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) =>
      notifications.show({
        title: t('common.error'),
        message: err.response?.data?.message || t('common.error'),
        color: 'red',
      }),
  });
}

function useUpdateExam() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ newValues, oldValues }: { newValues: IExam; oldValues: IExam }) => {
      const patch = generatePatchDocument(oldValues, newValues);
      if (patch.length > 0) {
        await api.Exams.updateExam(newValues.id, patch);
      }
      return newValues;
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('exams.notifications.updateSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: () =>
      notifications.show({ title: t('common.error'), message: t('common.error'), color: 'red' }),
  });
}

function useDeleteExam() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Exams.deleteExam(id),
    onSuccess: () => {
      notifications.show({
        title: t('exams.actions.delete'),
        message: t('exams.notifications.deleteSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

function useDownloadExamBoardReport() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (exam: IExam) => {
      const response = await api.Exams.generateExamBoardReport(exam.id);
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exam.examCode}_BoardReport.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    },
    onSuccess: () =>
      notifications.show({
        title: t('common.success'),
        message: t('exams.notifications.pdfStarted'),
        color: 'teal',
      }),
    onError: () =>
      notifications.show({
        title: t('common.error'),
        message: t('exams.notifications.pdfFailed'),
        color: 'red',
      }),
  });
}

const rootQueryClient = new QueryClient();

const ExamPage = () => {
  const { t } = useTranslation();
  return (
    <MantineProvider>
      <QueryClientProvider client={rootQueryClient}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                {t('exams.title')}
              </Title>
            </Stack>
            <ExamTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default ExamPage;

const validateRequired = (value: string | number) => {
  if (typeof value === 'string') {
    return !!value.length;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  return false;
};

const validateDate = (dateString: string) => {
  if (!dateString.length) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toString() !== 'Invalid Date';
};

const validateExamBoards = (examBoards: ExamBoardFormData[], t: any) => {
  const errors: Record<string, string> = {};
  if (!examBoards || examBoards.length === 0) {
    errors['examBoards.general'] = t('exams.validation.atLeastOne');
    return errors;
  }
  examBoards.forEach((board, index) => {
    if (!validateRequired(board.examinerId)) {
      errors[`examBoards.${index}.examinerId`] = t('exams.validation.examinerRequired');
    }
    if (!validateRequired(board.role)) {
      errors[`examBoards.${index}.role`] = t('exams.validation.roleRequired');
    }
  });
  const examinerIds = examBoards.map((board) => board.examinerId).filter((id) => id > 0);
  const uniqueExaminerIds = new Set(examinerIds);
  if (examinerIds.length !== uniqueExaminerIds.size) {
    errors['examBoards.general'] = t('exams.validation.duplicate');
  }
  return errors;
};

function validateExam(exam: ExamFormData, t: any) {
  const errors: Record<string, string> = {};
  if (!validateRequired(exam.examName)) {
    errors.examName = t('exams.validation.name');
  }
  if (!validateRequired(exam.examCode)) {
    errors.examCode = t('exams.validation.code');
  }
  if (!validateRequired(exam.examDate)) {
    errors.examDate = t('exams.validation.date');
  } else if (!validateDate(exam.examDate)) {
    errors.examDate = t('exams.validation.dateInvalid');
  }
  if (!validateRequired(exam.professionId)) {
    errors.professionId = t('exams.validation.profession');
  }
  if (!validateRequired(exam.institutionId)) {
    errors.institutionId = t('exams.validation.institution');
  }
  if (!validateRequired(exam.examTypeId)) {
    errors.examTypeId = t('exams.validation.type');
  }
  const examBoardErrors = validateExamBoards(exam.examBoards, t);
  Object.assign(errors, examBoardErrors);
  return errors;
}
