import { withTailwindMerge } from '@tailwind-merge/next'

// The test harness hands the plugin options over through the environment so this one config file serves every scenario. `agentRules: false` keeps Next.js from writing agent instruction files into the fixture copy.
export default withTailwindMerge({ agentRules: false }, JSON.parse(process.env.TWM_OPTIONS ?? '{}'))
