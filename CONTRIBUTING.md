# Contributing to Lumen

Start with the [development guide](docs/engineering/development.md) for local setup, then read the [project conventions](docs/engineering/project-conventions.md) before changing application code.

- Keep pull requests focused. Share what changed, why, and how it was verified. For interface changes, include a screenshot or recording without account information.
- Use `pnpm test` for pure logic and embedded PostgreSQL tests; run the browser suite for changes to navigation, authentication, forms, or moderation. Cover absence, invalid inputs, and permission boundaries as well as the happy path.
- Never point fixtures, write-enabled tests, or seeds at production. For schema changes, add a migration rather than editing a migration already applied elsewhere. Describe rollout order and risks.
- For venue data, provide a primary source and the date checked. Leave unknown facts unknown. Do not include photos or reviews without permission to reuse them.
- Do not post secrets or personal information in an issue or screenshot. See [security reporting](SECURITY.md) for issues involving a vulnerability.
