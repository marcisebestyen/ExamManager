import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';

import { useMemo } from 'react';
import { IconEdit, IconPlus, IconTrash, IconUsers, IconX } from '@tabler/icons-react';
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
  Badge,
  Button,
  Divider,
  Flex,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm, type UseFormReturnType } from '@mantine/form';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { ExamBoardFormData, ExamFormData, IExam, Status, STATUS_LABELS } from '../interfaces/IExam';

import '@mantine/notifications/styles.css';

import { DateInput } from '@mantine/dates';

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
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
        patch.push({
          op: 'replace',
          path: `/${key}`,
          value: val,
        });
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

  const addExamBoard = () => {
    form.insertListItem('examBoards', { examinerId: 0, role: '' });
  };

  const removeExamBoard = (index: number) => {
    form.removeListItem('examBoards', index);
  };

  const updateExamBoard = (index: number, field: 'examinerId' | 'role', value: any) => {
    form.setFieldValue(`examBoards.${index}.${field}`, value);
  };

  const examinerOptions = examiners.map((examiner) => ({
    value: examiner.id.toString(),
    label: `${examiner.id} - ${examiner.firstName} ${examiner.lastName} (${examiner.identityCardNumber})`,
  }));

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={500}>Exam Boards</Text>
        <Button
          leftSection={<IconPlus size={16} />}
          variant="light"
          onClick={addExamBoard}
          size="xs"
        >
          Add Examiner
        </Button>
      </Group>

      <ScrollArea.Autosize mah={300}>
        <Stack gap="xs">
          {examBoards.map((board, index) => (
            <Paper key={index} p="sm" withBorder>
              <Flex align="end" gap="md">
                <Select
                  label="Examiner"
                  placeholder="Select examiner"
                  data={examinerOptions}
                  value={board.examinerId ? board.examinerId.toString() : ''}
                  onChange={(value) =>
                    updateExamBoard(index, 'examinerId', value ? parseInt(value, 10) : 0)
                  }
                  error={form.errors[`examBoards.${index}.examinerId`]}
                  style={{ flex: 2 }}
                  required
                  searchable
                />
                <Select
                  label="Role"
                  placeholder="Select role"
                  data={[
                    { value: 'Chief Examiner', label: 'Chief Examiner' },
                    { value: 'Deputy Chief Examiner', label: 'Deputy Chief Examiner' },
                    { value: 'Examiner', label: 'Examiner' },
                    { value: 'Assistant Examiner', label: 'Assistant Examiner' },
                    { value: 'External Examiner', label: 'External Examiner' },
                  ]}
                  value={board.role}
                  onChange={(value) => updateExamBoard(index, 'role', value || '')}
                  error={form.errors[`examBoards.${index}.role`]}
                  style={{ flex: 1 }}
                  required
                />
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => removeExamBoard(index)}
                  disabled={examBoards.length === 1}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Flex>
            </Paper>
          ))}

          {examBoards.length === 0 && (
            <Text c="dimmed" ta="center" py="md">
              No examiners added. Click "Add Examiner" to get started.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
      {form.errors['examBoards.general'] && (
        <Text c="red" size="sm">
          {form.errors['examBoards.general']}
        </Text>
      )}
    </Stack>
  );
};

const CreateExamForm = () => {
  const { data: examiners = [] } = useQuery({
    queryKey: ['examiners'],
    queryFn: async () => {
      const response = await api.Examiners.getAllExaminers();
      return response.data;
    },
  });
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const response = await api.Institutions.getAllInstitutions();
      return response.data;
    },
  });
  const { data: examTypes = [] } = useQuery({
    queryKey: ['examTypes'],
    queryFn: async () => {
      const response = await api.ExamTypes.getAllExamTypes();
      return response.data;
    },
  });
  const { data: professions = [] } = useQuery({
    queryKey: ['professions'],
    queryFn: async () => {
      const response = await api.Professions.getAllProfessions();
      return response.data;
    },
  });
  const { data: fetchedExams = [] } = useGetExams();
  const { mutateAsync: createExam } = useCreateExam();

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
    const lowerCode = values.examCode.toLowerCase();
    if (fetchedExams.some((exam) => exam.examCode.toLowerCase() === lowerCode)) {
      form.setFieldError('examCode', 'An exam with this code already exists.');
      return;
    }
    await createExam(values);
    modals.close('create-exam');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Exam Name" {...form.getInputProps('examName')} required />
        <TextInput label="Exam Code" {...form.getInputProps('examCode')} required />
        <DateInput
          label="Exam Date"
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('examDate')}
          required
        />
        <Select
          label="Status"
          data={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          value={form.values.status.toString()}
          onChange={(value) => form.setFieldValue('status', value ? parseInt(value, 10) : 0)}
          error={form.errors.status}
          required
        />
        <Select
          label="Profession"
          placeholder="Select profession"
          data={professions.map((p) => ({
            value: p.id.toString(),
            label: `${p.id} - ${p.professionName}`,
          }))}
          value={form.values.professionId ? form.values.professionId.toString() : ''}
          onChange={(value) => form.setFieldValue('professionId', value ? parseInt(value, 10) : 0)}
          error={form.errors.professionId}
          searchable
          required
        />
        <Select
          label="Institution"
          placeholder="Select institution"
          data={institutions.map((i) => ({
            value: i.id.toString(),
            label: `${i.id} - ${i.name}`,
          }))}
          value={form.values.institutionId ? form.values.institutionId.toString() : ''}
          onChange={(value) => form.setFieldValue('institutionId', value ? parseInt(value, 10) : 0)}
          error={form.errors.institutionId}
          searchable
          required
        />
        <Select
          label="Exam Type"
          placeholder="Select exam type"
          data={examTypes.map((et) => ({
            value: et.id.toString(),
            label: `${et.id} - ${et.typeName}`,
          }))}
          value={form.values.examTypeId ? form.values.examTypeId.toString() : ''}
          onChange={(value) => form.setFieldValue('examTypeId', value ? parseInt(value, 10) : 0)}
          error={form.errors.examTypeId}
          searchable
          required
        />
        <Divider />
        <ExamBoardManager form={form} examiners={examiners} />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" mr="xs">
            Create
          </Button>
          <Button variant="outline" onClick={() => modals.close('create-exam')}>
            Cancel
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditExamForm = ({ initialExam }: { initialExam: IExam }) => {
  const { data: examiners = [] } = useQuery({
    queryKey: ['examiners'],
    queryFn: async () => {
      const response = await api.Examiners.getAllExaminers();
      return response.data;
    },
  });
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const response = await api.Institutions.getAllInstitutions();
      return response.data;
    },
  });
  const { data: examTypes = [] } = useQuery({
    queryKey: ['examTypes'],
    queryFn: async () => {
      const response = await api.ExamTypes.getAllExamTypes();
      return response.data;
    },
  });
  const { data: professions = [] } = useQuery({
    queryKey: ['professions'],
    queryFn: async () => {
      const response = await api.Professions.getAllProfessions();
      return response.data;
    },
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
      examBoards: initialExam.examBoards.map((board) => ({
        examinerId: board.examinerId,
        role: board.role,
      })),
    },
    validate: validateExam,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const lowerCode = values.examCode.toLowerCase();
    if (
      fetchedExams.some(
        (exam) => exam.id !== initialExam.id && exam.examCode.toLowerCase() === lowerCode
      )
    ) {
      form.setFieldError('examCode', 'An exam with this code already exists.');
      return;
    }
    const newValues = {
      ...initialExam,
      ...values,
      examBoards: values.examBoards,
    } as IExam; // Cast to handle type mismatch for examBoards
    await updateExam({ newValues, oldValues: initialExam });
    modals.close('edit-exam');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Exam Name" {...form.getInputProps('examName')} required />
        <TextInput label="Exam Code" {...form.getInputProps('examCode')} required />
        <DateInput
          label="Exam Date"
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('examDate')}
          required
        />
        <Select
          label="Status"
          data={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          value={form.values.status.toString()}
          onChange={(value) => form.setFieldValue('status', value ? parseInt(value, 10) : 0)}
          error={form.errors.status}
          required
        />
        <Select
          label="Profession"
          placeholder="Select profession"
          data={professions.map((p) => ({
            value: p.id.toString(),
            label: `${p.id} - ${p.professionName}`,
          }))}
          value={form.values.professionId ? form.values.professionId.toString() : ''}
          onChange={(value) => form.setFieldValue('professionId', value ? parseInt(value, 10) : 0)}
          error={form.errors.professionId}
          searchable
          required
        />
        <Select
          label="Institution"
          placeholder="Select institution"
          data={institutions.map((i) => ({
            value: i.id.toString(),
            label: `${i.id} - ${i.name}`,
          }))}
          value={form.values.institutionId ? form.values.institutionId.toString() : ''}
          onChange={(value) => form.setFieldValue('institutionId', value ? parseInt(value, 10) : 0)}
          error={form.errors.institutionId}
          searchable
          required
        />
        <Select
          label="Exam Type"
          placeholder="Select exam type"
          data={examTypes.map((et) => ({
            value: et.id.toString(),
            label: `${et.id} - ${et.typeName}`,
          }))}
          value={form.values.examTypeId ? form.values.examTypeId.toString() : ''}
          onChange={(value) => form.setFieldValue('examTypeId', value ? parseInt(value, 10) : 0)}
          error={form.errors.examTypeId}
          searchable
          required
        />
        <Divider />
        <ExamBoardManager form={form} examiners={examiners} />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" mr="xs">
            Save
          </Button>
          <Button variant="outline" onClick={() => modals.close('edit-exam')}>
            Cancel
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const ExamTable = () => {
  const {
    data: fetchedExams = [],
    isError: isLoadingExamsError,
    isFetching: isFetchingExams,
    isLoading: isLoadingExams,
  } = useGetExams();
  const { mutateAsync: deleteExam, isPending: isDeletingExam } = useDeleteExam();

  const columns = useMemo<MRT_ColumnDef<IExam>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 80,
      },
      {
        accessorKey: 'examName',
        header: 'Exam Name',
      },
      {
        accessorKey: 'examCode',
        header: 'Exam Code',
      },
      {
        accessorKey: 'examDate',
        header: 'Exam Date',
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString('en-CA'),
      },
      {
        accessorKey: 'status',
        header: 'Status',
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
      {
        accessorKey: 'professionName',
        header: 'Profession Name',
        Cell: ({ row }) => row.original.professionName,
      },
      {
        accessorKey: 'institutionName',
        header: 'Institution Name',
        Cell: ({ row }) => row.original.institutionName,
      },
      {
        accessorKey: 'examType',
        header: 'Exam Type',
        Cell: ({ row }) => row.original.examTypeName,
      },
      {
        accessorKey: 'examBoards',
        header: 'Examiners',
        Cell: ({ row }) => (
          <Group gap="xs">
            <IconUsers size={16} />
            <Text size="sm">{row.original.examBoards.length}</Text>
          </Group>
        ),
      },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-exam',
      title: <Title order={3}>Create New Exam</Title>,
      children: <CreateExamForm />,
    });

  const openEditModal = (exam: IExam) =>
    modals.open({
      id: 'edit-exam',
      title: <Title order={3}>Edit Exam</Title>,
      children: <EditExamForm initialExam={exam} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IExam>) =>
    modals.openConfirmModal({
      title: 'Are you sure you want to delete this exam?',
      children: (
        <Text>
          Are you sure you want to delete exam "{row.original.examName}" ({row.original.examCode})?
          This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteExam(row.original.id),
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedExams,
    enableEditing: false,
    enableRowActions: true, // Add this to enable the row actions column
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingExamsError
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
      isLoading: isLoadingExams,
      isSaving: isDeletingExam,
      showAlertBanner: isLoadingExamsError,
      showProgressBars: isFetchingExams,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examData: ExamFormData) => {
      console.log('Sending data: ', examData);

      const cleanedData = {
        examName: examData.examName,
        examCode: examData.examCode,
        examDate: examData.examDate,
        status: examData.status,
        professionId: examData.professionId,
        institutionId: examData.institutionId,
        examTypeId: examData.examTypeId,
        examBoards: examData.examBoards,
      };

      console.log('Final cleaned data being sent to API: ', cleanedData);

      return await api.Exams.createExam(cleanedData);
    },
    onSuccess: (createExam) => {
      notifications.show({
        title: 'Success!',
        message: `Exam "${createExam.examName}" created successfully.`,
        color: 'teal',
      });
      queryClient.setQueryData(
        ['exams'],
        (prevExams: any) => [...prevExams, createExam] as IExam[]
      );
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create exam. Please try again.',
        color: 'red',
      });
    },
  });
}

function useGetExams() {
  return useQuery<IExam[]>({
    queryKey: ['exams'],
    queryFn: async () => {
      const response = await api.Exams.getAllExams();
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
}

function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ newValues, oldValues }: { newValues: IExam; oldValues: IExam }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.Exams.updateExam(newValues.id, patchDocument);
      }
      return newValues;
    },
    onMutate: async (updatedExamInfo) => {
      await queryClient.cancelQueries({ queryKey: ['exams'] });
      const previousExams = queryClient.getQueryData(['exams']);
      queryClient.setQueryData(['exams'], (prevExams: any) =>
        prevExams?.map((prevExam: IExam) =>
          prevExam.id === updatedExamInfo.newValues.id ? updatedExamInfo.newValues : prevExam
        )
      );
      return { previousExams };
    },
    onError: (err, updatedExamInfo, context) => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update exam. Please try again.',
        color: 'red',
      });
      queryClient.setQueryData(['exams'], context?.previousExams);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onSuccess: (updatedExam) => {
      notifications.show({
        title: 'Success!',
        message: `Exam "${updatedExam.examName}" updated successfully.`,
        color: 'teal',
      });
    },
  });
}

function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examId: number) => {
      await api.Exams.deleteExam(examId);
      return examId;
    },
    onMutate: (examId: number) => {
      queryClient.setQueryData(['exams'], (prevExams: any) =>
        prevExams?.filter((exam: IExam) => exam.id !== examId)
      );
    },
    onSuccess: (deletedExamId) => {
      notifications.show({
        title: 'Success!',
        message: `Exam with ID ${deletedExamId} successfully deleted.`,
        color: 'teal',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

const queryClient = new QueryClient();

const ExamPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Title order={2}>Exams</Title>
          <ExamTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
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

const validateExamBoards = (examBoards: ExamBoardFormData[]) => {
  const errors: Record<string, string> = {};

  if (!examBoards || examBoards.length === 0) {
    errors['examBoards.general'] = 'At least one examiner is required';
    return errors;
  }

  examBoards.forEach((board, index) => {
    if (!validateRequired(board.examinerId)) {
      errors[`examBoards.${index}.examinerId`] = 'Examiner is required';
    }
    if (!validateRequired(board.role)) {
      errors[`examBoards.${index}.role`] = 'Role is required';
    }
  });

  const examinerIds = examBoards.map((board) => board.examinerId).filter((id) => id > 0);
  const uniqueExaminerIds = new Set(examinerIds);
  if (examinerIds.length !== uniqueExaminerIds.size) {
    errors['examBoards.general'] = 'Duplicate examiners are not allowed';
  }

  return errors;
};

function validateExam(exam: ExamFormData) {
  const errors: Record<string, string> = {};

  if (!validateRequired(exam.examName)) {
    errors.examName = 'Exam name is required';
  }
  if (!validateRequired(exam.examCode)) {
    errors.examCode = 'Exam code is required';
  }
  if (!validateRequired(exam.examDate)) {
    errors.examDate = 'Exam date is required';
  } else if (!validateDate(exam.examDate)) {
    errors.examDate = 'Invalid date format';
  }

  if (!validateRequired(exam.professionId)) {
    errors.professionId = 'Profession is required';
  }
  if (!validateRequired(exam.institutionId)) {
    errors.institutionId = 'Institution is required';
  }
  if (!validateRequired(exam.examTypeId)) {
    errors.examTypeId = 'Exam type is required';
  }

  const examBoardErrors = validateExamBoards(exam.examBoards);
  Object.assign(errors, examBoardErrors);

  return errors;
}
