import { validateContent } from '../content/validateContent'
import { PROFESSION_ACTIVITIES } from '../../shared/professions'

const errors = validateContent()
if (PROFESSION_ACTIVITIES.length !== 54 || new Set(PROFESSION_ACTIVITIES.map((activity) => activity.resourceId)).size !== 54) errors.push('Phase 10 must define exactly one gathering activity for each of the 54 existing resources.')
if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log('Content validation passed: 2 Rifts, 6 floors, 41 enemies, 54 tier resources, 54 profession activities, 222 tier recipes, and all references are valid.')
}
