'use client';

import Divider, { type DividerProps } from '@mui/material/Divider';
import * as React from 'react';

const Separator = React.forwardRef<HTMLHRElement, DividerProps>((props, ref) => (
  <Divider ref={ref} {...props} />
));
Separator.displayName = 'Separator';

export { Separator };
