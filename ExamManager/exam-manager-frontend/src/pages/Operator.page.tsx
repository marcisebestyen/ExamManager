


import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';



import { useMemo } from 'react';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef, type MRT_Row } from 'mantine-react-table';
import { ActionIcon, Badge, Button, Flex, Group, NumberInput, Select, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';
import useAuth from '../hooks/useAuth';
import { IOperator, OperatorCreateFormData, OperatorFormData } from '../interfaces/IOperator';


enum Role {
  OPERATOR = 0,
  ADMIN = 1,
  STAFF = 2,
}

const ROLE_LABELS = {
  [Role.OPERATOR]: 'Operator',
  [Role.ADMIN]: 'Admin',
  [Role.STAFF]: 'Staff',
};

const ROLE_COLORS = {
  [Role.OPERATOR]: 'cyan',
  [Role.ADMIN]: 'red',
  [Role.STAFF]: 'indigo',
};

interface RoleBadgeProps {
  role: Role | string;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const roleValue = typeof role === 'string' ? Role[role.toUpperCase() as keyof typeof Role] : role;

  const color = ROLE_COLORS[roleValue];
  const label = ROLE_LABELS[roleValue];

  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  );
};

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
}

const generatePatchDocument = (
  oldData: IOperator,
  newData: Partial<IOperator>
): JsonPatchOperation[] => {
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

const CreateOperatorForm = () => {
  const { data: fetchedOperators = [] } = useGetOperators();
  const { mutateAsync: createOperator } = useCreateOperator();

  const form = useForm<OperatorCreateFormData>({
    initialValues: {
      userName: '',
      password: '',
      firstName: '',
      lastName: '',
    },
    validate: validateOperatorCreate,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedOperators.some(
      (operator) => operator.userName.toLowerCase() === values.userName.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('userName', 'An operator with this username already exists.');
      return;
    }
    await createOperator(values);
    modals.close('create-operator');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Username" {...form.getInputProps('userName')} required />
        <TextInput label="Password" type="password" {...form.getInputProps('password')} required />
        <TextInput label="First Name" {...form.getInputProps('firstName')} required />
        <TextInput label="Last Name" {...form.getInputProps('lastName')} required />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant="outline" radius="md" mr="xs">
            Create
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditOperatorForm = ({ initialOperator }: { initialOperator: IOperator }) => {
  const { data: fetchedOperators = [] } = useGetOperators();
  const { mutateAsync: updateOperator } = useUpdateOperator();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const form = useForm<OperatorFormData>({
    initialValues: {
      firstName: initialOperator.firstName,
      lastName: initialOperator.lastName,
      ...(isAdmin ? { role: initialOperator.role } : {}),
    },
    validate: validateOperatorUpdate,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const newValues: Partial<IOperator> = { ...initialOperator, ...values };
    await updateOperator({ newValues, oldValues: initialOperator });
    modals.close('edit-operator');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="First Name" {...form.getInputProps('firstName')} required />
        <TextInput label="Last Name" {...form.getInputProps('lastName')} required />
        {isAdmin && (
          <Select
            label="Role"
            data={['Operator', 'Staff', 'Admin']}
            value={form.values.role} // Add this line to bind the value
            onChange={(value) => form.setFieldValue('role', value || '')} // Add onChange handler
            error={form.errors.role}
            required
          />
        )}
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant="outline" radius="md" mr="xs">
            Save
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const DeleteOperatorModal = ({ operator }: { operator: IOperator }) => {
  const { mutateAsync: deleteOperator } = useDeleteOperator();

  const handleDelete = async () => {
    await deleteOperator(operator.id);
    modals.close('delete-operator');
  };

  return (
    <Stack>
      <Text>
        Are you sure you want to delete {operator.firstName} {operator.lastName}? This action is a
        soft delete and can be restored later.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button color="red" variant="outline" radius="md" mr="xs" onClick={handleDelete}>
          Delete
        </Button>
      </Flex>
    </Stack>
  );
};

const RestoreOperatorModal = () => {
  const { mutateAsync: restoreOperator } = useRestoreOperator();

  const form = useForm<{ id: number }>({
    initialValues: { id: 0 },
    validate: {
      id: (value) => (value > 0 ? null : 'Please enter a valid Operator ID greater than 0.'),
    },
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    await restoreOperator(values.id);
    modals.close('restore-operator');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <NumberInput label="Operator ID" min={1} {...form.getInputProps('id')} required />
        <Flex justify="flex-end" mt="xl">
          <Button type="submit" variant="outline" radius="md" mr="xs">
            Restore
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const OperatorTable = () => {
  const {
    data: fetchedOperators = [],
    isError: isLoadingOperatorsError,
    isFetching: isFetchingOperators,
    isLoading: isLoadingOperators,
  } = useGetOperators();
  const { mutateAsync: deleteOperator, isPending: isDeletingOperator } = useDeleteOperator();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const columns = useMemo<MRT_ColumnDef<IOperator>[]>(
    () => [
      {
        accessorKey: 'userName',
        header: 'Username',
      },
      {
        accessorKey: 'firstName',
        header: 'First Name',
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
      },
      {
        accessorKey: 'role',
        header: 'Role',
        Cell: ({ cell }) => <RoleBadge role={cell.getValue<string>()} />,
      },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-operator',
      title: <Title order={3}>Create New Operator</Title>,
      children: <CreateOperatorForm />,
    });

  const openEditModal = (operator: IOperator) =>
    modals.open({
      id: 'edit-operator',
      title: <Title order={3}>Edit Operator</Title>,
      children: <EditOperatorForm initialOperator={operator} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IOperator>) =>
    modals.open({
      id: 'delete-operator',
      title: <Title order={3}>Delete Operator</Title>,
      children: <DeleteOperatorModal operator={row.original} />,
    });

  const openRestoreModal = () =>
    modals.open({
      id: 'restore-operator',
      title: <Title order={3}>Restore Operator</Title>,
      children: <RestoreOperatorModal />,
    });

  const table = useMantineReactTable({
    columns,
    data: fetchedOperators,
    enableEditing: false,
    enableRowActions: true,
    getRowId: (row) => String(row.id),
    mantineToolbarAlertBannerProps: isLoadingOperatorsError
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
        {isAdmin && (
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
        )}
      </Flex>
    ),
    renderTopToolbarCustomActions: () => (
      <Group>
        {isAdmin && (
          <Button variant="outline" radius="md" onClick={openCreateModal}>
            Create New Entry
          </Button>
        )}
        {isAdmin && (
          <Button variant="outline" radius="md" onClick={openRestoreModal}>
            Restore Operator
          </Button>
        )}
      </Group>
    ),
    state: {
      isLoading: isLoadingOperators,
      isSaving: isDeletingOperator,
      showAlertBanner: isLoadingOperatorsError,
      showProgressBars: isFetchingOperators,
    },
  });

  return <MantineReactTable table={table} />;
};

function useCreateOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operatorData: OperatorCreateFormData) =>
      api.Operators.createOperator(operatorData),
    onSuccess: (createdOperator) => {
      notifications.show({
        title: 'Success!',
        message: `Operator "${createdOperator.firstName} ${createdOperator.lastName}" created successfully.`,
        color: 'teal',
      });
      queryClient.setQueryData(['operators'], (prevOperators: IOperator[] = []) => [
        ...prevOperators,
        createdOperator,
      ]);
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create operator. Please try again.',
        color: 'red',
      });
    },
  });
}

function useGetOperators() {
  return useQuery<IOperator[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      const response = await api.Operators.getAllOperators();
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
}

function useUpdateOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newValues,
      oldValues,
    }: {
      newValues: Partial<IOperator>;
      oldValues: IOperator;
    }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.Operators.updateOperator(newValues.id as number, patchDocument);
      }
      return newValues;
    },
    onMutate: async (updatedOperatorInfo) => {
      await queryClient.cancelQueries({ queryKey: ['operators'] });
      const previousOperators = queryClient.getQueryData<IOperator[]>(['operators']);
      queryClient.setQueryData(['operators'], (prevOperators: IOperator[] = []) =>
        prevOperators.map((operator) =>
          operator.id === updatedOperatorInfo.newValues.id
            ? { ...operator, ...updatedOperatorInfo.newValues }
            : operator
        )
      );
      return { previousOperators };
    },
    onError: (_err, _updatedOperatorInfo, context) => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update operator. Please try again.',
        color: 'red',
      });
      if (context?.previousOperators) {
        queryClient.setQueryData(['operators'], context.previousOperators);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onSuccess: (updatedOperator) => {
      notifications.show({
        title: 'Success!',
        message: `Operator "${updatedOperator.firstName} ${updatedOperator.lastName}" updated successfully.`,
        color: 'teal',
      });
    },
  });
}

function useDeleteOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operatorId: number) =>
      api.Operators.deleteOperator(operatorId).then(() => operatorId),
    onMutate: async (operatorId: number) => {
      await queryClient.cancelQueries({ queryKey: ['operators'] });
      const previousOperators = queryClient.getQueryData<IOperator[]>(['operators']);
      queryClient.setQueryData(['operators'], (prevOperators: IOperator[] = []) =>
        prevOperators.filter((operator) => operator.id !== operatorId)
      );
      return { previousOperators };
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: `Operator successfully deleted.`,
        color: 'teal',
      });
    },
    onError: (_err, _operatorId, context) => {
      notifications.show({
        title: 'Deletion Failed',
        message: 'Could not delete operator. Please try again.',
        color: 'red',
      });
      if (context?.previousOperators) {
        queryClient.setQueryData(['operators'], context.previousOperators);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
  });
}

function useRestoreOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operatorId: number) =>
      api.Operators.restoreOperator(operatorId).then(() => operatorId),
    onSuccess: (operatorId) => {
      notifications.show({
        title: 'Success!',
        message: `Operator with ID ${operatorId} successfully restored.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Restoration Failed',
        message: error.response?.data?.message || 'Failed to restore operator. Please try again.',
        color: 'red',
      });
    },
  });
}

const queryClient = new QueryClient();

const OperatorPage = () => (
  <QueryClientProvider client={queryClient}>
    <ModalsProvider>
      <Notifications />
      <Skeleton>
        <Title order={2}>Operators</Title>
        <OperatorTable />
      </Skeleton>
    </ModalsProvider>
  </QueryClientProvider>
);

export default OperatorPage;

const validateRequired = (value: string) => !!value.trim().length;

function validateOperatorCreate(operator: OperatorCreateFormData) {
  const errors: Partial<Record<keyof OperatorCreateFormData, string>> = {};

  if (!validateRequired(operator.userName)) {
    errors.userName = 'Username is required';
  } else if (operator.userName.length < 3 || operator.userName.length > 100) {
    errors.userName = 'Username must be between 3 and 100 characters';
  }
  if (!validateRequired(operator.password)) {
    errors.password = 'Password is required';
  } else if (operator.password.length < 6 || operator.password.length > 100) {
    errors.password = 'Password must be between 6 and 100 characters';
  }
  if (!validateRequired(operator.firstName)) {
    errors.firstName = 'First name is required';
  }
  if (!validateRequired(operator.lastName)) {
    errors.lastName = 'Last name is required';
  }

  return errors;
}

function validateOperatorUpdate(operator: OperatorFormData) {
  const errors: Partial<Record<keyof OperatorFormData, string>> = {};

  if (!validateRequired(operator.firstName)) {
    errors.firstName = 'First name is required';
  }
  if (!validateRequired(operator.lastName)) {
    errors.lastName = 'Last name is required';
  }

  return errors;
}
