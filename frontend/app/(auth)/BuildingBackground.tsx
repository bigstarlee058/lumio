'use client';

import { memo } from 'react';
import { ClockTower } from './buildings/ClockTower';
import { GothicBuilding } from './buildings/GothicBuilding';
import {
  DomeBuilding,
  ModernSlanted,
  StandardBuilding,
  SteppedSkyscraper,
} from './buildings/small-buildings';

const CONTAINER_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  zIndex: 0,
};
const BACK_LAYER_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 384,
  opacity: 0.3,
};
const FRONT_LAYER_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 320,
  opacity: 0.6,
};

function BackLayer(): React.JSX.Element {
  return (
    <div style={BACK_LAYER_STYLE}>
      <StandardBuilding left="5%" delay={0.2} duration={1.5} w={120} h={300} />
      <ModernSlanted left="25%" delay={0.4} duration={1.5} w={80} h={240} />
      <SteppedSkyscraper left="50%" delay={0.1} duration={1.5} w={110} h={320} />
    </div>
  );
}

function FrontLayer(): React.JSX.Element {
  return (
    <div style={FRONT_LAYER_STYLE}>
      <SteppedSkyscraper left="5%" delay={0.6} duration={1.2} w={140} h={350} />
      <ClockTower left="38%" delay={0.8} duration={1.2} w={110} h={280} />
      <DomeBuilding left="60%" delay={0.7} duration={1.2} w={180} h={220} />
      <GothicBuilding right="5%" delay={0.9} duration={1.2} w={170} h={360} />
    </div>
  );
}

function BuildingBackground(): React.JSX.Element {
  return (
    <div style={CONTAINER_STYLE}>
      <BackLayer />
      <FrontLayer />
    </div>
  );
}

export default memo(BuildingBackground);
