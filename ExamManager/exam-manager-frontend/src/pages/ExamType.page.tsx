import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import { useMemo, useState } from 'react';
import {
  MRT_EditActionButtons,
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
  useMantineReactTable,
} from 'mantine-react-table';
import {
  ActionIcon,
  Button,
  Flex,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { ModalsProvider, modals } from '@mantine/modals';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { IExamType, ExamTypeFormData } from '../interfaces/IExamType';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';

// This interface defines the structure for a JSON Patch document, which is used
// to send partial updates to the server.
interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
}

// This helper function compares the old and new data to create a JSON Patch
// document containing only the changed fields.
const generatePatchDocument = (oldData: IExamType, newData: IExamType): JsonPatchOperation[] => {
  const patch: JsonPatchOperation[] = [];
  for (const key in newData) {
    if (Object.prototype.hasOwnProperty.call(newData, key) && (newData as any)[key] !== (oldData as any)[key]) {
      patch.push({
        op: 'replace',
        path: `/${key}`,
        value: (newData as any)[key],
      });
    }
  }
  return patch;
};

const ExamTypeTable = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({});

  const columns = useMemo<MRT_ColumnDef<IExamType>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'typeName',
        header: 'Exam Type Name',
        mantineEditTextInputProps: {
          required: true,
          error: validationErrors?.typeName,
          onFocus: () => setValidationErrors({ ...validationErrors, typeName: undefined }),
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        mantineEditTextInputProps: {
          required: true,
          error: validationErrors?.description,
          onFocus: () => setValidationErrors({ ...validationErrors, description: undefined }),
        },
      },
    ],
    [validationErrors],
  );

  const { mutateAsync: createExamType, isPending: isCreatingExamType } = useCreateExamType();
  const {
    data: fetchedExamTypes = [],
    isError: isLoadingExamTypesError,
    isFetching: isFetchingExamTypes,
    isLoading: isLoadingExamTypes,
  } = useGetExamTypes();
  const { mutateAsync: updateExamType, isPending: isUpdatingExamType } = useUpdateExamType();
  const { mutateAsync: deleteExamType, isPending: isDeletingExamType } = useDeleteExamType();

  const handleCreateExamType: MRT_TableOptions<IExamType>['onCreatingRowSave'] = async ({ values, exitCreatingMode }) => {
    const newValidationErrors = validateExamType(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await createExamType(values);
    exitCreatingMode();
  };

  const handleSaveExamType: MRT_TableOptions<IExamType>['onEditingRowSave'] = async ({ values, row, table }) => {
    const newValidationErrors = validateExamType(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});

    const oldValues = row.original as IExamType;
    await updateExamType({ newValues: values, oldValues });
    table.setEditingRow(null);
  };

  const openDeleteConfirmModal = (row: MRT_Row<IExamType>) =>
    modals.openConfirmModal({
      title: 'Are you sure you want to delete this exam type?',
      children: (
        <Text>
          Are you sure you want to delete {row.original.typeName}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteExamType(row.original.id),
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedExamTypes,
    createDisplayMode: 'modal',
    editDisplayMode: 'modal',
    enableEditing: true,
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
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateExamType,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveExamType,
    renderCreateRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Create New Exam Type</Title>
        {internalEditComponents}
        <Flex justify="flex-end" mt="xl">
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </Flex>
      </Stack>
    ),
    renderEditRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Edit Exam Type</Title>
        {internalEditComponents}
        <Flex justify="flex-end" mt="xl">
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </Flex>
      </Stack>
    ),
    renderRowActions: ({ row, table }) => (
      <Flex gap="md">
        <Tooltip label="Edit">
          <ActionIcon onClick={() => table.setEditingRow(row)}>
            <IconEdit />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon color="red" onClick={() => openDeleteConfirmModal(row)}>
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        onClick={() => {
          table.setCreatingRow(true);
        }}
      >
        Create New Exam Type
      </Button>
    ),
    state: {
      isLoading: isLoadingExamTypes,
      isSaving: isCreatingExamType || isUpdatingExamType || isDeletingExamType,
      showAlertBanner: isLoadingExamTypesError,
      showProgressBars: isFetchingExamTypes,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateExamType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examTypeData: ExamTypeFormData) => {
      const createdExamType = await api.ExamTypes.createExamType(examTypeData);
      return createdExamType;
    },
    onSuccess: (createdExamType) => {
      queryClient.setQueryData(
        ['examTypes'],
        (prevExamTypes: any) =>
          [...prevExamTypes, createdExamType] as IExamType[],
      );
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
    mutationFn: async ({ newValues, oldValues }: { newValues: IExamType, oldValues: IExamType }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.ExamTypes.updateExamType(newValues.id, patchDocument);
      }
      return newValues;
    },
    onMutate: async (updatedExamTypeInfo) => {
      await queryClient.cancelQueries({ queryKey: ['examTypes'] });
      const previousExamTypes = queryClient.getQueryData(['examTypes']);
      queryClient.setQueryData(['examTypes'], (prevExamTypes: any) =>
        prevExamTypes?.map((prevExamType: IExamType) =>
          prevExamType.id === updatedExamTypeInfo.newValues.id ? updatedExamTypeInfo.newValues : prevExamType,
        ),
      );
      return { previousExamTypes };
    },
    onError: (err, updatedExamTypeInfo, context) => {
      queryClient.setQueryData(['examTypes'], context?.previousExamTypes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
    },
  });
}

function useDeleteExamType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examTypeId: number) => {
      await api.ExamTypes.deleteExamType(examTypeId);
      return examTypeId;
    },
    onMutate: (examTypeId: number) => {
      queryClient.setQueryData(['examTypes'], (prevExamTypes: any) =>
        prevExamTypes?.filter((examType: IExamType) => examType.id !== examTypeId),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['examTypes'] });
    },
  });
}

const queryClient = new QueryClient();

const ExamTypePage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Skeleton>
          <Title order={2}>Exam Types</Title>
          <ExamTypeTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  );
};

export default ExamTypePage;

const validateRequired = (value: string) => !!value.length;

function validateExamType(examType: IExamType) {
  return {
    typeName: !validateRequired(examType.typeName) ? 'Exam Type Name is Required' : '',
    description: !validateRequired(examType.description) ? 'Description is Required' : '',
  };
}
