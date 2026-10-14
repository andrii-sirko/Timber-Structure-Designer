import type { Dict } from '../core';
import common from './common';
import uiMain from './ui-main';
import results from './results';
import panels from './panels';
import scene from './scene';
import assembly from './assembly';
import engineStatics from './engine-statics';
import engineFraming from './engine-framing';
import engineParts from './engine-parts';
import engineJoints from './engine-joints';
import engineSpec from './engine-spec';
import uiBuild from './ui-build';

/** One file per app area so entries stay next to the code that uses them; later files win on duplicates. */
export const DICTIONARY_PARTS: Record<string, Dict> = { common, uiMain, results, panels, scene, assembly, engineStatics, engineFraming, engineParts, engineJoints, engineSpec, uiBuild };

export const DICTIONARY: Dict = Object.assign({}, ...Object.values(DICTIONARY_PARTS));
