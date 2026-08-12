import { validateContent } from '../content/validateContent'

const errors = validateContent()
if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log('Content validation passed: 2 Rifts, 6 floors, 41 enemies, 54 tier resources, 222 tier recipes, and all references are valid.')
}
