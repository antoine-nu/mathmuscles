// Registre des sujets écrits chacun dans leur propre fichier (un sujet = entraînement + améliorations + hôtel de ville).
// Un sujet dont CONTENT vaut null n'est pas encore écrit : il n'est pas proposé aux joueurs.
import type { SubjectContent } from '../utils'
import { CONTENT as S_5e_arith } from './5e-arith'
import { CONTENT as S_5e_puiss } from './5e-puiss'
import { CONTENT as S_5e_equa } from './5e-equa'
import { CONTENT as S_5e_proba } from './5e-proba'
import { CONTENT as S_5e_angles } from './5e-angles'
import { CONTENT as S_5e_sym } from './5e-sym'
import { CONTENT as S_5e_para } from './5e-para'
import { CONTENT as S_5e_aires } from './5e-aires'
import { CONTENT as S_2_ens } from './2-ens'
import { CONTENT as S_2_var } from './2-var'
import { CONTENT as S_2_ref } from './2-ref'
import { CONTENT as S_2_geo } from './2-geo'
import { CONTENT as S_2_biv } from './2-biv'
import { CONTENT as S_2_proba } from './2-proba'
import { CONTENT as S_T_denomb } from './T-denomb'
import { CONTENT as S_T_suites } from './T-suites'
import { CONTENT as S_T_limites } from './T-limites'
import { CONTENT as S_T_logique } from './T-logique'
import { CONTENT as S_T_derivee } from './T-derivee'
import { CONTENT as S_T_lntrig } from './T-lntrig'
import { CONTENT as S_T_primitives } from './T-primitives'
import { CONTENT as S_T_integrales } from './T-integrales'
import { CONTENT as S_T_espace } from './T-espace'
import { CONTENT as S_T_param } from './T-param'
import { CONTENT as S_T_complexes } from './T-complexes'
import { CONTENT as S_T_matrices } from './T-matrices'
import { CONTENT as S_T_binom } from './T-binom'
import { CONTENT as S_T_sommesva } from './T-sommesva'
import { CONTENT as S_T_bienayme } from './T-bienayme'
import { CONTENT as S_T_python } from './T-python'
import { CONTENT as S_T_arith } from './T-arith'
import { CONTENT as S_T_complem } from './T-complem'

const ALL: Record<string, SubjectContent | null> = {
  '5e-arith': S_5e_arith,
  '5e-puiss': S_5e_puiss,
  '5e-equa': S_5e_equa,
  '5e-proba': S_5e_proba,
  '5e-angles': S_5e_angles,
  '5e-sym': S_5e_sym,
  '5e-para': S_5e_para,
  '5e-aires': S_5e_aires,
  '2-ens': S_2_ens,
  '2-var': S_2_var,
  '2-ref': S_2_ref,
  '2-geo': S_2_geo,
  '2-biv': S_2_biv,
  '2-proba': S_2_proba,
  'T-denomb': S_T_denomb,
  'T-suites': S_T_suites,
  'T-limites': S_T_limites,
  'T-logique': S_T_logique,
  'T-derivee': S_T_derivee,
  'T-lntrig': S_T_lntrig,
  'T-primitives': S_T_primitives,
  'T-integrales': S_T_integrales,
  'T-espace': S_T_espace,
  'T-param': S_T_param,
  'T-complexes': S_T_complexes,
  'T-matrices': S_T_matrices,
  'T-binom': S_T_binom,
  'T-sommesva': S_T_sommesva,
  'T-bienayme': S_T_bienayme,
  'T-python': S_T_python,
  'T-arith': S_T_arith,
  'T-complem': S_T_complem,
}

export const SUBJECT_CONTENT: Record<string, SubjectContent> = Object.fromEntries(
  Object.entries(ALL).filter((e): e is [string, SubjectContent] => e[1] !== null),
)
