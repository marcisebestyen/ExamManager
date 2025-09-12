import { useEffect, useState, useMemo } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Button, Table, Text, Title } from '@mantine/core';
import { IExamType } from '@/interfaces/IExamType';
import api from '../api/api';
import { Skeleton } from '../components/Skeleton';


const ExamTypePage = () => {
  const [examTypes, setExamTypes] = useState<IExamType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const columns = useMemo<MRT_ColumnDef<IExamType>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        enableColumnFilterModes: false,
        filterFn: 'equals',
      },
      {
        accessorKey: 'typeName',
        header: 'Exam Type Name',
      },
      {
        accessorKey: 'description',
        header: 'Description',
      },
    ],
    [],
  );

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

  // const rows = examTypes.map((examType) => (
  //   <Table.Tr key={examType.id}>
  //     <Table.Td>{examType.id}</Table.Td>
  //     <Table.Td>{examType.typeName}</Table.Td>
  //     <Table.Td>{examType.description}</Table.Td>
  //     <Table.Td>
  //       <Button variant="outline" color="red" radius="md">Delete</Button>
  //       <Button variant="outline" color="orange" radius="md">Modify</Button>
  //     </Table.Td>
  //   </Table.Tr>
  // ));

  return (
    <Skeleton>
      <Title order={2}>Exam Types</Title>
      <MantineReactTable
        columns={columns}
        data={examTypes}
        enableColumnFilterModes
        initialState={{ showColumnFilters: true }}
      />
    </Skeleton>
  );

  // return (
  //   <Skeleton>
  //     <Title order={2}>Exam Types</Title>
  //     <Table>
  //       <Table.Thead>
  //         <Table.Tr>
  //           <Table.Th>ID</Table.Th>
  //           <Table.Th>Exam Type Name</Table.Th>
  //           <Table.Th>Description</Table.Th>
  //           <Table.Th>Actions</Table.Th>
  //         </Table.Tr>
  //       </Table.Thead>
  //       <Table.Tbody>{rows}</Table.Tbody>
  //     </Table>
  //   </Skeleton>
  // );
};

export default ExamTypePage;