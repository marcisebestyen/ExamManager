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
import { ActionIcon, Button, Flex, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
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
      patch.push({
        op: 'replace',
        path: `/${key}`,
        value: val,
      });
    }
  }
  return patch;
};

const CreateExaminerForm = () => {
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
    validate: validateExaminer,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExaminers.some(
      (examiner) =>
        examiner.identityCardNumber.toLowerCase() === values.identityCardNumber.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError(
        'identityCardNumber',
        'An examiner with this ID card number already exists.'
      );
      return;
    }
    await createExaminer(values);
    modals.close('create-examiner');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="First Name" {...form.getInputProps('firstName')} required />
        <TextInput label="Last Name" {...form.getInputProps('lastName')} required />
        <DateInput
          label="Date of Birth"
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('dateOfBirth')}
          required
        />
        <TextInput label="Email" type="email" {...form.getInputProps('email')} required />
        <TextInput label="Phone" type="tel" {...form.getInputProps('phone')} required />
        <TextInput label="ID Card Number" {...form.getInputProps('identityCardNumber')} required />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant='outline' radius='md' mr="xs">
            Create
          </Button>
          <Button variant="subtle" radius='md' onClick={() => modals.close('create-examiner')}>
            Cancel
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditExaminerForm = ({ initialExaminer }: { initialExaminer: IExaminer }) => {
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
    validate: validateExaminer,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedExaminers.some(
      (examiner) =>
        examiner.id !== initialExaminer.id &&
        examiner.identityCardNumber.toLowerCase() === values.identityCardNumber.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError(
        'identityCardNumber',
        'An examiner with this ID card number already exists.'
      );
      return;
    }
    const newValues: IExaminer = { ...initialExaminer, ...values };
    await updateExaminer({ newValues, oldValues: initialExaminer });
    modals.close('edit-examiner');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="First Name" {...form.getInputProps('firstName')} required />
        <TextInput label="Last Name" {...form.getInputProps('lastName')} required />
        <DateInput
          label="Date of Birth"
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('dateOfBirth')}
          required
        />
        <TextInput label="Email" type="email" {...form.getInputProps('email')} required />
        <TextInput label="Phone" type="tel" {...form.getInputProps('phone')} required />
        <TextInput label="ID Card Number" {...form.getInputProps('identityCardNumber')} required />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant='outline' radius='md' mr="xs">
            Save
          </Button>
          <Button variant="subtle" radius='md' onClick={() => modals.close('edit-examiner')}>
            Cancel
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const ExaminerTable = () => {
  const {
    data: fetchedExaminers = [],
    isError: isLoadingExaminersError,
    isFetching: isFetchingExaminers,
    isLoading: isLoadingExaminers,
  } = useGetExaminers();
  const { mutateAsync: deleteExaminer, isPending: isDeletingExaminer } = useDeleteExaminer();

  const columns = useMemo<MRT_ColumnDef<IExaminer>[]>(
    () => [
      {
        accessorKey: 'firstName',
        header: 'First Name',
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
      },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString('en-CA'),
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'identityCardNumber',
        header: 'ID Card Number',
      },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-examiner',
      title: <Title order={3}>Create New Examiner</Title>,
      children: <CreateExaminerForm />,
    });

  const openEditModal = (examiner: IExaminer) =>
    modals.open({
      id: 'edit-examiner',
      title: <Title order={3}>Edit Examiner</Title>,
      children: <EditExaminerForm initialExaminer={examiner} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IExaminer>) =>
    modals.openConfirmModal({
      title: 'Are you sure you want to delete this examiner?',
      children: (
        <Text>
          Are you sure you want to delete {row.original.firstName} {row.original.lastName}? This
          action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteExaminer(row.original.id),
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedExaminers,
    enableEditing: false,
    enableRowActions: true,
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
      isLoading: isLoadingExaminers,
      isSaving: isDeletingExaminer,
      showAlertBanner: isLoadingExaminersError,
      showProgressBars: isFetchingExaminers,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateExaminer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examinerData: ExaminerFormData) => api.Examiners.createExaminer(examinerData),
    onSuccess: (createExaminer) => {
      notifications.show({
        title: 'Success!',
        message: `Examiner "${createExaminer.firstName} ${createExaminer.lastName}" created successfully.`,
        color: 'teal',
      });
      queryClient.setQueryData(['examiners'], (prevExaminers: IExaminer[] = []) => [
        ...prevExaminers,
        createExaminer,
      ]);
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create examiner. Please try again.',
        color: 'red',
      });
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
      const previousExaminers = queryClient.getQueryData<IExaminer[]>(['examiners']);
      queryClient.setQueryData(['examiners'], (prevExaminers: IExaminer[] = []) =>
        prevExaminers.map((examiner) =>
          examiner.id === updatedExaminerInfo.newValues.id
            ? updatedExaminerInfo.newValues
            : examiner
        )
      );
      return { previousExaminers };
    },
    onError: (_err, _updatedExaminerInfo, context) => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update examiner. Please try again.',
        color: 'red',
      });
      if (context?.previousExaminers) {
        queryClient.setQueryData(['examiners'], context.previousExaminers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
    },
    onSuccess: (updatedExaminer) => {
      notifications.show({
        title: 'Success!',
        message: `Examiner "${updatedExaminer.firstName} ${updatedExaminer.lastName}" updated successfully.`,
        color: 'teal',
      });
    },
  });
}

function useDeleteExaminer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examinerId: number) =>
      api.Examiners.deleteExaminer(examinerId).then(() => examinerId),
    onMutate: async (examinerId: number) => {
      await queryClient.cancelQueries({ queryKey: ['examiners'] });
      const previousExaminers = queryClient.getQueryData<IExaminer[]>(['examiners']);
      queryClient.setQueryData(['examiners'], (prevExaminers: IExaminer[] = []) =>
        prevExaminers.filter((examiner) => examiner.id !== examinerId)
      );
      return { previousExaminers };
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: `Examiner successfully deleted.`,
        color: 'teal',
      });
    },
    onError: (_err, _examinerId, context) => {
      notifications.show({
        title: 'Deletion Failed',
        message: 'Could not delete examiner. Please try again.',
        color: 'red',
      });
      if (context?.previousExaminers) {
        queryClient.setQueryData(['examiners'], context.previousExaminers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
    },
  });
}

const queryClient = new QueryClient();

const ExaminerPage = () => (
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

export default ExaminerPage;

const validateRequired = (value: string) => !!value.trim().length;

const validateDate = (dateString: string) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toString() !== 'Invalid Date';
};

const validateDateRange = (dateString: string) => {
  if (!validateDate(dateString)) return false;
  const date = new Date(dateString);
  const now = new Date();
  const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  return date >= minAge && date < now;
};

function validateExaminer(examiner: ExaminerFormData) {
  const errors: Record<string, string> = {};

  if (!validateRequired(examiner.firstName)) {
    errors.firstName = 'First name is required';
  }
  if (!validateRequired(examiner.lastName)) {
    errors.lastName = 'Last name is required';
  }
  if (!validateRequired(examiner.dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth is required';
  } else if (!validateDate(examiner.dateOfBirth)) {
    errors.dateOfBirth = 'Invalid date format';
  } else if (!validateDateRange(examiner.dateOfBirth)) {
    errors.dateOfBirth = 'Date must be a valid past date';
  }
  if (!validateRequired(examiner.email)) {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(examiner.email)) {
    errors.email = 'Invalid email address';
  }
  if (!validateRequired(examiner.phone)) {
    errors.phone = 'Phone is required';
  }
  if (!validateRequired(examiner.identityCardNumber)) {
    errors.identityCardNumber = 'ID card number is required';
  }

  return errors;
}
