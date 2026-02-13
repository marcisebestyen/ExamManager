import { useState } from 'react';
import {
  IconAlertCircle,
  IconCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeXls,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Group,
  List,
  Modal,
  Paper,
  rem,
  RingProgress,
  ScrollArea,
  Stack,
  Text,
  Timeline,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';

interface ImportModalProps {
  opened: boolean;
  onClose: () => void;
  entityName: string;
  onDownloadTemplate: () => Promise<any>;
  onImport: (formData: FormData) => Promise<any>;
  onSuccess: () => void;
}

export const ImportModal = ({
  opened,
  onClose,
  entityName,
  onDownloadTemplate,
  onImport,
  onSuccess,
}: ImportModalProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const handleDownload = async () => {
    try {
      const response = await onDownloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entityName}_Import_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('importModal.notifications.downloadFailed'),
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setLoading(true);
    setImportResult(null);
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await onImport(formData);
      const data = response.data;

      const successCount = data.successCount ?? data.SuccessCount ?? 0;
      const rawErrors = data.errorMessages ?? data.ErrorMessages ?? [];
      const safeErrors = Array.isArray(rawErrors)
        ? rawErrors.map((e: any) => (typeof e === 'object' ? JSON.stringify(e) : String(e)))
        : [];

      setImportResult({ success: successCount, errors: safeErrors });

      if (successCount > 0) {
        notifications.show({
          title: t('importModal.notifications.importComplete'),
          message: t('importModal.notifications.importCompleteMsg', {
            count: successCount,
            entity: entityName,
          }),
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
        onSuccess();
      } else if (safeErrors.length > 0) {
        notifications.show({
          title: t('importModal.result.noDataTitle'),
          message: t('importModal.result.noDataMsg'),
          color: 'yellow',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (error: any) {
      const serverErrors = error.response?.data?.details;
      const serverMessage = error.response?.data?.message || t('common.error');
      const errorList = Array.isArray(serverErrors) ? serverErrors : [serverMessage];

      setImportResult({ success: 0, errors: errorList });
      notifications.show({
        title: t('importModal.notifications.importFailed'),
        message: t('common.error'),
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImportResult(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={reset}
      title={<Text fw={700}>{t('importModal.title', { entity: entityName })}</Text>}
      size="lg"
      centered
      radius="md"
      overlayProps={{ opacity: 0.5, blur: 4 }}
    >
      <Stack gap="xl">
        <Timeline active={1} bulletSize={24} lineWidth={2}>
          <Timeline.Item bullet={<IconDownload size={12} />} title={t('importModal.step1.title')}>
            <Text c="dimmed" size="sm" mb="sm">
              {t('importModal.step1.desc')}
            </Text>
            <Button
              variant="default"
              size="xs"
              leftSection={<IconFileTypeXls size={14} color="green" />}
              onClick={handleDownload}
            >
              {t('importModal.step1.button')}
            </Button>
          </Timeline.Item>

          <Timeline.Item
            bullet={<IconUpload size={12} />}
            title={t('importModal.step2.title')}
            lineVariant="dashed"
          >
            <Text c="dimmed" size="sm" mb="sm">
              {t('importModal.step2.desc')}
            </Text>

            {!importResult ? (
              <Dropzone
                onDrop={handleUpload}
                onReject={() =>
                  notifications.show({
                    message: t('importModal.step2.rejected'),
                    color: 'red',
                  })
                }
                maxSize={3 * 1024 ** 2}
                accept={[MIME_TYPES.xlsx, MIME_TYPES.xls]}
                loading={loading}
                radius="md"
                style={{
                  border: '1px dashed var(--mantine-color-default-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--mantine-color-text)',
                }}
              >
                <Group justify="center" gap="xl" style={{ minHeight: 120, pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconUpload
                      style={{
                        width: rem(52),
                        height: rem(52),
                        color: 'var(--mantine-color-blue-6)',
                      }}
                      stroke={1.5}
                    />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX
                      style={{
                        width: rem(52),
                        height: rem(52),
                        color: 'var(--mantine-color-red-6)',
                      }}
                      stroke={1.5}
                    />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconFileSpreadsheet
                      style={{
                        width: rem(52),
                        height: rem(52),
                        color: 'var(--mantine-color-dimmed)',
                      }}
                      stroke={1.5}
                    />
                  </Dropzone.Idle>

                  <div>
                    <Text size="lg" inline>
                      {t('importModal.step2.dropzone')}
                    </Text>
                    <Text size="sm" c="dimmed" inline mt={7}>
                      {t('importModal.step2.dropzoneSub')}
                    </Text>
                  </div>
                </Group>
              </Dropzone>
            ) : (
              <Paper withBorder radius="md" p="md" bg="var(--mantine-color-body)">
                <Group align="flex-start" wrap="nowrap">
                  <RingProgress
                    size={60}
                    roundCaps
                    thickness={6}
                    sections={[
                      {
                        value: importResult.success > 0 ? 100 : 0,
                        color: importResult.success > 0 ? 'teal' : 'red',
                      },
                    ]}
                    label={
                      <Stack align="center" gap={0}>
                        {importResult.success > 0 ? (
                          <IconCheck
                            size={20}
                            color="var(--mantine-color-teal-6)"
                            style={{ display: 'block', margin: 'auto' }}
                          />
                        ) : (
                          <IconX
                            size={20}
                            color="var(--mantine-color-red-6)"
                            style={{ display: 'block', margin: 'auto' }}
                          />
                        )}
                      </Stack>
                    }
                  />
                  <div style={{ flex: 1 }}>
                    <Text fw={700} size="sm">
                      {t('importModal.result.title')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('importModal.result.success', { count: importResult.success })}
                    </Text>

                    {importResult.errors && importResult.errors.length > 0 && (
                      <Alert
                        variant="light"
                        color="red"
                        title={t('importModal.result.issues')}
                        mt="xs"
                        icon={<IconAlertCircle size={16} />}
                      >
                        <ScrollArea h={100} type="auto" offsetScrollbars>
                          <List spacing={4} size="xs" type="ordered">
                            {importResult.errors.map((err, i) => (
                              <List.Item key={i}>{err}</List.Item>
                            ))}
                          </List>
                        </ScrollArea>
                      </Alert>
                    )}

                    <Button
                      variant="subtle"
                      size="xs"
                      mt="xs"
                      onClick={() => setImportResult(null)}
                    >
                      {t('importModal.result.another')}
                    </Button>
                  </div>
                </Group>
              </Paper>
            )}
          </Timeline.Item>
        </Timeline>
      </Stack>
    </Modal>
  );
};
