import { redirect } from 'next/navigation';
import { getDefaultAppRoute } from './lib/default-app-route';

export default function HomePage() {
  redirect(getDefaultAppRoute());
}
