import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { Skeleton } from '../components/Skeleton';

export function HomePage() {
  return (
    <Skeleton>
      <Welcome />
      <ColorSchemeToggle />
    </Skeleton>
  );
}