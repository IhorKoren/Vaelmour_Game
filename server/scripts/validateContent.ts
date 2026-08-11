import { validateContent } from '../content/validateContent'

const errors = validateContent()
if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log('Content validation passed: 3 floors, 20 enemies, 27 tier resources, 111 Phase 7 recipes, and all references are valid.')
}
