import type { Dict } from '../core';
import common from './common';
import uiMain from './ui-main';
import results from './results';
import panels from './panels';
import scene from './scene';
import engineStatics from './engine-statics';
import engineFraming from './engine-framing';
import engineParts from './engine-parts';

/** One file per app area so entries stay next to the code that uses them; later files win on duplicates. */
export const DICTIONARY_PARTS: Record<string, Dict> = { common, uiMain, results, panels, scene, engineStatics, engineFraming, engineParts };

export const DICTIONARY: Dict = Object.assign({}, ...Object.values(DICTIONARY_PARTS));
