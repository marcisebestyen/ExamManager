import { useEffect, useState } from 'react';
import { Table, Title, Text } from '@mantine/core';
import { Skeleton } from '../components/Skeleton';
import { IExamType } from '@/interfaces/IExamType';
import api from '../api/api';

const ExamTypePage = () => {
  const [examTypes, setExamTypes] = useState<IExamType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExamTypes() {
      try {
        const response = await api.ExamTypes.getAllExamTypes();
        setExamTypes(response.data);
      } catch (error) {
        console.error("Failed to fetch exam types:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExamTypes();
  }, []);

  if (isLoading) {
    return (
      <Skeleton>
        <Text>Loading...</Text>
      </Skeleton>
    );
  }

  const rows = examTypes.map((examType) => (
    <Table.Tr key={examType.id}>
      <Table.Td>{examType.id}</Table.Td>
      <Table.Td>{examType.typeName}</Table.Td>
      <Table.Td>{examType.description}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Skeleton>
      <Title order={2}>Exam Types</Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            <Table.Th>Exam Type Name</Table.Th>
            <Table.Th>Description</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Skeleton>
  );
};

export default ExamTypePage;