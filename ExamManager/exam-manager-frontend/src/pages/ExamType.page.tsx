import { useMemo, useState } from 'react';
import { IconCategory, IconDownload, IconEdit, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { keepPreviousData, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineReactTable, MRT_ColumnDef, MRT_Row, useMantineReactTable } from 'mantine-react-table';
import { ActionIcon, Button, Flex, MantineProvider, Stack, Text, Textarea, TextInput, Title, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
import { Skeleton } from '../components/Skeleton';
import { ExamTypeFormData, IExamType } from '../interfaces/IExamType';


interface JsonPatchOperation {
  op: 'replace';
  path: string;
  value?: any;
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

const validateRequired = (value: string) => !!value.trim().length;

function validateExamType(examType: ExamTypeFormData) {
  const errors: { typeName?: string } = {};
  if (!validateRequired(examType.typeName)) {
    errors.typeName = 'Exam Type Name is required';
  }
  return errors;
}

const CreateExamTypeForm = () => {
  const { data: fetchedExamTypes = [] } = useGetExamTypes();
  const { mutateAsync: createExamType } = useCreateExamType();

  const form = useForm<ExamTypeFormData>({
    initialValues: { typeName: '', description: '' },
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
        <TextInput
          label="Exam Type Name"
          description="E.g., Written, Oral, Practical"
          leftSection={<IconCategory size={16} />}
          {...form.getInputProps('typeName')}
          required
        />
        <Textarea
          label="Description"
          description="Additional details"
          {...form.getInputProps('description')}
          minRows={3}
          autosize
        />
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            Cancel
          </Button>
          <Button type="submit" variant="filled" radius="md">
            Create Type
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
        <TextInput
          label="Exam Type Name"
          leftSection={<IconCategory size={16} />}
          {...form.getInputProps('typeName')}
          required
        />
        <Textarea label="Description" {...form.getInputProps('description')} minRows={3} autosize />
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

const DeleteExamTypeModal = ({ examType }: { examType: IExamType }) => {
  const { mutateAsync: deleteExamType } = useDeleteExamType();

  const handleDelete = async () => {
    await deleteExamType(examType.id);
    modals.close('delete-exam-type');
  };

  return (
    <Stack>
      <Text size="sm">
        Are you sure you want to delete <b>{examType.typeName}</b>? This action cannot be undone.
      </Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          Cancel
        </Button>
        <Button color="red" variant="filled" onClick={handleDelete}>
          Delete Type
        </Button>
      </Flex>
    </Stack>
  );
};

const ExamTypeTable = () => {
  const queryClient = useQueryClient();

  const {
    data: fetchedExamTypes = [],
    isError: isLoadingExamTypesError,
    isFetching: isFetchingExamTypes,
    isLoading: isLoadingExamTypes,
  } = useGetExamTypes();
  const { isPending: isDeletingExamType } = useDeleteExamType();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<MRT_ColumnDef<IExamType>[]>(
    () => [
      {
        accessorKey: 'typeName',
        header: 'Exam Type Name',
        size: 200,
        enableClickToCopy: true,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 400,
      },
    ],
    []
  );

  const openCreateModal = () =>
    modals.open({
      id: 'create-exam-type',
      title: <Text fw={700}>Create New Exam Type</Text>,
      children: <CreateExamTypeForm />,
    });

  const openEditModal = (examType: IExamType) =>
    modals.open({
      id: 'edit-exam-type',
      title: <Text fw={700}>Edit Exam Type</Text>,
      children: <EditExamTypeForm initialExamType={examType} />,
    });

  const openDeleteConfirmModal = (row: MRT_Row<IExamType>) =>
    modals.open({
      id: 'delete-exam-type',
      title: (
        <Text fw={700} c="red">
          Delete Exam Type
        </Text>
      ),
      children: <DeleteExamTypeModal examType={row.original} />,
    });

  const handleExportData = async (table: any) => {
    setIsExporting(true);
    try {
      const filteredRows = table.getPrePaginationRowModel().rows;
      const ids = filteredRows.map((row: any) => row.original.id);

      if (ids.length === 0) {
        notifications.show({
          title: 'Info',
          message: 'No data to export',
          color: 'blue',
        });
        return;
      }

      const response = await api.Exports.exportExamTypesFiltered(ids);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `ExamTypes_Filtered_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Error',
        message: 'Export failed',
        color: 'red',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const table = useMantineReactTable({
    columns,
    data: fetchedExamTypes,
    enableEditing: false,
    enableRowActions: true,
    getRowId: (row) => String(row.id),

    autoResetPageIndex: false,
    autoResetAll: false,
    onPaginationChange: setPagination,

    state: {
      isLoading: isLoadingExamTypes,
      isSaving: isDeletingExamType,
      showAlertBanner: isLoadingExamTypesError,
      showProgressBars: isFetchingExamTypes,
      pagination,
    },

    mantinePaperProps: {
      shadow: 'sm',
      radius: 'md',
      withBorder: true,
    },
    mantineToolbarAlertBannerProps: isLoadingExamTypesError
      ? { color: 'red', children: 'Error loading data' }
      : undefined,
    mantineTableContainerProps: {
      style: { minHeight: '500px' },
    },
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    positionActionsColumn: 'first',
    initialState: {
      showGlobalFilter: true,
      density: 'xs',
    },
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
        entityName="Exam Types"
        onDownloadTemplate={api.Imports.downloadTemplateExamTypes}
        onImport={api.Imports.importExamTypes}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['examTypes'] })}
      />
    </>
  );
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
    placeholderData: keepPreviousData,
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
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                Exam Types
              </Title>
            </Stack>
            <ExamTypeTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default ExamTypePage;
