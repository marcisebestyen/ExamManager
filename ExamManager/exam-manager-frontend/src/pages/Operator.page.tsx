import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo } from 'react';
import { IconEdit, IconRestore, IconTrash, IconUserPlus } from '@tabler/icons-react';
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Badge,
  Button,
  Flex,
  Group,
  MantineProvider,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
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

const ROLE_COLORS: Record<number, string> = {
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
  const { t } = useTranslation();
  const { data: fetchedOperators = [] } = useGetOperators();
  const { mutateAsync: createOperator } = useCreateOperator();

  const form = useForm<OperatorCreateFormData>({
    initialValues: { userName: '', password: '', firstName: '', lastName: '' },
    validate: (values) => validateOperatorCreate(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (fetchedOperators.some((o) => o.userName.toLowerCase() === values.userName.toLowerCase())) {
      form.setFieldError('userName', t('operators.form.exists'));
      return;
    }
    await createOperator(values);
    modals.close('create-operator');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label={t('operators.table.username')}
          placeholder={t('operators.form.usernamePlaceholder')}
          {...form.getInputProps('userName')}
          required
        />
        <TextInput
          label={t('auth.login.password')}
          type="password"
          placeholder={t('operators.form.passwordPlaceholder')}
          {...form.getInputProps('password')}
          required
        />
        <Group grow>
          <TextInput
            label={t('operators.table.firstName')}
            placeholder="John"
            {...form.getInputProps('firstName')}
            required
          />
          <TextInput
            label={t('operators.table.lastName')}
            placeholder="Doe"
            {...form.getInputProps('lastName')}
            required
          />
        </Group>
        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            {t('exams.actions.cancel')}
          </Button>
          <Button type="submit" variant="filled" radius="md">
            {t('operators.form.createTitle')}
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditOperatorForm = ({ initialOperator }: { initialOperator: IOperator }) => {
  const { t } = useTranslation();
  const { mutateAsync: updateOperator } = useUpdateOperator();
  const { user } = useAuth();

  // Normalized check for role string/number
  const normalizedUserRole = String(user?.role).replace('ROLES.', '').toUpperCase();
  const isAdmin = normalizedUserRole === 'ADMIN' || normalizedUserRole === '1';

  const form = useForm<OperatorFormData>({
    initialValues: {
      firstName: initialOperator.firstName,
      lastName: initialOperator.lastName,
      role: initialOperator.role,
    },
    validate: (values) => validateOperatorUpdate(values, t),
    validateInputOnBlur: true,
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        const newValues = { ...initialOperator, ...values };
        await updateOperator({ newValues, oldValues: initialOperator });
        modals.close('edit-operator');
      })}
    >
      <Stack gap="md">
        <Group grow>
          <TextInput
            label={t('operators.table.firstName')}
            {...form.getInputProps('firstName')}
            required
          />
          <TextInput
            label={t('operators.table.lastName')}
            {...form.getInputProps('lastName')}
            required
          />
        </Group>
        {isAdmin && (
          <Select
            label={t('operators.table.role')}
            data={[
              { value: 'Operator', label: t('roles.0') },
              { value: 'Staff', label: t('roles.2') },
              { value: 'Admin', label: t('roles.1') },
            ]}
            {...form.getInputProps('role')}
            required
          />
        )}
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

const OperatorTable = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: fetchedOperators = [], isError, isFetching, isLoading } = useGetOperators();
  const { mutateAsync: deleteOperator, isPending: isDeleting } = useDeleteOperator();
  const { user } = useAuth();

  const normalizedUserRole = String(user?.role).replace('ROLES.', '').toUpperCase();
  const isAdmin = normalizedUserRole === 'ADMIN' || normalizedUserRole === '1';

  const columns = useMemo<MRT_ColumnDef<IOperator>[]>(
    () => [
      { accessorKey: 'userName', header: t('operators.table.username') },
      { accessorKey: 'firstName', header: t('operators.table.firstName') },
      { accessorKey: 'lastName', header: t('operators.table.lastName') },
      {
        accessorKey: 'role',
        header: t('operators.table.role'),
        Cell: ({ cell }) => {
          const val = cell.getValue<string | number>();
          if (val === undefined || val === null) return null;

          // Normalize the role key to match our i18n structure
          const roleKey = String(val).replace('ROLES.', '').toUpperCase();
          const translatedLabel = t(`roles.${roleKey}`, { defaultValue: roleKey });

          // Map numeric value for color lookup
          let roleNum: number = 0;
          if (typeof val === 'number') roleNum = val;
          else if (roleKey === 'ADMIN') roleNum = 1;
          else if (roleKey === 'STAFF') roleNum = 2;

          return (
            <Badge color={ROLE_COLORS[roleNum] || 'gray'} variant="light">
              {translatedLabel}
            </Badge>
          );
        },
      },
    ],
    [t]
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedOperators,
    enableRowActions: true,
    getRowId: (row) => String(row.id),
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
    },
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    positionActionsColumn: 'first',
    initialState: { showGlobalFilter: true, density: 'xs' },
    renderRowActions: ({ row }) => (
      <Flex gap="sm">
        <Tooltip label={t('exams.actions.edit')}>
          <ActionIcon
            color="blue"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'edit-operator',
                title: <Text fw={700}>{t('operators.form.editTitle')}</Text>,
                children: <EditOperatorForm initialOperator={row.original} />,
              })
            }
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        {isAdmin && (
          <Tooltip label={t('exams.actions.delete')}>
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() =>
                modals.open({
                  id: 'delete-operator',
                  title: (
                    <Text fw={700} c="red">
                      {t('operators.form.deleteTitle')}
                    </Text>
                  ),
                  children: (
                    <Stack>
                      <Text size="sm">
                        {t('operators.form.softDeleteDesc', { name: row.original.firstName })}
                      </Text>
                      <Flex justify="flex-end" mt="xl">
                        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
                          {t('exams.actions.cancel')}
                        </Button>
                        <Button
                          color="red"
                          onClick={async () => {
                            await deleteOperator(row.original.id);
                            modals.closeAll();
                          }}
                        >
                          {t('exams.actions.delete')}
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
                  title: <Text fw={700}>{t('operators.form.createTitle')}</Text>,
                  children: <CreateOperatorForm />,
                })
              }
            >
              {t('exams.actions.create')}
            </Button>
            <Button
              variant="filled"
              color="gray"
              radius="md"
              leftSection={<IconRestore size={16} />}
              onClick={() =>
                modals.open({
                  id: 'restore-operator',
                  title: <Text fw={700}>{t('operators.form.restoreTitle')}</Text>,
                  children: (
                    <RestoreForm
                      onRestore={() => queryClient.invalidateQueries({ queryKey: ['operators'] })}
                    />
                  ),
                })
              }
            >
              {t('operators.actions.restore')}
            </Button>
          </>
        )}
      </Group>
    ),
  });

  return <MantineReactTable table={table} />;
};

const RestoreForm = ({ onRestore }: { onRestore: () => void }) => {
  const { t } = useTranslation();
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
          label={t('operators.form.restoreIdLabel')}
          placeholder={t('operators.form.restorePlaceholder')}
          {...form.getInputProps('id')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            {t('exams.actions.cancel')}
          </Button>
          <Button type="submit" color="teal">
            {t('operators.actions.restore')}
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OperatorCreateFormData) => api.Operators.createOperator(data),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('operators.notifications.createSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (err: any) =>
      notifications.show({
        title: t('common.error'),
        message: err.response?.data?.message || t('common.error'),
        color: 'red',
      }),
  });
}

function useUpdateOperator() {
  const { t } = useTranslation();
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
      if (patch.length > 0) {
        await api.Operators.updateOperator(newValues.id, patch);
      }
      return newValues;
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('operators.notifications.updateSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: () =>
      notifications.show({ title: t('common.error'), message: t('common.error'), color: 'red' }),
  });
}

function useDeleteOperator() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Operators.deleteOperator(id),
    onSuccess: () => {
      notifications.show({
        title: t('exams.actions.delete'),
        message: t('operators.notifications.deleteSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
  });
}

function useRestoreOperator() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => api.Operators.restoreOperator(id),
    onSuccess: () =>
      notifications.show({
        title: t('operators.actions.restore'),
        message: t('operators.notifications.restoreSuccess'),
        color: 'teal',
      }),
  });
}

const OperatorPage = () => {
  const { t } = useTranslation();
  return (
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                {t('operators.title')}
              </Title>
            </Stack>
            <OperatorTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default OperatorPage;

const validateRequired = (value: string) => !!value?.trim().length;

function validateOperatorCreate(operator: OperatorCreateFormData, t: any) {
  const errors: any = {};
  if (!validateRequired(operator.userName)) {
    errors.userName = t('exams.validation.name');
  }
  if (!validateRequired(operator.password) || operator.password.length < 6) {
    errors.password = t('auth.login.validation.passMin');
  }
  if (!validateRequired(operator.firstName)) {
    errors.firstName = t('examiners.validation.firstName');
  }
  if (!validateRequired(operator.lastName)) {
    errors.lastName = t('examiners.validation.lastName');
  }
  return errors;
}

function validateOperatorUpdate(operator: OperatorFormData, t: any) {
  const errors: any = {};
  if (!validateRequired(operator.firstName)) {
    errors.firstName = t('examiners.validation.firstName');
  }
  if (!validateRequired(operator.lastName)) {
    errors.lastName = t('examiners.validation.lastName');
  }
  return errors;
}
