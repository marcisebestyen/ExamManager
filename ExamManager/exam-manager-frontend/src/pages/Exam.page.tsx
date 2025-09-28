import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';

import { useMemo, useState } from 'react';
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
  MRT_EditActionButtons,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
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
  Title,
  Tooltip,
} from '@mantine/core';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { ExamFormData, IExam, Status, STATUS_LABELS } from '../interfaces/IExam';
import { ExamBoardFormData } from '../interfaces/IExamBoard';

import '@mantine/notifications/styles.css';

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
  examBoards,
  onChange,
  validationErrors,
  setValidationErrors,
  examiners = [],
}: {
  examBoards: ExamBoardFormData[];
  onChange: (boards: ExamBoardFormData[]) => void;
  validationErrors: Record<string, string>;
  setValidationErrors: (errors: Record<string, string>) => void;
  examiners: any[];
}) => {
  const addExamBoard = () => {
    onChange([...examBoards, { examinerId: 0, role: '' }]);
  };

  const removeExamBoard = (index: number) => {
    const newBoards = examBoards.filter((_, i) => i !== index);
    onChange(newBoards);
  };

  const updateExamBoard = (index: number, field: 'examinerId' | 'role', value: any) => {
    const newBoards = [...examBoards];
    newBoards[index] = { ...newBoards[index], [field]: value };
    onChange(newBoards);

    const errorKey = `examBoards.${index}.${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors({ ...validationErrors, [errorKey]: '' });
    }
  };

  const examinerOptions = examiners.map((examiner) => ({
    value: examiner.id.toString(),
    label: `${examiner.firstName} ${examiner.lastName} (${examiner.identityCardNumber})`,
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
                  error={validationErrors[`examBoards.${index}.examinerId`]}
                  style={{ flex: 2 }}
                  required
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
                  error={validationErrors[`examBoards.${index}.role`]}
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
    </Stack>
  );
};

const ExamTable = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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

  const columns = useMemo<MRT_ColumnDef<IExam>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableEditing: false,
        enableCreating: false,
        size: 80,
      },
      {
        accessorKey: 'examName',
        header: 'Exam Name',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.examName || '',
          onFocus: () => setValidationErrors({ ...validationErrors, examName: '' }),
        },
      },
      {
        accessorKey: 'examCode',
        header: 'Exam Code',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.examCode || '',
          onFocus: () => setValidationErrors({ ...validationErrors, examCode: '' }),
        },
      },
      {
        accessorKey: 'examDate',
        header: 'Exam Date',
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString('en-CA'),
        mantineEditTextInputProps: {
          type: 'date',
          required: true,
          errors: validationErrors?.examDate || '',
          onFocus: () => setValidationErrors({ ...validationErrors, examDate: '' }),
        },
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
        Edit: ({ cell, column, row, table }) => {
          const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }));

          return (
            <Select
              data={statusOptions}
              value={cell.getValue<Status>().toString()}
              onChange={(value) => {
                row._valuesCache[column.id] = value ? parseInt(value, 10) : Status.PLANNED;
                // table.setEditingRow({ ...table.getState().editingRow });
                table.options.onEditingRowChange?.(row);
              }}
              error={validationErrors?.status || ''}
            />
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
        enableEditing: false,
        Cell: ({ row }) => (
          <Group gap="xs">
            <IconUsers size={16} />
            <Text size="sm">{row.original.examBoards.length}</Text>
          </Group>
        ),
      },
    ],
    [validationErrors, examiners, professions, institutions, examTypes]
  );

  const { mutateAsync: createExam, isPending: isCreatingExam } = useCreateExam();
  const {
    data: fetchedExams = [],
    isError: isLoadingExamsError,
    isFetching: isFetchingExams,
    isLoading: isLoadingExams,
  } = useGetExams();
  const { mutateAsync: updateExam, isPending: isUpdatingExam } = useUpdateExam();
  const { mutateAsync: deleteExam, isPending: isDeletingExam } = useDeleteExam();

  const handleCreateExam: MRT_TableOptions<IExam>['onCreatingRowSave'] = async ({
    values,
    exitCreatingMode,
  }) => {
    const examBoards = (values as any).examBoards || [{ examinerId: 0, role: '' }];
    const examData = { ...values, examBoards } as ExamFormData;

    const newValidationErrors = validateExam(examData);

    const isDuplicate = fetchedExams.some(
      (exam) => exam.examCode.toLowerCase() === values.examCode.toLowerCase()
    );

    if (isDuplicate) {
      notifications.show({
        title: 'Creation Failed',
        message: 'An exam with this code already exists. Please use a different exam code.',
        color: 'red',
      });
      setValidationErrors({
        ...validationErrors,
        examCode: 'An exam with this code already exists.',
      });
      return;
    }

    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }

    setValidationErrors({});
    await createExam(examData);
    exitCreatingMode();
  };

  const handleSaveExam: MRT_TableOptions<IExam>['onEditingRowSave'] = async ({
    values,
    row,
    table,
  }) => {
    const examBoards = (values as any).examBoards || row.original.examBoards;
    const examData = { ...values, examBoards };

    const newValidationErrors = validateExam(examData as ExamFormData);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});

    const oldValues = row.original as IExam;
    await updateExam({ newValues: examData as IExam, oldValues });
    table.setEditingRow(null);
  };

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
    createDisplayMode: 'modal',
    editDisplayMode: 'modal',
    enableEditing: true,
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
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateExam,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveExam,
    renderCreateRowModalContent: ({ table, row, internalEditComponents }) => {
      const [examBoards, setExamBoards] = useState<ExamBoardFormData[]>([
        { examinerId: 0, role: '' },
      ]);

      (row._valuesCache as any).examBoards = examBoards;

      return (
        <Stack>
          <Title order={3}>Create New Exam</Title>
          {internalEditComponents}

          <Divider />

          <Select
            label="Profession"
            placeholder="Select profession"
            data={professions.map((p) => ({ value: p.id.toString(), label: p.keorId }))}
            value={row._valuesCache.professionId?.toString() || ''}
            onChange={(value) => {
              row._valuesCache.professionId = value ? parseInt(value, 10) : 0;
              table.options.onEditingRowChange?.(row)
            }}
            error={validationErrors?.professionId}
            required
          />

          <Select
            label="Institution"
            placeholder="Select institution"
            data={institutions.map((i) => ({ value: i.id.toString(), label: i.educationalId }))}
            value={row._valuesCache.institutionId?.toString() || ''}
            onChange={(value) => {
              row._valuesCache.institutionId = value ? parseInt(value, 10) : 0;
              table.options.onEditingRowChange?.(row)
            }}
            error={validationErrors?.institutionId}
            required
          />

          <Select
            label="Exam Type"
            placeholder="Select exam type"
            data={examTypes.map((et) => ({ value: et.id.toString(), label: et.typeName }))}
            value={row._valuesCache.examTypeId?.toString() || ''}
            onChange={(value) => {
              row._valuesCache.examTypeId = value ? parseInt(value, 10) : 0;
              table.options.onEditingRowChange?.(row)
            }}
            error={validationErrors?.examTypeId}
            required
          />

          <Divider />

          <ExamBoardManager
            examBoards={examBoards}
            onChange={setExamBoards}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
            examiners={examiners}
          />

          <Flex justify="flex-end" mt="xl">
            <MRT_EditActionButtons variant="text" table={table} row={row} />
          </Flex>
        </Stack>
      );
    },
    renderEditRowModalContent: ({ table, row, internalEditComponents }) => {
      const [examBoards, setExamBoards] = useState<ExamBoardFormData[]>(
        row.original.examBoards.map((board) => ({
          examinerId: board.examinerId,
          role: board.role,
        })) || [{ examinerId: 0, role: '' }]
      );

      (row._valuesCache as any).examBoards = examBoards;

      return (
        <Stack>
          <Title order={3}>Edit Exam</Title>
          {internalEditComponents}

          <Divider />

          <Select
            label="Profession"
            placeholder="Select profession"
            data={professions.map((p) => ({ value: p.id.toString(), label: p.keorId }))}
            value={
              row._valuesCache.professionId?.toString() || row.original.professionId.toString()
            }
            onChange={(value) => {
              row._valuesCache.professionId = value ? parseInt(value, 10) : row.original.professionId;
              table.options.onEditingRowChange?.(row)
            }}
            error={validationErrors?.professionId}
            required
          />

          <Select
            label="Institution"
            placeholder="Select institution"
            data={institutions.map((i) => ({ value: i.id.toString(), label: i.educationalId }))}
            value={
              row._valuesCache.institutionId?.toString() || row.original.institutionId.toString()
            }
            onChange={(value) => {
              row._valuesCache.institutionId = value ? parseInt(value, 10) : row.original.institutionId;
              table.options.onEditingRowChange?.(row)
            }}
            error={validationErrors?.institutionId}
            required
          />

          <Select
            label="Exam Type"
            placeholder="Select exam type"
            data={examTypes.map((et) => ({ value: et.id.toString(), label: et.typeName }))}
            value={row._valuesCache.examTypeId?.toString() || row.original.examTypeId.toString()}
            onChange={(value) => {
              row._valuesCache.examTypeId = value ? parseInt(value, 10) : row.original.examTypeId;
              table.options.onEditingRowChange?.(row)
            }}
            error={validationErrors?.examTypeId}
            required
          />

          <Divider />

          <ExamBoardManager
            examBoards={examBoards}
            onChange={setExamBoards}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
            examiners={examiners}
          />

          <Flex justify="flex-end" mt="xl">
            <MRT_EditActionButtons variant="text" table={table} row={row} />
          </Flex>
        </Stack>
      );
    },
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
        Create New Exam
      </Button>
    ),
    state: {
      isLoading: isLoadingExams,
      isSaving: isCreatingExam || isUpdatingExam || isDeletingExam,
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
    }
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
    mutationFn: async ({
                         newValues,
                         oldValues,
                       }: {
      newValues: IExam;
      oldValues: IExam;
    }) => {
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
          prevExam.id === updatedExamInfo.newValues.id
            ? updatedExamInfo.newValues
            : prevExam
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
