


import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';



import { useMemo, useState } from 'react';
import { IconCalendar, IconCertificate, IconDownload, IconEdit, IconFileTypePdf, IconHash, IconPlus, IconSchool, IconSettings, IconTrash, IconUpload, IconUsers } from '@tabler/icons-react';
import { keepPreviousData, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, MRT_ColumnDef, useMantineReactTable } from 'mantine-react-table';
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
      if (key === 'examDate' && val) {val = new Date(val).toISOString();}
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
  const examBoards = form.values.examBoards;
  const examinerOptions = examiners.map((ex) => ({
    value: ex.id.toString(),
    label: `${ex.firstName} ${ex.lastName} (${ex.identityCardNumber})`,
  }));

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600} size="sm">
          Exam Boards / Examiners
        </Text>
        <Button
          leftSection={<IconPlus size={14} />}
          variant="light"
          radius="md"
          onClick={() => form.insertListItem('examBoards', { examinerId: 0, role: '' })}
          size="xs"
        >
          Add Examiner
        </Button>
      </Group>

      <ScrollArea.Autosize mah={300}>
        <Stack gap="xs">
          {examBoards.map((_, index) => (
            <Paper key={index} p="xs" withBorder radius="md">
              <Flex align="flex-end" gap="sm">
                <Select
                  label="Examiner"
                  placeholder="Select examiner"
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
                  label="Role"
                  placeholder="Role"
                  data={[
                    'Chief Examiner',
                    'Deputy Chief Examiner',
                    'Examiner',
                    'Assistant Examiner',
                    'External Examiner',
                  ]}
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
              No examiners assigned.
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
    validate: validateExam,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (fetchedExams.some((e) => e.examCode.toLowerCase() === values.examCode.toLowerCase())) {
      form.setFieldError('examCode', 'Exam code already exists.');
      return;
    }
    await createExam(values);
    modals.close('create-exam');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Exam Name"
          placeholder="Official name"
          {...form.getInputProps('examName')}
          required
        />
        <TextInput
          label="Exam Code"
          placeholder="Unique code"
          leftSection={<IconHash size={16} />}
          {...form.getInputProps('examCode')}
          required
        />

        <Group grow>
          <DateInput
            label="Exam Date"
            valueFormat="YYYY-MM-DD"
            leftSection={<IconCalendar size={16} />}
            {...form.getInputProps('examDate')}
            minDate={minDate}
            required
          />
          <Select
            label="Status"
            data={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            value={form.values.status.toString()}
            onChange={(val) => form.setFieldValue('status', val ? parseInt(val, 10) : 0)}
            required
          />
        </Group>

        <Select
          label="Profession"
          searchable
          leftSection={<IconCertificate size={16} />}
          data={professions.map((p) => ({ value: p.id.toString(), label: p.professionName }))}
          {...form.getInputProps('professionId')}
          onChange={(v) => form.setFieldValue('professionId', v ? parseInt(v, 10) : 0)}
          value={form.values.professionId?.toString()}
          required
        />
        <Select
          label="Institution"
          searchable
          leftSection={<IconSchool size={16} />}
          data={institutions.map((i) => ({ value: i.id.toString(), label: i.name }))}
          {...form.getInputProps('institutionId')}
          onChange={(v) => form.setFieldValue('institutionId', v ? parseInt(v, 10) : 0)}
          value={form.values.institutionId?.toString()}
          required
        />
        <Select
          label="Exam Type"
          searchable
          leftSection={<IconSettings size={16} />}
          data={examTypes.map((et) => ({ value: et.id.toString(), label: et.typeName }))}
          {...form.getInputProps('examTypeId')}
          onChange={(v) => form.setFieldValue('examTypeId', v ? parseInt(v, 10) : 0)}
          value={form.values.examTypeId?.toString()}
          required
        />

        <Divider label="Committee" labelPosition="center" />
        <ExamBoardManager form={form} examiners={examiners} />

        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" variant="filled" radius="md">
            Create Exam
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditExamForm = ({ initialExam }: { initialExam: IExam }) => {
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
    validate: validateExam,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (
      fetchedExams.some(
        (e) => e.id !== initialExam.id && e.examCode.toLowerCase() === values.examCode.toLowerCase()
      )
    ) {
      form.setFieldError('examCode', 'Exam code already exists.');
      return;
    }
    const newValues = { ...initialExam, ...values } as IExam;
    await updateExam({ newValues, oldValues: initialExam });
    modals.close('edit-exam');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput label="Exam Name" {...form.getInputProps('examName')} required />
        <TextInput
          label="Exam Code"
          leftSection={<IconHash size={16} />}
          {...form.getInputProps('examCode')}
          required
        />

        <Group grow>
          <DateInput
            label="Exam Date"
            valueFormat="YYYY-MM-DD"
            leftSection={<IconCalendar size={16} />}
            {...form.getInputProps('examDate')}
            required
          />
          <Select
            label="Status"
            data={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            value={form.values.status.toString()}
            onChange={(val) => form.setFieldValue('status', val ? parseInt(val, 10) : 0)}
            required
          />
        </Group>

        <Select
          label="Profession"
          searchable
          leftSection={<IconCertificate size={16} />}
          data={professions.map((p) => ({ value: p.id.toString(), label: p.professionName }))}
          {...form.getInputProps('professionId')}
          onChange={(v) => form.setFieldValue('professionId', v ? parseInt(v, 10) : 0)}
          value={form.values.professionId?.toString()}
          required
        />
        <Select
          label="Institution"
          searchable
          leftSection={<IconSchool size={16} />}
          data={institutions.map((i) => ({ value: i.id.toString(), label: i.name }))}
          {...form.getInputProps('institutionId')}
          onChange={(v) => form.setFieldValue('institutionId', v ? parseInt(v, 10) : 0)}
          value={form.values.institutionId?.toString()}
          required
        />
        <Select
          label="Exam Type"
          searchable
          leftSection={<IconSettings size={16} />}
          data={examTypes.map((et) => ({ value: et.id.toString(), label: et.typeName }))}
          {...form.getInputProps('examTypeId')}
          onChange={(v) => form.setFieldValue('examTypeId', v ? parseInt(v, 10) : 0)}
          value={form.values.examTypeId?.toString()}
          required
        />

        <Divider label="Committee" labelPosition="center" />
        <ExamBoardManager form={form} examiners={examiners} />

        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
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

const DeleteExamModal = ({ exam }: { exam: IExam }) => {
  const { mutateAsync: deleteExam } = useDeleteExam();
  return (
    <Stack>
      <Text size="sm">
        Are you sure you want to delete exam <b>{exam.examName}</b>? This cannot be undone.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          Cancel
        </Button>
        <Button
          color="red"
          variant="filled"
          onClick={async () => {
            await deleteExam(exam.id);
            modals.close('delete-exam');
          }}
        >
          Delete Exam
        </Button>
      </Flex>
    </Stack>
  );
};

const ExamTable = () => {
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
    if (!start && !end) {return fetchedExams;}

    return fetchedExams.filter((exam) => {
      const currentExamDate = new Date(exam.examDate);

      if (start) {
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        if (currentExamDate < startDate) {return false;}
      }

      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        if (currentExamDate > endDate) {return false;}
      }
      return true;
    });
  }, [fetchedExams, dateRange]);

  const columns = useMemo<MRT_ColumnDef<IExam>[]>(
    () => [
      { accessorKey: 'examName', header: 'Exam Name', size: 200 },
      { accessorKey: 'examCode', header: 'Code', size: 100 },
      {
        accessorKey: 'examDate',
        header: 'Date',
        size: 120,
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString('en-CA'),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 120,
        Cell: ({ cell }) => {
          const status = cell.getValue<Status>();
          const colors = {
            [Status.PLANNED]: 'blue',
            [Status.ACTIVE]: 'green',
            [Status.POSTPONED]: 'yellow',
            [Status.COMPLETED]: 'gray',
          };
          return (
            <Badge color={colors[status]} variant="light">
              {STATUS_LABELS[status]}
            </Badge>
          );
        },
      },
      { accessorKey: 'professionName', header: 'Profession' },
      { accessorKey: 'institutionName', header: 'Institution' },
      { accessorKey: 'examTypeName', header: 'Type' },
      {
        accessorKey: 'examBoards',
        header: 'Staff',
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
    []
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
        <Tooltip label="Download PDF">
          <ActionIcon
            color="orange"
            variant="subtle"
            loading={isDownloading}
            onClick={() => downloadReport(row.original)}
          >
            <IconFileTypePdf size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Edit">
          <ActionIcon
            color="blue"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'edit-exam',
                title: <Text fw={700}>Edit Exam</Text>,
                children: <EditExamForm initialExam={row.original} />,
              })
            }
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'delete-exam',
                title: (
                  <Text fw={700} c="red">
                    Delete Exam
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
              title: <Text fw={700}>Create New Exam</Text>,
              children: <CreateExamForm />,
            })
          }
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
              notifications.show({ title: 'Error', message: 'Export failed', color: 'red' });
            } finally {
              setIsExporting(false);
            }
          }}
        >
          Export
        </Button>
        <DatePickerInput
          type="range"
          placeholder="Filter by date range"
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
        entityName="Exams"
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamFormData) => api.Exams.createExam(data),
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: 'Exam created successfully.',
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) =>
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || 'Creation failed.',
        color: 'red',
      }),
  });
}

function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ newValues, oldValues }: { newValues: IExam; oldValues: IExam }) => {
      const patch = generatePatchDocument(oldValues, newValues);
      if (patch.length > 0) {await api.Exams.updateExam(newValues.id, patch);}
      return newValues;
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: 'Exam updated successfully.',
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: () => notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }),
  });
}

function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Exams.deleteExam(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Exam removed.', color: 'teal' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

function useDownloadExamBoardReport() {
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
      notifications.show({ title: 'Generated', message: 'PDF download started.', color: 'teal' }),
    onError: () =>
      notifications.show({ title: 'Error', message: 'PDF generation failed.', color: 'red' }),
  });
}

const rootQueryClient = new QueryClient();

const ExamPage = () => (
  <MantineProvider>
    <QueryClientProvider client={rootQueryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Stack mb="lg">
            <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
              Exams
            </Title>
          </Stack>
          <ExamTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default ExamPage;

const validateRequired = (value: string | number) => {
  if (typeof value === 'string') {return !!value.length;}
  if (typeof value === 'number') {return value > 0;}
  return false;
};

const validateDate = (dateString: string) => {
  if (!dateString.length) {return false;}
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toString() !== 'Invalid Date';
};

const validateExamBoards = (examBoards: ExamBoardFormData[]) => {
  const errors: Record<string, string> = {};
  if (!examBoards || examBoards.length === 0) {
    errors['examBoards.general'] = 'At least one examiner is required';
    return errors;
  }
  examBoards.forEach((board, index) => {
    if (!validateRequired(board.examinerId))
      {errors[`examBoards.${index}.examinerId`] = 'Examiner is required';}
    if (!validateRequired(board.role)) {errors[`examBoards.${index}.role`] = 'Role is required';}
  });
  const examinerIds = examBoards.map((board) => board.examinerId).filter((id) => id > 0);
  const uniqueExaminerIds = new Set(examinerIds);
  if (examinerIds.length !== uniqueExaminerIds.size)
    {errors['examBoards.general'] = 'Duplicate examiners are not allowed';}
  return errors;
};

function validateExam(exam: ExamFormData) {
  const errors: Record<string, string> = {};
  if (!validateRequired(exam.examName)) {errors.examName = 'Exam name is required';}
  if (!validateRequired(exam.examCode)) {errors.examCode = 'Exam code is required';}
  if (!validateRequired(exam.examDate)) {
    errors.examDate = 'Exam date is required';
  } else if (!validateDate(exam.examDate)) {
    errors.examDate = 'Invalid date format';
  }
  if (!validateRequired(exam.professionId)) {errors.professionId = 'Profession is required';}
  if (!validateRequired(exam.institutionId)) {errors.institutionId = 'Institution is required';}
  if (!validateRequired(exam.examTypeId)) {errors.examTypeId = 'Exam type is required';}
  const examBoardErrors = validateExamBoards(exam.examBoards);
  Object.assign(errors, examBoardErrors);
  return errors;
}
