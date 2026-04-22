'use client';

import type { CustomSection } from '../types';
import { SectionWrapper } from './components/SectionWrapper';

export function CustomSectionRenderer({ section }: { section: CustomSection }): React.JSX.Element {
  return <SectionWrapper section={section}>{section.render()}</SectionWrapper>;
}
