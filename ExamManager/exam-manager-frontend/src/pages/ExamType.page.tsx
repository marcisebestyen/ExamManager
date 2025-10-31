import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo } from 'react';
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
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from 'mantine-react-table';
import {
  ActionIcon,
  Button,
  Flex,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { ExamTypeFormData, IExamType } from '../interfaces/IExamType';

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
}

const generatePatchDocument = (oldData: IExamType, newData: IExamType): JsonPatchOperation[] => {
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

const CreateExamTypeForm = () => {
  const { data: fetchedExamTypes = [] } = useGetExamTypes();
  const { mutateAsync: createExamType } = useCreateExamType();

  const form = useForm<ExamTypeFormData>({
    initialValues: {
      typeName: '',
      description: '',
    },
    validate: validateExamType,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExamTypes.some(
      (examType) => examType.typeName.toLowerCase() === values.typeName.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('typeName', 'An exam type with this name already exists.');
      return;
    }
    await createExamType(values);
    modals.close('create-exam-type');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Exam Type Name" {...form.getInputProps('typeName')} required />
        <Textarea label="Description" {...form.getInputProps('description')} minRows={3} autosize />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant="outline" radius="md" mr="xs">
            Create
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditExamTypeForm = ({ initialExamType }: { initialExamType: IExamType }) => {
  const { data: fetchedExamTypes = [] } = useGetExamTypes();
  const { mutateAsync: updateExamType } = useUpdateExamType();

  const form = useForm<ExamTypeFormData>({
    initialValues: {
      typeName: initialExamType.typeName,
      description: initialExamType.description,
    },
    validate: validateExamType,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExamTypes.some(
      (examType) =>
        examType.id !== initialExamType.id &&
        examType.typeName.toLowerCase() === values.typeName.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('typeName', 'An exam type with this name already exists.');
      return;
    }
    const newValues: IExamType = { ...initialExamType, ...values };
    await updateExamType({ newValues, oldValues: initialExamType });
    modals.close('edit-exam-type');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Exam Type Name" {...form.getInputProps('typeName')} required />
        <Textarea label="Description" {...form.getInputProps('description')} minRows={3} autosize />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant="outline" radius="md" mr="xs">
            Save
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const DeleteExamTypeModal = ({ examType }: { examType: IExamType }) => {
  const { mutateAsync: deleteExamType } = useDeleteExamType();

  const handleDelete = async () => {
    await deleteExamType(examType.id);
    modals.close('delete-exam-type');
  };

  return (
    <Stack>
      <Text>
        Are you sure you want to delete "{examType.typeName}"? This action cannot be undone.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button color="red" variant="outline" radius="md" mr="xs" onClick={handleDelete}>
          Delete
        </Button>
      </Flex>
    </Stack>
  );
};

const ExamTypeTable = () => {
  const {
    data: fetchedExamTypes = [],
    isError: isLoadingExamTypesError,
    isFetching: isFetchingExamTypes,
    isLoading: isLoadingExamTypes,
  } = useGetExamTypes();
  const { mutateAsync: deleteExamType, isPending: isDeletingExamType } = useDeleteExamType();

  const columns = useMemo<MRT_ColumnDef<IExamType>[]>(
    () => [
      {
        accessorKey: 'typeName',
        header: 'Exam Type Name',
      },
      {
        accessorKey: 'description',
        header: 'Description',
      },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-exam-type',
      title: <Title order={3}>Create New Exam Type</Title>,
      children: <CreateExamTypeForm />,
    });

  const openEditModal = (examType: IExamType) =>
    modals.open({
      id: 'edit-exam-type',
      title: <Title order={3}>Edit Exam Type</Title>,
      children: <EditExamTypeForm initialExamType={examType} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IExamType>) =>
    modals.open({
      id: 'delete-exam-type',
      title: <Title order={3}>Delete Exam Type</Title>,
      children: <DeleteExamTypeModal examType={row.original} />,
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedExamTypes,
    enableEditing: false,
    enableRowActions: true,
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingExamTypesError
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
      <Button variant="outline" radius="md" onClick={openCreateModal}>
        Create New Entry
      </Button>
    ),
    state: {
      isLoading: isLoadingExamTypes,
      isSaving: isDeletingExamType,
      showAlertBanner: isLoadingExamTypesError,
      showProgressBars: isFetchingExamTypes,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateExamType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examTypeData: ExamTypeFormData) => api.ExamTypes.createExamType(examTypeData),
    onSuccess: (createdExamType) => {
      notifications.show({
        title: 'Success!',
        message: `Exam Type "${createdExamType.typeName}" created successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create exam type.',
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
    refetchOnWindowFocus: false,
  });
}

function useUpdateExamType() {
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
        title: 'Success!',
        message: `Exam Type "${updatedExamType.typeName}" updated successfully.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
    },
    onError: () => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update exam type. Please try again.',
        color: 'red',
      });
    },
  });
}

function useDeleteExamType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examTypeId: number) =>
      api.ExamTypes.deleteExamType(examTypeId).then(() => examTypeId),
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: `Exam type successfully deleted.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
    },
    onError: () => {
      notifications.show({
        title: 'Deletion Failed',
        message: 'Could not delete exam type. Please try again.',
        color: 'red',
      });
    },
  });
}

const queryClient = new QueryClient();

const ExamTypePage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Title order={2}>Exam Types</Title>
          <ExamTypeTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  );
};

export default ExamTypePage;

const validateRequired = (value: string) => !!value.trim().length;

function validateExamType(examType: ExamTypeFormData) {
  const errors: { typeName?: string } = {};
  if (!validateRequired(examType.typeName)) {
    errors.typeName = 'Exam Type Name is required';
  }
  return errors;
}
