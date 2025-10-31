import { Welcome } from '../components/Welcome';
import { Skeleton } from '../components/Skeleton';

export function HomePage() {
  return (
    <Skeleton>
      <Welcome />
    </Skeleton>
  );
}