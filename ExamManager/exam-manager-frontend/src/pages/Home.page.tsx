import { Welcome } from '../components/Welcome/Welcome';
import { Skeleton } from '../components/Skeleton';

export function HomePage() {
  return (
    <Skeleton>
      <Welcome />
    </Skeleton>
  );
}