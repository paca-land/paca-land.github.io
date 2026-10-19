// Every pack's Chinese (packs/index.js), merged for i18n.js. These files are
// plain data and import nothing, so i18n.js has them before any pack's t() runs.
import { ZH as lotus } from './lotus.zh.js';
import { ZH as pillars } from './pillars.zh.js';
import { ZH as sunflower } from './sunflower.zh.js';
import { ZH as geyser } from './geyser.zh.js';
import { ZH as globe } from './globe.zh.js';
import { ZH as lanterns } from './lanterns.zh.js';
import { ZH as crater } from './crater.zh.js';
import { ZH as jelly } from './jelly.zh.js';
import { ZH as ferry } from './ferry.zh.js';
import { ZH as apiary } from './apiary.zh.js';
import { ZH as greenhouse } from './greenhouse.zh.js';
import { ZH as puppets } from './puppets.zh.js';
import { ZH as glassworks } from './glassworks.zh.js';
import { ZH as station } from './station.zh.js';

export const PACK_ZH = { ...lotus, ...pillars, ...sunflower, ...geyser, ...globe, ...lanterns, ...crater, ...jelly, ...ferry, ...apiary, ...greenhouse, ...puppets, ...glassworks, ...station };
