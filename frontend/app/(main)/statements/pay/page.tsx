'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import { PayablesView } from '../components/payables/PayablesView';

export default function StatementsPayPage() {
  return (
    <>
      <StatementsSidePanel activeItem="pay" />
      <PayablesView />
    </>
  );
}
