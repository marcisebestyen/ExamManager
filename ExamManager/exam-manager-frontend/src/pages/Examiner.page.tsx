import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo, useState } from 'react';
import {
  IconCalendar,
  IconDownload,
  IconEdit,
  IconId,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUpload,
  IconUser,
} from '@tabler/icons-react';
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  MantineReactTable,
  MRT_ColumnDef,
  MRT_Row,
  useMantineReactTable,
} from 'mantine-react-table';
import {
  ActionIcon,
  Button,
  Flex,
  MantineProvider,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
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

const validateRequired = (value: string) => !!value?.trim().length;

const validateDate = (dateString: string) => {
  if (!dateString) {return false;}
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const validateDateRange = (dateString: string) => {
  if (!validateDate(dateString)) {return false;}
  const date = new Date(dateString);
  const now = new Date();
  const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  return date >= minAge && date < now;
};

function validateExaminer(examiner: ExaminerFormData) {
  const errors: Record<string, string> = {};
  if (!validateRequired(examiner.firstName)) {errors.firstName = 'First name is required';}
  if (!validateRequired(examiner.lastName)) {errors.lastName = 'Last name is required';}
  if (!validateRequired(examiner.dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth is required';
  } else if (!validateDateRange(examiner.dateOfBirth)) {
    errors.dateOfBirth = 'Date must be a valid past date';
  }
  if (!validateRequired(examiner.email)) {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(examiner.email)) {
    errors.email = 'Invalid email address';
  }
  if (!validateRequired(examiner.phone)) {errors.phone = 'Phone is required';}
  if (!validateRequired(examiner.identityCardNumber))
    {errors.identityCardNumber = 'ID card number is required';}
  return errors;
}

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
      (ex) => ex.identityCardNumber.toLowerCase() === values.identityCardNumber.toLowerCase()
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
        <TextInput
          label="First Name"
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('firstName')}
          required
        />
        <TextInput
          label="Last Name"
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('lastName')}
          required
        />
        <DateInput
          label="Date of Birth"
          leftSection={<IconCalendar size={16} />}
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('dateOfBirth')}
          required
        />
        <TextInput
          label="Email"
          type="email"
          leftSection={<IconMail size={16} />}
          {...form.getInputProps('email')}
          required
        />
        <TextInput
          label="Phone"
          type="tel"
          leftSection={<IconPhone size={16} />}
          {...form.getInputProps('phone')}
          required
        />
        <TextInput
          label="ID Card Number"
          leftSection={<IconId size={16} />}
          {...form.getInputProps('identityCardNumber')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" variant="filled" radius="md">
            Create Examiner
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
      (ex) =>
        ex.id !== initialExaminer.id &&
        ex.identityCardNumber.toLowerCase() === values.identityCardNumber.toLowerCase()
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
        <TextInput
          label="First Name"
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('firstName')}
          required
        />
        <TextInput
          label="Last Name"
          leftSection={<IconUser size={16} />}
          {...form.getInputProps('lastName')}
          required
        />
        <DateInput
          label="Date of Birth"
          leftSection={<IconCalendar size={16} />}
          valueFormat="YYYY-MM-DD"
          {...form.getInputProps('dateOfBirth')}
          required
        />
        <TextInput
          label="Email"
          type="email"
          leftSection={<IconMail size={16} />}
          {...form.getInputProps('email')}
          required
        />
        <TextInput
          label="Phone"
          type="tel"
          leftSection={<IconPhone size={16} />}
          {...form.getInputProps('phone')}
          required
        />
        <TextInput
          label="ID Card Number"
          leftSection={<IconId size={16} />}
          {...form.getInputProps('identityCardNumber')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
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

const DeleteExaminerModal = ({ examiner }: { examiner: IExaminer }) => {
  const { mutateAsync: deleteExaminer } = useDeleteExaminer();

  const handleDelete = async () => {
    await deleteExaminer(examiner.id);
    modals.close('delete-examiner');
  };

  return (
    <Stack>
      <Text size="sm">
        Are you sure you want to delete{' '}
        <b>
          {examiner.firstName} {examiner.lastName}
        </b>
        ? This action cannot be undone.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          Cancel
        </Button>
        <Button color="red" variant="filled" onClick={handleDelete}>
          Delete Examiner
        </Button>
      </Flex>
    </Stack>
  );
};

const ExaminerTable = () => {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const {
    data: fetchedExaminers = [],
    isError: isLoadingExaminersError,
    isFetching: isFetchingExaminers,
    isLoading: isLoadingExaminers,
  } = useGetExaminers();
  const { isPending: isDeletingExaminer } = useDeleteExaminer();

  const columns = useMemo<MRT_ColumnDef<IExaminer>[]>(
    () => [
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'lastName', header: 'Last Name' },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString('en-CA'),
      },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'phone', header: 'Phone' },
      { accessorKey: 'identityCardNumber', header: 'ID Card Number' },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-examiner',
      title: <Text fw={700}>Create New Examiner</Text>,
      children: <CreateExaminerForm />,
    });

  const openEditModal = (examiner: IExaminer) =>
    modals.open({
      id: 'edit-examiner',
      title: <Text fw={700}>Edit Examiner</Text>,
      children: <EditExaminerForm initialExaminer={examiner} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IExaminer>) =>
    modals.open({
      id: 'delete-examiner',
      title: (
        <Text fw={700} c="red">
          Delete Examiner
        </Text>
      ),
      children: <DeleteExaminerModal examiner={row.original} />,
    });

  const handleExportData = async (table: any) => {
    setIsExporting(true);
    try {
      const filteredRows = table.getPrePaginationRowModel().rows;
      const ids = filteredRows.map((row: any) => row.original.id);
      if (ids.length === 0) {
        notifications.show({ title: 'Info', message: 'No data to export', color: 'blue' });
        return;
      }
      const response = await api.Exports.exportExaminersFiltered(ids);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Examiners_Filtered_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Export failed', color: 'red' });
    } finally {
      setIsExporting(false);
    }
  };

  const table = useMantineReactTable({
    columns,
    data: fetchedExaminers,
    enableEditing: false,
    enableRowActions: true,
    getRowId: (row) => String(row.id),
    autoResetPageIndex: false,
    onPaginationChange: setPagination,
    state: {
      isLoading: isLoadingExaminers,
      isSaving: isDeletingExaminer,
      showAlertBanner: isLoadingExaminersError,
      showProgressBars: isFetchingExaminers,
      pagination,
    },
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    mantineToolbarAlertBannerProps: isLoadingExaminersError
      ? { color: 'red', children: 'Error loading data' }
      : undefined,
    mantineTableContainerProps: { style: { minHeight: '500px' } },
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    positionActionsColumn: 'first',
    initialState: { showGlobalFilter: true, density: 'xs' },
    renderRowActions: ({ row }) => (
      <Flex gap="sm">
        <Tooltip label="Edit">
          <ActionIcon color="blue" variant="subtle" onClick={() => openEditModal(row.original)}>
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon color="red" variant="subtle" onClick={() => openDeleteConfirmModal(row)}>
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
          onClick={openCreateModal}
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
          onClick={() => handleExportData(table)}
        >
          Export
        </Button>
      </Flex>
    ),
  });

  return (
    <>
      <MantineReactTable table={table} />
      <ImportModal
        opened={isImportOpen}
        onClose={closeImport}
        entityName="Examiners"
        onDownloadTemplate={api.Imports.downloadTemplateExaminers}
        onImport={api.Imports.importExaminers}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['examiners'] })}
      />
    </>
  );
};

function useCreateExaminer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExaminerFormData) => api.Examiners.createExaminer(data),
    onSuccess: (created) => {
      notifications.show({
        title: 'Success!',
        message: `Examiner "${created.firstName} ${created.lastName}" created.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create examiner.',
        color: 'red',
      });
    },
  });
}

function useGetExaminers() {
  return useQuery<IExaminer[]>({
    queryKey: ['examiners'],
    queryFn: () => api.Examiners.getAllExaminers().then((res) => res.data),
    placeholderData: keepPreviousData,
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
    onSuccess: (updated) => {
      notifications.show({
        title: 'Success!',
        message: `Examiner "${updated.firstName}" updated.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
    },
    onError: () => {
      notifications.show({
        title: 'Update Failed',
        message: 'Could not update examiner.',
        color: 'red',
      });
    },
  });
}

function useDeleteExaminer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.Examiners.deleteExaminer(id).then(() => id),
    onSuccess: () => {
      notifications.show({
        title: 'Success!',
        message: `Examiner successfully deleted.`,
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['examiners'] });
    },
    onError: () => {
      notifications.show({
        title: 'Deletion Failed',
        message: 'Could not delete examiner.',
        color: 'red',
      });
    },
  });
}

const queryClient = new QueryClient();

const ExaminerPage = () => (
  <MantineProvider>
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Notifications />
        <Skeleton>
          <Stack mb="lg">
            <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
              Examiners
            </Title>
          </Stack>
          <ExaminerTable />
        </Skeleton>
      </ModalsProvider>
    </QueryClientProvider>
  </MantineProvider>
);

export default ExaminerPage;
