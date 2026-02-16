## ADDED Requirements
### Requirement: Skills Incident Regression Completeness
Every known skills incident in the audit corpus SHALL have at least one failing-first integration regression test and one passing verification run.

#### Scenario: Incident regression mapping completeness
- **WHEN** the skills incident corpus is reviewed before merge
- **THEN** each incident entry references one or more concrete integration tests by file and test name
- **AND** each referenced test proves the historical failure mode is no longer reproducible

#### Scenario: Regression tests are executed in CI verification
- **WHEN** the skills verification workflow runs in CI or release validation
- **THEN** all incident regression tests execute
- **AND** the workflow fails if any incident test is skipped or absent

### Requirement: Skills Verification Quality Gates
Skills-focused changes SHALL pass clean verification gates with no compilation, lint, or test warnings/errors in touched scope.

#### Scenario: Clean lint/type/test/format verification for skills change set
- **WHEN** a skills-focused change is prepared for merge
- **THEN** `pnpm lint`, `pnpm test`, and `pnpm format` complete successfully
- **AND** touched skills-related files report no warnings or errors in the verification output

### Requirement: Skills Incident Suite Coverage Enforcement
The skills incident regression suite SHALL enforce 100% line and branch coverage.

#### Scenario: Coverage threshold enforcement
- **WHEN** the skills incident regression suite is executed with coverage enabled
- **THEN** line coverage is 100%
- **AND** branch coverage is 100%
- **AND** the run fails automatically if either threshold is not met
