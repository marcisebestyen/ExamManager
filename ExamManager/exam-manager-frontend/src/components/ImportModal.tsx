import { useState } from 'react';
import { IconAlertCircle, IconCheck, IconDownload, IconFileSpreadsheet, IconUpload, IconX } from '@tabler/icons-react';
import { Alert, Button, Group, List, Modal, Paper, ScrollArea, Stack, Text, ThemeIcon } from '@mantine/core';
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
  onSuccess
}: ImportModalProps) => {
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number, errors: string[] } | null>(null);

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
        title: 'Download Failed',
        message: 'Could not download the template. Please try again later.',
        color: 'red',
        icon: <IconX />,
      });
    }
  };

  const handleUpload = async (files: File[])=> {
    if (files.length === 0) {
      return;
    }

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
          ? rawErrors.map((e: any) => typeof e === 'object' ? JSON.stringify(e)
          : String(e)) : [];

      setImportResult({ success: successCount, errors: safeErrors });

      if (successCount > 0) {
        notifications.show({
          title: 'Import Complete',
          message: `Imported ${successCount} ${entityName} added successfully.`,
          color: 'teal',
        });
        onSuccess();
      } else if (safeErrors.length > 0) {
        notifications.show({
          title: "No Data Added",
          message: "Check the error log for details.",
          color: 'yellow',
        });
      }
    } catch (error: any) {
      const serverErrors = error.response?.data?.details;
      const serverMessage = error.response?.data?.message || 'Server error or invalid file format.';

      const errorList = Array.isArray(serverErrors) ? serverErrors : [serverMessage];

      setImportResult({ success: 0, errors: errorList });

      notifications.show({ title: 'Import Failed', message: 'See details below.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImportResult(null);
    onClose();
  }

  return (
    <Modal opened={opened} onClose={reset} title={`Import ${entityName}`} size="lg" centered>
      <Stack gap="xl">
        <Paper withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text fw={500} size="sm">
                Step 1: Get the Template
              </Text>
              <Text c="dimmed" size="xs">
                Download the formatted Excel file.
              </Text>
            </div>
            <Button
              variant="outline"
              color="violet"
              radius="md"
              leftSection={<IconDownload size={16} />}
              onClick={handleDownload}
            >
              Download Template
            </Button>
          </Group>
        </Paper>
        <div>
          <Text fw={500} size="sm" mb="xs">
            Step 2: Upload Data
          </Text>
          {!importResult ? (
            <Dropzone
              onDrop={handleUpload}
              onReject={() => notifications.show({ message: 'File rejected', color: 'red' })}
              maxSize={3 * 1024 ** 2}
              accept={[MIME_TYPES.xlsx, MIME_TYPES.xls]}
              loading={loading}
            >
              <Group justify="center" gap="xl" style={{ minHeight: 100, pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={50} stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={50} stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileSpreadsheet size={50} stroke={1.5} />
                </Dropzone.Idle>

                <div>
                  <Text size="xl" inline>
                    Drag 'n' drop your .xlsx file here
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    or click to select file
                  </Text>
                </div>
              </Group>
            </Dropzone>
          ) : (
            <Stack>
              <Alert
                variant="light"
                color={importResult.success > 0 ? 'green' : 'red'}
                title="Import Finished"
                icon={importResult.success > 0 ? <IconCheck /> : <IconAlertCircle />}
              >
                Processed with {importResult.success} successful additions.
              </Alert>

              {importResult.errors && importResult.errors.length > 0 && (
                <>
                  <Text size="sm" fw={500} mt="sm">
                    Warnings / Errors:
                  </Text>
                  <ScrollArea h={150} type="auto" offsetScrollbars>
                    <List spacing="xs" size="sm" center>
                      {importResult.errors.map((err, i) => (
                        <List.Item
                          key={i}
                          icon={
                            <ThemeIcon color="red" size={16} radius="xl">
                              <IconX size={10} />
                            </ThemeIcon>
                          }
                        >
                          {err}
                        </List.Item>
                      ))}
                    </List>
                  </ScrollArea>
                </>
              )}
              <Button onClick={() => setImportResult(null)} variant="default">
                Upload Another File
              </Button>
            </Stack>
          )}
        </div>
      </Stack>
    </Modal>
  );
};
