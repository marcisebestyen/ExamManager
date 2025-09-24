import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';

import { useMemo, useState } from 'react';
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
  MRT_EditActionButtons,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
} from 'mantine-react-table';
import { ActionIcon, Button, Flex, Stack, Text, Title, Tooltip } from '@mantine/core';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import { ExaminerFormData, IExaminer } from '../interfaces/IExaminer';

import '@mantine/notifications/styles.css';

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

      patch.push({
        op: 'replace',
        path: `/${key}`,
        value: val,
      });
    }
  }
  return patch;
};

const ExaminerTable = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({});

  const columns = useMemo<MRT_ColumnDef<IExaminer>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableEditing: false,
        enableCreating: false,
        size: 80,
      },
      {
        accessorKey: 'firstName',
        header: 'First Name',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.firstName,
          onFocus: () => setValidationErrors({ ...validationErrors, firstName: undefined }),
        },
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.lastName,
          onFocus: () => setValidationErrors({ ...validationErrors, lastName: undefined }),
        },
      },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString('en-CA'),
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.dateOfBirth,
          onFocus: () => setValidationErrors({ ...validationErrors, dateOfBirth: undefined }),
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        mantineEditTextInputProps: {
          type: 'email',
          required: true,
          errors: validationErrors?.email,
          onFocus: () => setValidationErrors({ ...validationErrors, email: undefined }),
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        mantineEditTextInputProps: {
          type: 'tel',
          required: true,
          errors: validationErrors?.phone,
          onFocus: () => setValidationErrors({ ...validationErrors, phone: undefined }),
        },
      },
      {
        accessorKey: 'identityCardNumber',
        header: 'ID Card Number',
        mantineEditTextInputProps: {
          required: true,
          errors: validationErrors?.idCardNumber,
          onFocus: () => setValidationErrors({ ...validationErrors, idCardNumber: undefined }),
        },
      },
    ],
    [validationErrors]
  );

  const { mutateAsync: createExaminer, isPending: isCreatingExaminer } = useCreateExaminer();
  const {
    data: fetchedExaminers = [],
    isError: isLoadingExaminersError,
    isFetching: isFetchingExaminers,
    isLoading: isLoadingExaminers,
  } = useGetExaminers();
  const { mutateAsync: updateExaminer, isPending: isUpdatingExaminer } = useUpdateExaminer();
  const { mutateAsync: deleteExaminer, isPending: isDeletingExaminer } = useDeleteExaminer();

  const handleCreateExaminer: MRT_TableOptions<IExaminer>['onCreatingRowSave'] = async ({
    values,
    exitCreatingMode,
  }) => {
    const newValidationErrors = validateExaminer(values);

    const isDuplicate = fetchedExaminers.some(
      (examiner) => examiner.identityCardNumber.toLowerCase() === values.identityCardNumber.toLowerCase()
    );

    if (isDuplicate) {
      notifications.show({
        title: 'Creation Failed',
        message:
          'An examiner with this ID card number already exists. Please use a different ID card number.',
        color: 'red',
      });
      setValidationErrors({
        ...validationErrors,
        identityCardNumber: 'An examiner with this ID card number already exists.',
      });
      return;
    }

    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }

    setValidationErrors({});
    await createExaminer(values as ExaminerFormData);
    exitCreatingMode();
  };

  const handleSaveExaminer: MRT_TableOptions<IExaminer>['onEditingRowSave'] = async ({
    values,
    row,
    table,
  }) => {
    const newValidationErrors = validateExaminer(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});

    const oldValues = row.original as IExaminer;
    await updateExaminer({ newValues: values, oldValues });
    table.setEditingRow(null);
  };

  const openDeleteConfirmModal = (row: MRT_Row<IExaminer>) =>
    modals.openConfirmModal({
      title: 'Are you sure you want to delete this examiner?',
      children: (
        <Text>
          Are you sure you want to delete {row.original.identityCardNumber}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteExaminer(row.original.id),
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedExaminers,
    createDisplayMode: 'modal',
    editDisplayMode: 'modal',
    enableEditing: true,
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingExaminersError
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
    onCreatingRowSave: handleCreateExaminer,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveExaminer,
    renderCreateRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Create New Examiner</Title>
        {internalEditComponents}
        <Flex justify="flex-end" mt="xl">
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </Flex>
      </Stack>
    ),
    renderEditRowModalContent: ({ table, row, internalEditComponents }) => (
      <Stack>
        <Title order={3}>Edit Examiner</Title>
        {internalEditComponents}
        <Flex justify="flex-end" mt="xl">
          <MRT_EditActionButtons variant="text" table={table} row={row} />
        </Flex>
      </Stack>
    ),
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
        Create New Entry
      </Button>
    ),
    state: {
      isLoading: isLoadingExaminers,
      isSaving: isCreatingExaminer || isUpdatingExaminer || isDeletingExaminer,
      showAlertBanner: isLoadingExaminersError,
      showProgressBars: isFetchingExaminers,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateExaminer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examinerData: ExaminerFormData) => {
      return await api.Examiners.createExaminer(examinerData);
    },
    onSuccess: (createExaminer) => {
      notifications.show({
        title: 'Success!',
        message: `${createExaminer.identityCardNumber} created successfully.`,
        color: 'teal',
      });
      queryClient.setQueryData(
        ['examiners'],
        (prevExaminer: any) => [...prevExaminer, createExaminer] as IExaminer[]
      );
    },
  });
}

function useGetExaminers() {
  return useQuery<IExaminer[]>({
    queryKey: ['examiners'],
    queryFn: async () => {
      const response = await api.Examiners.getAllExaminers();
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
}

function useUpdateExaminer() {
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
    onMutate: async (updatedExaminerInfo) => {
      await queryClient.cancelQueries({ queryKey: ['examiners'] });
      const previousExaminers = queryClient.getQueryData(['examiners']);
      queryClient.setQueryData(['examiners'], (prevExaminers: any) =>
        prevExaminers?.map((prevExaminer: IExaminer) =>
          prevExaminer.id === updatedExaminerInfo.newValues.id
            ? updatedExaminerInfo.newValues
            : prevExaminer
        )
      );
      return { previousExaminers };
    },
    onError: (err, updatedExaminerInfo, context) => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update examiner. Please try again.',
        color: 'red',
      });
      queryClient.setQueryData(['examiners'], context?.previousExaminers);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
    },
    onSuccess: (updatedExaminer) => {
      notifications.show({
        title: 'Success!',
        message: `${updatedExaminer.identityCardNumber} updated successfully.`,
        color: 'teal',
      });
    },
  });
}

function useDeleteExaminer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examinerId: number) => {
      await api.Examiners.deleteExaminer(examinerId);
      return examinerId;
    },
    onMutate: (examinerId: number) => {
      queryClient.setQueryData(['examiners'], (prevExaminers: any) =>
        prevExaminers?.filter((examiner: IExaminer) => examiner.id !== examinerId)
      );
    },
    onSuccess: (deletedExaminerId) => {
      notifications.show({
        title: 'Success!',
        message: `Examiner with ID ${deletedExaminerId} successfully deleted.`,
        color: 'teal',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
    },
  });
}

const queryClient = new QueryClient();

const ExaminerPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Title order={2}>Examiners</Title>
          <ExaminerTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  );
};

export default ExaminerPage;

const validateRequired = (value: string) => !!value.length;

const validateDate = (dateString: string) => {
  if (!dateString.length) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toString() !== 'Invalid Date';
};

const validateDateRange = (dateString: string) => {
  if (!validateDate(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  const now = new Date();
  const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());

  return date >= minAge && date <= now;
};

function validateExaminer(examiner: IExaminer) {
  return {
    firstName: !validateRequired(examiner.firstName) ? 'First name is required' : '',
    lastName: !validateRequired(examiner.lastName) ? 'Last name is required' : '',
    dateOfBirth: !validateRequired(examiner.dateOfBirth)
      ? 'Date of birth is required'
      : !validateDate(examiner.dateOfBirth)
        ? 'Invalid date format'
        : !validateDateRange(examiner.dateOfBirth)
          ? 'Date must be a valid past date'
          : '',
    email: !validateRequired(examiner.email) ? 'Email is required' : '',
    phone: !validateRequired(examiner.phone) ? 'Phone is required' : '',
    identityCardNumber: !validateRequired(examiner.identityCardNumber) ? 'ID card number is required' : '',
  };
}
