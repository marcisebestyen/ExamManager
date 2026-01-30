import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo } from 'react';
import { IconEdit, IconRestore, IconTrash, IconUserPlus } from '@tabler/icons-react';
import { keepPreviousData, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { ActionIcon, Badge, Button, Flex, Group, MantineProvider, Select, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
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

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
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
    initialValues: { userName: '', password: '', firstName: '', lastName: '' },
    validate: validateOperatorCreate,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (fetchedOperators.some((o) => o.userName.toLowerCase() === values.userName.toLowerCase())) {
      form.setFieldError('userName', 'Username already exists.');
      return;
    }
    await createOperator(values);
    modals.close('create-operator');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Username"
          placeholder="Unique username"
          {...form.getInputProps('userName')}
          required
        />
        <TextInput
          label="Password"
          type="password"
          placeholder="Min 6 characters"
          {...form.getInputProps('password')}
          required
        />
        <Group grow>
          <TextInput
            label="First Name"
            placeholder="John"
            {...form.getInputProps('firstName')}
            required
          />
          <TextInput
            label="Last Name"
            placeholder="Doe"
            {...form.getInputProps('lastName')}
            required
          />
        </Group>
        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" variant="filled" radius="md">
            Create Operator
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditOperatorForm = ({ initialOperator }: { initialOperator: IOperator }) => {
  const { mutateAsync: updateOperator } = useUpdateOperator();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const form = useForm<OperatorFormData>({
    initialValues: {
      firstName: initialOperator.firstName,
      lastName: initialOperator.lastName,
      role: initialOperator.role,
    },
    validate: validateOperatorUpdate,
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const newValues = { ...initialOperator, ...values };
    await updateOperator({ newValues, oldValues: initialOperator });
    modals.close('edit-operator');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Group grow>
          <TextInput label="First Name" {...form.getInputProps('firstName')} required />
          <TextInput label="Last Name" {...form.getInputProps('lastName')} required />
        </Group>
        {isAdmin && (
          <Select
            label="Role"
            data={['Operator', 'Staff', 'Admin']}
            {...form.getInputProps('role')}
            required
          />
        )}
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

const OperatorTable = () => {
  const queryClient = useQueryClient();
  const { data: fetchedOperators = [], isError, isFetching, isLoading } = useGetOperators();
  const { mutateAsync: deleteOperator, isPending: isDeleting } = useDeleteOperator();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const columns = useMemo<MRT_ColumnDef<IOperator>[]>(
    () => [
      { accessorKey: 'userName', header: 'Username' },
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'lastName', header: 'Last Name' },
      {
        accessorKey: 'role',
        header: 'Role',
        Cell: ({ cell }) => {
          const val = cell.getValue<string | number>();

          if (val === undefined || val === null) {return null;}

          let roleValue: Role;
          if (typeof val === 'string') {
            roleValue = Role[val.toUpperCase() as keyof typeof Role];
          } else {
            roleValue = val as Role;
          }

          const label = ROLE_LABELS[roleValue] || 'Unknown';
          const color = ROLE_COLORS[roleValue] || 'gray';

          return (
            <Badge color={color} variant="light">
              {label}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedOperators,
    enableRowActions: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    getRowId: (row) => String(row.id),
    state: {
      isLoading,
      isSaving: isDeleting,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    initialState: { showGlobalFilter: true, density: 'xs' },
    positionActionsColumn: 'first',
    renderRowActions: ({ row }) => (
      <Flex gap="sm">
        <Tooltip label="Edit">
          <ActionIcon
            color="blue"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'edit-operator',
                title: <Text fw={700}>Edit Operator</Text>,
                children: <EditOperatorForm initialOperator={row.original} />,
              })
            }
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        {isAdmin && (
          <Tooltip label="Delete">
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() =>
                modals.open({
                  id: 'delete-operator',
                  title: (
                    <Text fw={700} c="red">
                      Delete Operator
                    </Text>
                  ),
                  children: (
                    <Stack>
                      <Text size="sm">
                        Are you sure you want to delete <b>{row.original.firstName}</b>? This is a
                        soft delete.
                      </Text>
                      <Flex justify="flex-end" mt="xl">
                        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
                          Cancel
                        </Button>
                        <Button
                          color="red"
                          onClick={() => {
                            deleteOperator(row.original.id);
                            modals.closeAll();
                          }}
                        >
                          Delete
                        </Button>
                      </Flex>
                    </Stack>
                  ),
                })
              }
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Flex>
    ),
    renderTopToolbarCustomActions: () => (
      <Group gap="sm">
        {isAdmin && (
          <>
            <Button
              variant="filled"
              radius="md"
              leftSection={<IconUserPlus size={16} />}
              onClick={() =>
                modals.open({
                  id: 'create-operator',
                  title: <Text fw={700}>Create New Operator</Text>,
                  children: <CreateOperatorForm />,
                })
              }
            >
              Create Entry
            </Button>
            <Button
              variant="filled"
              color="gray"
              radius="md"
              leftSection={<IconRestore size={16} />}
              onClick={() =>
                modals.open({
                  id: 'restore-operator',
                  title: <Text fw={700}>Restore Operator</Text>,
                  children: (
                    <RestoreForm
                      onRestore={() => queryClient.invalidateQueries({ queryKey: ['operators'] })}
                    />
                  ),
                })
              }
            >
              Restore
            </Button>
          </>
        )}
      </Group>
    ),
  });

  return <MantineReactTable table={table} />;
};

const RestoreForm = ({ onRestore }: { onRestore: () => void }) => {
  const { mutateAsync: restore } = useRestoreOperator();
  const form = useForm({ initialValues: { id: '' } });

  return (
    <form
      onSubmit={form.onSubmit(async (v) => {
        await restore(Number(v.id));
        modals.closeAll();
        onRestore();
      })}
    >
      <Stack>
        <TextInput
          label="Operator ID"
          placeholder="Enter ID to restore"
          {...form.getInputProps('id')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" color="teal">
            Restore
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

function useGetOperators() {
  return useQuery<IOperator[]>({
    queryKey: ['operators'],
    queryFn: () => api.Operators.getAllOperators().then((r) => r.data),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function useCreateOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OperatorCreateFormData) => api.Operators.createOperator(data),
    onSuccess: () => {
      notifications.show({ title: 'Success!', message: 'Operator created.', color: 'teal' });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (err: any) =>
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || 'Failed',
        color: 'red',
      }),
  });
}

function useUpdateOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newValues,
      oldValues,
    }: {
      newValues: IOperator;
      oldValues: IOperator;
    }) => {
      const patch = generatePatchDocument(oldValues, newValues);
      if (patch.length > 0) {await api.Operators.updateOperator(newValues.id, patch);}
      return newValues;
    },
    onSuccess: () => {
      notifications.show({ title: 'Success!', message: 'Operator updated.', color: 'teal' });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: () => notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }),
  });
}

function useDeleteOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Operators.deleteOperator(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Operator soft-deleted.', color: 'teal' });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
  });
}

function useRestoreOperator() {
  return useMutation({
    mutationFn: (id: number) => api.Operators.restoreOperator(id),
    onSuccess: () =>
      notifications.show({
        title: 'Restored',
        message: 'Operator is active again.',
        color: 'teal',
      }),
  });
}

const OperatorPage = () => (
  <MantineProvider>
    <QueryClientProvider client={new QueryClient()}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Stack mb="lg">
            <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
              Operators
            </Title>
          </Stack>
          <OperatorTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default OperatorPage;


const validateRequired = (value: string) => !!value?.trim().length;

function validateOperatorCreate(operator: OperatorCreateFormData) {
  const errors: any = {};
  if (!validateRequired(operator.userName)) {errors.userName = 'Required';}
  if (!validateRequired(operator.password) || operator.password.length < 6)
    {errors.password = 'Min 6 characters';}
  if (!validateRequired(operator.firstName)) {errors.firstName = 'Required';}
  if (!validateRequired(operator.lastName)) {errors.lastName = 'Required';}
  return errors;
}

function validateOperatorUpdate(operator: OperatorFormData) {
  const errors: any = {};
  if (!validateRequired(operator.firstName)) {errors.firstName = 'Required';}
  if (!validateRequired(operator.lastName)) {errors.lastName = 'Required';}
  return errors;
}
