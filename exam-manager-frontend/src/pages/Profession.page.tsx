import '@mantine/core/styles.css';
import 'mantine-react-table/styles.css';
import '@mantine/notifications/styles.css';

import { useMemo, useState } from 'react';
import {
  IconBriefcase,
  IconDownload,
  IconEdit,
  IconId,
  IconPlus,
  IconTrash,
  IconUpload,
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
  useMantineReactTable,
} from 'mantine-react-table';
import { useTranslation } from 'react-i18next';
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
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals, ModalsProvider } from '@mantine/modals';
import { Notifications, notifications } from '@mantine/notifications';
import { IProfession, ProfessionFormData } from '@/interfaces/IProfession';
import api from '../api/api';
import { ImportModal } from '../components/ImportModal';
import { Skeleton } from '../components/Skeleton';

interface JsonPatchOperation {
  op: 'replace';
  path: string;
  value?: any;
}

const generatePatchDocument = (
  oldData: IProfession,
  newData: IProfession
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

const validateRequired = (value: string) => !!value.trim().length;

function validateProfession(profession: ProfessionFormData, t: any) {
  const errors: { keorId?: string; professionName?: string } = {};
  if (!validateRequired(profession.keorId)) {
    errors.keorId = t('professions.validation.keorRequired');
  }
  if (!validateRequired(profession.professionName)) {
    errors.professionName = t('professions.validation.nameRequired');
  }
  return errors;
}

const CreateProfessionForm = () => {
  const { t } = useTranslation();
  const { data: fetchedProfessions = [] } = useGetProfessions();
  const { mutateAsync: createProfession } = useCreateProfession();

  const form = useForm<ProfessionFormData>({
    initialValues: { keorId: '', professionName: '' },
    validate: (values) => validateProfession(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedProfessions.some(
      (p) => p.keorId.toLowerCase() === values.keorId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('keorId', t('professions.form.duplicate'));
      return;
    }
    await createProfession(values);
    modals.close('create-profession');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t('professions.form.keorLabel')}
          description={t('professions.form.keorDesc')}
          leftSection={<IconId size={16} />}
          {...form.getInputProps('keorId')}
          required
        />
        <TextInput
          label={t('professions.form.nameLabel')}
          description={t('professions.form.nameDesc')}
          leftSection={<IconBriefcase size={16} />}
          {...form.getInputProps('professionName')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
            {t('exams.actions.cancel')}
          </Button>
          <Button type="submit" variant="filled" radius="md">
            {t('exams.actions.create')}
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};

const EditProfessionForm = ({ initialProfession }: { initialProfession: IProfession }) => {
  const { t } = useTranslation();
  const { data: fetchedProfessions = [] } = useGetProfessions();
  const { mutateAsync: updateProfession } = useUpdateProfession();

  const form = useForm<ProfessionFormData>({
    initialValues: {
      keorId: initialProfession.keorId,
      professionName: initialProfession.professionName,
    },
    validate: (values) => validateProfession(values, t),
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const isDuplicate = fetchedProfessions.some(
      (p) => p.id !== initialProfession.id && p.keorId.toLowerCase() === values.keorId.toLowerCase()
    );
    if (isDuplicate) {
      form.setFieldError('keorId', t('professions.form.duplicate'));
      return;
    }
    const newValues: IProfession = { ...initialProfession, ...values };
    await updateProfession({ newValues, oldValues: initialProfession });
    modals.close('edit-profession');
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t('professions.form.keorLabel')}
          leftSection={<IconId size={16} />}
          {...form.getInputProps('keorId')}
          required
        />
        <TextInput
          label={t('professions.form.nameLabel')}
          leftSection={<IconBriefcase size={16} />}
          {...form.getInputProps('professionName')}
          required
        />
        <Flex justify="flex-end" mt="xl">
          <Button type="button" variant="subtle" onClick={() => modals.closeAll()} mr="xs">
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

const DeleteProfessionModal = ({ profession }: { profession: IProfession }) => {
  const { t } = useTranslation();
  const { mutateAsync: deleteProfession } = useDeleteProfession();

  const handleDelete = async () => {
    await deleteProfession(profession.id);
    modals.close('delete-profession');
  };

  return (
    <Stack>
      <Text size="sm">{t('exams.deleteConfirm', { name: profession.professionName })}</Text>
      <Flex justify="flex-end" mt="xl">
        <Button variant="default" onClick={() => modals.closeAll()} mr="xs">
          {t('exams.actions.cancel')}
        </Button>
        <Button color="red" variant="filled" onClick={handleDelete}>
          {t('exams.actions.delete')}
        </Button>
      </Flex>
    </Stack>
  );
};

const ProfessionTable = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: fetchedProfessions = [],
    isError: isLoadingProfessionsError,
    isFetching: isFetchingProfessions,
    isLoading: isLoadingProfessions,
  } = useGetProfessions();
  const { isPending: isDeletingProfession } = useDeleteProfession();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, { open: openImport, close: closeImport }] = useDisclosure(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<MRT_ColumnDef<IProfession>[]>(
    () => [
      {
        accessorKey: 'keorId',
        header: t('professions.table.keorId'),
        size: 150,
        enableClickToCopy: true,
      },
      {
        accessorKey: 'professionName',
        header: t('professions.table.name'),
        size: 300,
      },
    ],
    [t]
  );

  const table = useMantineReactTable({
    columns,
    data: fetchedProfessions,
    enableEditing: false,
    enableRowActions: true,
    getRowId: (row) => String(row.id),

    autoResetPageIndex: false,
    onPaginationChange: setPagination,
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
      isLoading: isLoadingProfessions,
      isSaving: isDeletingProfession,
      showAlertBanner: isLoadingProfessionsError,
      showProgressBars: isFetchingProfessions,
      pagination,
    },

    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
    mantineTableContainerProps: { style: { minHeight: '500px' } },

    enableDensityToggle: false,
    enableFullScreenToggle: false,
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
                id: 'edit-profession',
                title: <Text fw={700}>{t('professions.form.editTitle')}</Text>,
                children: <EditProfessionForm initialProfession={row.original} />,
              })
            }
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('exams.actions.delete')}>
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={() =>
              modals.open({
                id: 'delete-profession',
                title: (
                  <Text fw={700} c="red">
                    {t('professions.form.deleteTitle')}
                  </Text>
                ),
                children: <DeleteProfessionModal profession={row.original} />,
              })
            }
          >
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
          onClick={() =>
            modals.open({
              id: 'create-profession',
              title: <Text fw={700}>{t('professions.form.createTitle')}</Text>,
              children: <CreateProfessionForm />,
            })
          }
        >
          {t('exams.actions.create')}
        </Button>

        <Button
          variant="filled"
          color="violet"
          radius="md"
          leftSection={<IconUpload size={16} />}
          onClick={openImport}
        >
          {t('exams.actions.import')}
        </Button>

        <Button
          variant="filled"
          color="green"
          radius="md"
          leftSection={<IconDownload size={16} />}
          loading={isExporting}
          onClick={async () => {
            setIsExporting(true);
            try {
              const ids = table.getPrePaginationRowModel().rows.map((row: any) => row.original.id);
              if (ids.length === 0) {
                notifications.show({
                  title: 'Info',
                  message: t('examiners.notifications.exportNoData'),
                  color: 'blue',
                });
                return;
              }
              const response = await api.Exports.exportProfessionsFiltered(ids);
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute(
                'download',
                `Professions_${new Date().toISOString().slice(0, 10)}.xlsx`
              );
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
            } catch {
              notifications.show({
                title: t('common.error'),
                message: t('exams.notifications.exportFailed'),
                color: 'red',
              });
            } finally {
              setIsExporting(false);
            }
          }}
        >
          {t('exams.actions.export')}
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
        entityName={t('professions.title')}
        onDownloadTemplate={api.Imports.downloadTemplateProfessions}
        onImport={api.Imports.importProfessions}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['professions'] })}
      />
    </>
  );
};

function useCreateProfession() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (professionData: ProfessionFormData) =>
      api.Professions.createProfession(professionData),
    onSuccess: (createdProfession) => {
      notifications.show({
        title: t('common.success'),
        message: t('professions.notifications.createSuccess', {
          name: createdProfession.professionName,
        }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.message || t('common.error'),
        color: 'red',
      });
    },
  });
}

function useGetProfessions() {
  return useQuery<IProfession[]>({
    queryKey: ['professions'],
    queryFn: () => api.Professions.getAllProfessions().then((res) => res.data),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function useUpdateProfession() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      newValues,
      oldValues,
    }: {
      newValues: IProfession;
      oldValues: IProfession;
    }) => {
      const patchDocument = generatePatchDocument(oldValues, newValues);
      if (patchDocument.length > 0) {
        await api.Professions.updateProfession(newValues.id, patchDocument);
      }
      return newValues;
    },
    onSuccess: (updatedProfession) => {
      notifications.show({
        title: t('common.success'),
        message: t('professions.notifications.updateSuccess', {
          name: updatedProfession.professionName,
        }),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onError: () => {
      notifications.show({
        title: t('common.error'),
        message: t('common.error'),
        color: 'red',
      });
    },
  });
}

function useDeleteProfession() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (professionId: number) =>
      api.Professions.deleteProfession(professionId).then(() => professionId),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('professions.notifications.deleteSuccess'),
        color: 'teal',
      });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onError: () => {
      notifications.show({
        title: t('common.error'),
        message: t('common.error'),
        color: 'red',
      });
    },
  });
}

const rootQueryClient = new QueryClient();

const ProfessionPage = () => {
  const { t } = useTranslation();
  return (
    <MantineProvider>
      <QueryClientProvider client={rootQueryClient}>
        <ModalsProvider>
          <Notifications />
          <Skeleton>
            <Stack mb="lg">
              <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>
                {t('professions.title')}
              </Title>
            </Stack>
            <ProfessionTable />
          </Skeleton>
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default ProfessionPage;
