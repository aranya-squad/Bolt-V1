# Bolt: final second-pass assessment — 01 October 2026

Repository publication note: this commit contains only the two dated documents. Source links are relative to this repository. Referenced probe scripts, logs, the first `assessment.md`, AWS collector/policy and cost worksheet are original local audit artifacts, not files included in this commit. Their names preserve evidence provenance; use the documented cases and repository tests to vet findings if those artifacts are unavailable.

**Decision:** the inspected code has reproducible integrity and persistence defects and does not yet establish a fair, recoverable simultaneous tournament. Resolve those defects and agree tournament rules before selecting larger AWS resources. Retain the existing stack as the starting point; select capacity and availability changes from measured evidence.

This document supersedes `assessment.md` for planning. It incorporates CTO, Product Head, Senior Developer and QA Head reviews, followed by a consolidated release review. These are four review lenses applied in this assessment, not four independent reviewers' sign-offs. The original is preserved for comparison.

The user confirmed **100–150 users joining and answering timed questions simultaneously**, with tentative growth toward thousands. Event duration, cadence, scoring, budget and service targets remain open. Prizes, a public leaderboard and paid participation have not been confirmed.

No application code, GitHub branch or AWS resources were changed in this second pass. No deployment or public load test was run. The earlier GitHub-only instruction remains in force.

## 1. Evidence, scope and confidence

| Item | Evidence available on 01 October 2026 |
|---|---|
| Backend and bundled SPA | Bolt-V1 `62ddc8c775098b71258361cb19ee126b75342c31`, branch `feat-Sagar` |
| Separate SPA | Bolt-V1-frontend `b26fd2c6f0cb25e036609ffbb4c37caeb6fc7b7f` |
| Source scope | Application routes, models, grading, authentication, practice UI, classroom APIs, imports, settings, CI and deployment scripts in these checkouts |
| Local runtime evidence | Seven original probes rerun with eight additional probes: **15 passed, 27 warnings**. Passing means the probes reproduced their asserted observations, including defects. |
| Probe environment | Python 3.12, local PostgreSQL 17 and Redis 8; Django test settings; synthetic users and sessions; no production data |
| Production equivalence | CI declares PostgreSQL 16, Redis 7 and Node 20. Local setup uses different service/Node versions. Most API probes use `force_authenticate`; default throttling is disabled and hashing is MD5. Two authentication probes explicitly enable PBKDF2. |
| Live AWS evidence | None collected. SDK discovery found no usable credentials in this workspace; STS could not sign the request and stopped with `NoCredentialsError`. This was not an authenticated AWS access-denied response. |
| Live application/GitHub settings | API, public pricing and named public hosts were blocked by the environment's proxy during the first review. Native Git reads worked. Proxy denial is not evidence that the app is down. Deployed revision and external hosting integrations are unknown. |

Evidence labels used below:

- **R — reproduced:** observed locally under the stated conditions, not verified in production.
- **S — source-backed:** the checked-in implementation/configuration supports the statement; live execution or impact may differ.
- **H — hypothesis:** a plausible failure requiring a targeted experiment.
- **D — decision/proposal:** an unapproved requirement or proposed action.
- **U — unknown:** evidence unavailable; no affirmative conclusion should be drawn.

Reproduction sources: `test_diagnostics.py`, `test_second_pass.py`, and `second-pass-diagnostics.log`. The new HTTP login probe exercises the real authentication backend without forced authentication, but still uses test settings with throttling disabled. The health probe applies production security options to the local Django client; it does not run the production Docker image.

The prior report recorded successful unit tests/lint/builds and a database-backed browser login. Those are earlier checks, not checks rerun here or proof of full production behavior. Sequential probes do not test races, sustained load, real network loss, Celery workers, replica lag or browser recovery.

## 2. Corrections to the first assessment

| First-pass statement or implication | Second-pass correction and backing |
|---|---|
| The bundled frontend is “substantially ahead”; the separate repo is “older.” | Recounted: 110 versus 94 source files, 18 bundled-only, two separate-only and 25 differing shared files. Teacher/admin and registration features differ. This establishes divergence, not chronology, product completeness or which repo is deployed. Choose the canonical source explicitly. |
| Seven passing diagnostic tests establish broad confidence. | They reproduce adverse behavior. Forced authentication, disabled throttling, MD5 hashing and local service versions limit what they establish. The real hasher revealed an additional login failure. |
| A failed practice flush loses browser answers. | API reproduction proves rejection of a duplicate-question batch and subsequent successful zero-score finalization. Source proves retries are swallowed and finalization proceeds. An end-to-end browser loss/recovery experiment remains outstanding. |
| 94 SQL statements describe production cost or capacity. | This is one synthetic 30-answer batch with authentication bypassed, not latency, throughput, database CPU or an AWS benchmark. Multiplication is offered-work arithmetic only. |
| Larger named instance sizes are a suitable release baseline. | No utilization/cost evidence supports a prescribed size. Earlier `t4g.small/medium` and 2 GiB DB suggestions are unvalidated experiment candidates; this report makes no sizing commitment. |
| A feature-branch push cannot trigger the workflow. | Its push trigger only matches `main`, but a push to an existing PR can trigger `pull_request` synchronization. External Vercel/GitHub App deployment settings remain unknown. |
| Generate a lockfile and clean CI is solved. | `package-lock.json` and `*.lock` are ignored in Bolt-V1. Reconcile that policy and track the chosen lockfile. Python top-level pins do not freeze all transitive dependencies. No clean GitHub run was observed here. |
| Caddy bootstrap is only missing domain variables/ports. | It also does not copy the Caddyfile required by current Compose. The internal HTTP health probe conflicts with SSL redirect settings; see D15 below. |
| AWS is “directly connected” to GitHub. | Scripts establish intended AWS provisioning/deployment. The inspected CI contains no AWS deploy action. Live integrations and deployed commit are unverified. |
| Account access failed because AWS rejected the collector. | Credential discovery failed before authentication. Network reachability is a separate unresolved prerequisite. |
| The supplied collector can establish a complete cost/utilization baseline. | It is an unvalidated draft with coverage/statistic limitations. It needs the checks in section 8 before its output can support sizing or project-attributed costs. |
| A read replica is affecting current scoring. | Replica routing is conditional on `REPLICA_DATABASE_URL`. Risk exists in source; no active replica or stale-score reproduction was established. |
| Timing, targets, topology and tournament features are established requirements. | Only simultaneous timed participation is confirmed. Cadence, round length, fairness policy, leaderboard, service targets and node-failure tolerance are decisions. The AWS topology is script-derived. Absence of event models/routes is limited to inspected repositories, not external systems. |

## 3. Product and system context

Bolt is an abacus/mental-arithmetic learning webapp. The SPA uses React/TypeScript/Vite, Zustand, TanStack Query and Axios. Django/DRF manages identities, curriculum, sessions, grading, progress and classes. PostgreSQL stores durable state; Redis supports caching/throttling and Celery transport.

| User flow | Existing behavior | Tournament implication |
|---|---|---|
| Student registration/login | Join code, call sign and four-digit PIN; enrollment and a consent record; JWT and refresh cookie | Rehearse shared-school-IP login bursts, account recovery and participant eligibility. Stored consent metadata is not proof of an actual approval process. |
| Classwork/lesson drill | Start/resume, per-question writes, finalization, report and progression | Better candidate for server grading, but deadline, attempt, replay, access and scoring defects must be fixed. |
| Practice | Time Attack, Zen, Custom and Flash Cards; answers sent to browser; local grading and buffered writes | Appropriate practice feedback does not establish competition integrity. A tournament payload must follow agreed disclosure rules. |
| Teacher | Classes, join codes, rosters and completion dashboard | Existing “live session” is an external link, not proof of an organizer-controlled in-app round. |
| Admin | XLSX content import and Django administration | Import does not currently prove the selected questions are what a session receives. |

No tournament/event, round registration, synchronized organizer start, immutable event question assignment or event standings implementation was identified in the inspected models/routes. Personal XP/ranks are not an event leaderboard. Product must decide whether these capabilities are required, or whether a simpler timed classroom event is sufficient.

Intended infrastructure from [bootstrap](../aws-deploy.sh#L193), [resume](../aws-resume-deploy.sh#L117) and [Compose](../docker-compose.prod.yml#L6):

| Component | Checked-in configuration, not live inventory |
|---|---|
| Region/network | Mumbai `ap-south-1`; default VPC/public app host; database/cache use managed services |
| App | One ARM64 `t4g.micro`, 20 GiB gp3 EBS; Gunicorn, Caddy, Celery concurrency two and beat share the host |
| Gunicorn | `2 × CPU + 1` workers, two gthread threads each, preload and 30-second timeout; five workers/ten threads would follow from two CPUs, not a measured process count |
| Database | `db.t3.micro`, PostgreSQL 16.9, 20 GiB gp2, private Single-AZ, seven-day backups, deletion protection disabled in bootstrap |
| Cache | One `cache.t3.micro`, Redis 7.1; bootstrap has no replica/failover |
| Storage/images | S3 static/media buckets and ECR; scripts use mutable `latest` images |
| Edge/deployment | Caddy 80/443; one Compose web service; `up --wait` does not establish rolling availability |
| Other services | ALB, ASG, ECS, NAT and CloudFront are not provisioned by this bootstrap. Historical or manually created resources may still exist. |

The 1 GiB app-host configuration and scripted swap workaround justify measuring memory; they do not prove current production memory pressure. S3 defaults, encryption, policies and live resource settings must be inspected rather than inferred from omitted script flags.

## 4. Reproduced observations

| ID | Local observation | What it establishes |
|---|---|---|
| D01 | Three identical bulk calls for one correct question create three rows; three-question session reports 3/3, 100%. | Replay changes stored results; question coverage is not protected by this path. |
| D02 | Two bulk attempts for one test-mode question both return 200. | Bulk path does not enforce the expected one-attempt behavior. The tournament rule still needs agreement. |
| D03 | Four single correct attempts return 200 despite the constant cap of three. | Single-path cap enforcement is defective. |
| D04 | Answer accepted after one hour although template limit is 120 seconds. | Current ingestion does not enforce that displayed limit. No precise event deadline can be assumed. |
| D05 | One 30-answer bulk request performs 94 SQL statements: 62 SELECT, 30 INSERT, two transaction statements. | A query-amplification opportunity under this synthetic setup; no throughput claim. |
| D06 | Wrong/correct retry pair for the same question in one batch returns 400; finalization returns 200, zero rows and score zero. | Practice retry contract and finalization can disagree about persisted work. |
| D07 | Invalid second bulk item returns 400 while the first item's row remains committed. | Whole-request error does not mean whole-request rollback. `ATOMIC_REQUESTS` does not roll back merely because a normal response has status 400. |
| D08 | Correct account-deletion credential returns 500; user stays active and no audit event is written. | Deletion fails before anonymization/deactivation. |
| D09 | Locked level start returns 403; first-lesson start in that level returns 201 for the same user. | Endpoint-specific access rules can be bypassed. |
| D10 | Unknown call sign with PBKDF2 raises `ValueError` in the authentication backend. | Invalid dummy hash is hidden by the MD5 test configuration. |
| D11 | Unknown call sign with PBKDF2 through the login HTTP route returns 500. | The backend exception reaches the route under these local settings. |
| D12 | ADMIN user requesting teacher class-list API receives 403. | Source permits ADMIN into the teacher SPA route but API permits only TEACHER. Required admin authority remains a product decision. |
| D13 | Four correct submissions for question zero finalize to 4/3, **133.33%**. | Scoring is not bounded by distinct question coverage. Downstream XP/progression need explicit regression checks. |
| D14 | Cold-cache roster: five students → 29 SQL statements; ten → 54. | Per-student query growth exists for these two sizes. Larger-roster latency and warm-cache behavior are not measured. |
| D15 | Direct HTTP health request, with declared production redirect/proxy options, returns 301 to `https://localhost:8000/api/v1/health/`. | Compose uses this HTTP URL without the proxy header. Its urllib probe follows redirects toward Gunicorn's HTTP port, creating a configuration conflict; actual image health has not been tested. |

## 5. Four-persona review

### CTO: protect results, establish evidence, then buy capacity

**Required changes to the assessment:** prioritize integrity and recovery ahead of instance size; distinguish launch availability from growth capacity; require a deployment identity and attributable bill; include artifact/secret boundaries and incident ownership.

- Establish the canonical frontend, deployed commit/image digest, live topology and external auto-deploy settings. Two divergent sources and mutable tags obstruct diagnosis and rollback.
- Agree whether one app-node failure may interrupt the event. If uninterrupted participation is required, evaluate two stateless app nodes plus load balancing, DB failover and cache/broker recovery together. Two web nodes alone do not remove Single-AZ DB risk.
- Make replay-safe scoring, auditability and restore rehearsal release gates. Redis must not become the only copy of accepted answers; cache outage behavior and broker retries need explicit tests.
- Keep the current framework stack unless benchmarks demonstrate a limitation. No evidence justifies a rewrite, Kubernetes or a read replica now.
- Compare measured baseline, tuned single-host and availability-focused alternatives with full monthly and event costs. Do not sign commitments or remove safeguards before utilization and recovery requirements are known.

**CTO acceptance:** a traceable staging release, results reconciliation, restore evidence, incident/runbook ownership, and a priced configuration that satisfies agreed service goals. Capacity sign-off is currently unavailable.

### Product Head: define the event and participant promise

**Required changes to the assessment:** do not equate practice timers with a tournament. Define start/deadline, scoring, recovery and content selection before engineering acceptance criteria.

- Decide shared versus individualized questions; difficulty equivalence; event/round enrollment; organizer controls; late joins; number of attempts; skips; tie-breaking; result publication and dispute correction. A leaderboard or prize mechanism is conditional on the actual competition format.
- Define the authoritative deadline and whether acceptance is based on server receipt. Decide any grace period explicitly; browser timestamps cannot safely prove pre-deadline entry. Display server-derived remaining time after reload.
- Define network-loss behavior: clearly pending, accepted and rejected answers; retries after reconnect; whether offline work is permitted; recovery after reload/tab closure. The current practice page keeps pending answers in a React ref; that mechanism does not survive page reload.
- Choose the source of imported content and freeze/version the round's question set. Acceptance must compare the session questions against the organizer's chosen dataset, not merely a successful import response.
- Resolve ADMIN versus TEACHER permissions and eligible roles for joining classes/events. `JoinClassView` currently checks authentication without an explicit student-role requirement.
- Review child-data handling with the responsible privacy owner. Self-signup creates `teacher_attested` consent naming the class teacher using the signup request's IP, without a teacher approval event in that request. Account deletion currently fails; the intended wipe also leaves date-of-birth/consent records. Determine retention and genuine attestation requirements rather than claiming legal compliance from field names.

**Product acceptance:** a signed event-rule sheet, representative student/teacher journey, visible persistence states and recovery messages, content approval, and resolved role/consent policies. These decisions must precede final tournament API design.

### Senior Developer: unify contracts, invariants and releases

**Required changes to the assessment:** cover all write endpoints and persistence boundaries, include neglected authentication/deletion paths, and attach performance findings to specific measurements.

- Unify answer validation and grading across single/bulk/test/practice paths while preserving different approved practice rules. Add stable submission identifiers and database-backed uniqueness appropriate to allowed attempt numbers. Transactions, replay handling and concurrent finalization must work across processes, not merely in one Python worker.
- Define all-or-nothing batch validation or explicit per-item acknowledgement. Finalization must account for accepted pending writes; after failure the browser must retain recoverable work and expose the outcome. Verify skip semantics: the UI sends `is_skip: true` with answer zero; the backend detects a numeric sentinel.
- Repair deletion's audit-field mismatch: the model has `actor`, `subject`, `action`, `metadata`; the view supplies `user`, `event_type`, `detail`. Test rollback, deactivation, retained fields and token invalidation against the approved policy.
- Replace the malformed dummy password hash safely and test known/unknown/inactive call signs with the real production hasher. Four-digit PINs have 10,000 combinations; rate limits and anti-enumeration behavior need deliberate design. MD5 test timings cannot predict a synchronized PBKDF2 login burst.
- Optimize bulk writes and roster/history queries after defining correctness. Do not trade database constraints or acknowledgements for lower SQL counts. Teacher dashboard includes inactive enrollments while roster excludes them; resolve the reporting definition.
- Treat imported data as validated content: the importer defaults missing answers to zero, converts floats to integers, reports attempted rows despite `ignore_conflicts=True`, and replaces existing rows. No endpoint-specific file/row limit is visible. Validate duplicates, row types, answer semantics, upload limits and memory behavior; import does not create an exercise template or establish runtime use of curated rows.
- Tighten build/release boundaries. No applicable Docker ignore file was found; production Dockerfile has `COPY . .` and builds from `backend`. A local `.venv` or previous `.env.production` can enter the image. The deploy script builds before rewriting that environment file. This proves an exposure mechanism, **not** that an actual image contains secrets. Exclude secrets/dev artifacts and privately inspect existing layers before making a rotation decision. Dockerfile also lacks a non-root `USER`.

**Developer acceptance:** shared contract tests, database race/replay tests, reproducible clean build, secret-free image/context, verified health probes and immutable release artifacts. No application fixes are included in this document.

### QA Head: test the event, failure paths and production options

**Required changes to the assessment:** separate diagnostic passes from acceptance; use real authentication/throttling/security options; test browser persistence and concurrent database behavior; broaden beyond happy-path login.

| Test area | Required scenarios and measurable outcomes |
|---|---|
| Scoring/replay | Duplicate request, reordered batch, wrong/correct practice retry, simultaneous single/bulk calls, double finalize; one approved outcome, stable XP/progress and full question reconciliation |
| Time/eligibility | Before/at/after server deadline, manipulated client clock, background-tab timer, reload, late join, locked lesson/level, wrong user/session/class; enforce approved rules at API boundary |
| Network/durability | Drop response after server commit, 400 after invalid item, 429, 500, offline/reconnect, reload/tab close; accepted work recoverable and unresolved writes visible; no silent zero-score finish |
| Identity/browser | Real PIN/password hashing and JWTs; unknown/inactive account; school shared IP; CORS/cookies on real origins; token expiry, logout and concurrent multi-tab refresh |
| Teacher/admin | Cross-class isolation, ownership, intended ADMIN access, inactive enrollment counts, roster sizes 5/10/50/150, import-to-session content verification |
| Production runtime | CI service versions, actual Docker image/architecture, security middleware and healthcheck, Caddy bootstrap, Celery/beat execution, cache outage/restart, migration/rollback |
| Capacity/recovery | Synchronized login/start/finish, normal cadence plus reconnect retries, organizer dashboard/standings traffic if required, full-duration soak, worker/host loss and database restore |

Existing smoke tests described in the prior report target an obsolete heading/email form. Update them to the chosen product flow; a test rewrite is not evidence of correctness without executing against a built SPA and real API. Vite development starts MSW automatically in both frontends; mock success must not count as backend integration coverage.

**QA acceptance:** reproducible run artifacts, production-like configuration, a load manifest, reconciled answer/result counts and explicit unresolved defects. Prior unit passes and the 15 probes do not constitute this sign-off.

## 6. Consolidated engineering backlog

P0 below means a blocker for relying on simultaneous competition results, not proof of a currently failing production event. Owners are proposed roles; named owners and estimates remain to be assigned.

| ID / priority | Finding and evidence | Proposed owner | Completion evidence |
|---|---|---|---|
| F01 P0 | Replays/caps/scoring allow inflated results, including 133.33% — R: D01–D03, D13 | Backend lead | Approved attempt policy; replay/concurrent writes preserve distinct scoring, bounded accuracy, stable XP and progression |
| F02 P0 | No enforced displayed deadline — R: D04; cleanup is periodic housekeeping | Backend + Product | Server deadline and recovery rule enforced on every ingestion path; boundary/client-clock tests pass |
| F03 P0 | Failed or partially committed batches have ambiguous durability — R: D06/D07; S: practice finalize path | Frontend + Backend | Explicit batch acknowledgements; uncertain retries safe; finalize cannot silently ignore required pending writes; browser fault tests reconcile |
| F04 P0 if reused for event | Practice payload discloses answers; no inspected event orchestration — S | Product + Backend | Chosen competition flow enforces eligibility, approved content/disclosure and round controls; do not use exposed practice answers for integrity-dependent results |
| F05 P0 | Lesson endpoint bypasses previous-level gate — R: D09 | Backend | All start paths share approved eligibility checks; direct API access cannot bypass them |
| F06 P0 before release | Unknown call sign causes 500 with real hasher — R: D10/D11 | Backend | Known/unknown/inactive cases return intended statuses without malformed-hash exceptions; real-hasher tests and abuse limits pass |
| F07 P0 before next deployment | Image can include local secrets/dev files — S: Docker build/COPY; actual leakage U | Platform/Security | Context exclusions, clean image/layer inspection and runtime secret injection; response to any confirmed exposure documented |
| F08 P0 before next deployment | Bootstrap/Caddy and HTTP healthcheck inconsistencies — S + R: D15 | Platform | Fresh staging bootstrap with correct ports, domain, Caddyfile and health semantics; no unsafe global disabling of HTTPS enforcement |
| F09 P0 before release | CI lacks tracked npm lockfile and ignores locks — S | Frontend/Platform | Agreed lock policy; clean checkout installs/lints/tests/builds in CI; Python dependency reproducibility addressed |
| F10 P1 platform release | Account deletion 500 and unclear retained personal data — R: D08; S | Backend + Privacy/Product | Correct audit transaction; approved retention, re-authentication/deactivation and token behavior verified |
| F11 P1 event prerequisite | Default anon/user 60/min; named login/attempt scopes not wired on those views — S; classroom join separately uses ScopedRateThrottle | Backend/Security | Real shared-IP login and expected answer cadence work; abuse protections tested; no blanket throttle removal |
| F12 P1 | Curated import not consumed by CuratedGenerator; importer validation gaps — S | Content + Backend | Preview/validate before replacement; exact inserted counts; bounded input; versioned selected content reproduced in sessions |
| F13 P1 | 94 SQL/batch; roster 29→54 SQL for 5→10 students; history aggregation — R: D05/D14, S | Backend | Query/latency budgets measured on realistic data; no correctness regressions; dashboard enrollment policy consistent |
| F14 P1 | Frontend source, API origin and refresh-cookie behavior unresolved — S/U | Frontend/Platform | Canonical repo/deployed artifact; real-origin CORS/refresh/reload/logout tests; built SPA API requests return expected JSON |
| F15 P1 | ADMIN SPA/API mismatch; class-join role/consent policy — R: D12, S/D | Product + Backend | Role matrix approved and API/UI enforced consistently; cross-tenant access tests pass |
| F16 P1 | Mutable tags, secret fallback on failed SSH, native-platform builds and disabled host verification — S | Platform | Digest/commit traceability, ARM-compatible build, fail-closed secret retrieval, trusted deployment access and rollback rehearsal |
| F17 P1 | No verified bill, utilization, live inventory, availability or recovery baseline — U | CTO/FinOps/Platform | Section 8 evidence, budget/service decisions and tested recovery; smallest measured acceptable configuration selected |
| F18 P1 investigate | Active-session creation/resume races; resume lookup does not distinguish test mode; finalization locks one session, not all competing sessions — S/H | Backend/QA | Parallel sessions/writes tested with real DB connections; invariants enforced; requested session mode preserved |
| F19 P2 conditional | Replica read-after-write/score consistency risk if configured — S/H | Backend/Platform | Primary-pinned scoring and consistency tests before enabling a replica; no assumption a replica exists today |

Key source anchors: [answer endpoints](../backend/apps/exercises/views.py#L261), [bulk endpoint](../backend/apps/exercises/views.py#L362), [session starts](../backend/apps/exercises/views.py#L34), [scoring/finalize](../backend/apps/progress/services.py#L58), [question serialization](../backend/apps/exercises/serializers.py#L24), [practice flush](../frontend/src/features/practice/InArenaPage.tsx#L105), [login backend](../backend/apps/users/backends.py#L18), [deletion](../backend/apps/users/views.py#L398), [audit model](../backend/apps/users/models.py#L116), [classroom APIs](../backend/apps/classroom/views.py#L23), [roster serializer](../backend/apps/classroom/serializers.py#L59), [import](../backend/apps/exercises/views.py#L586), [curated generator](../backend/apps/exercises/generators/curated.py#L5), [throttles](../backend/config/settings/base.py#L140), [replica router](../backend/config/dbrouter.py#L27), [Dockerfile](../backend/docker/Dockerfile.prod#L24), [healthcheck](../docker-compose.prod.yml#L13), [production security](../backend/config/settings/production.py#L12), [CI](../.github/workflows/ci.yml#L1), [lock ignore rules](../.gitignore#L31).

## 7. Frontend/backend and release contract

`VITE_API_BASE_URL` is build-time configuration. An empty value means `/api/v1` on the SPA host. Correction from source recheck: root `Bolt-V1/vercel.json` explicitly proxies `/api/(.*)` to `https://api.boltabacus.com/api/$1` before its SPA fallback; standalone `Bolt-V1-frontend/vercel.json` has only the SPA fallback. Routing depends on the hosting project’s selected config/root and build-time origin. Actual deployed values/config selection remain U. The user supplied `www.student.boltabacus.com` and `www.teacher.boltabacus.com`; under their recency fallback, bundled `Bolt-V1/frontend` is the provisional implementation source (functional commit `fb4ef13`, June 30, newer than standalone source). This does not prove live deployment ownership; public-host/deployment API access was blocked.

Refresh cookies are HttpOnly, Secure in production and SameSite=Lax. `boltabacus.com` and its API subdomain can be same-site despite different origins; a parent-domain cookie is not automatically required. A `vercel.app` frontend is cross-site to that domain and needs a separately tested design. Credentialed CORS requires explicit allowed origins. Rotating/blacklisted refresh tokens also require multi-tab tests; no race has been reproduced here. Never cache user-specific responses or private answers publicly.

Checked-in CI handles pull requests and pushes to main, builds the bundled frontend and uploads an artifact. It has no AWS deployment step. External integrations may still deploy from GitHub. Production revision, canonical frontend and workflow history require authenticated verification. Do not infer that a GitHub push cannot affect hosting merely from this YAML.

Proposed release path: reviewed feature PR → clean CI → immutable compatible image and SPA artifact → staging → migration/rollback rehearsal → separate production authorization. Bootstrap must copy the Caddyfile and align ingress/domain variables with current Compose. Resume's secret-preservation code generates a new key if SSH retrieval yields nothing, including a suppressed SSH error; distinguish missing secret from failed retrieval and fail safely. No release step is executed by this assessment.

## 8. AWS usage, cost and configuration: evidence still required

**Current AWS spend, utilized resources and safe capacity are unknown. There is no defensible numerical savings estimate.** The initial resource list is a script description, and old compute-only figures in repository documentation are not a complete release budget.

Obtain short-lived read-only access through secure settings, or private exports. Do not paste credentials in chat. Needed evidence:

| Evidence | Required scope and purpose |
|---|---|
| Billing | July–September 2026 monthly service totals; September daily changes; service/usage-type/unit/region and relevant linked account breakdown; current month separately with estimated/final status |
| Attribution | Resource IDs, activated cost tags and other workloads; allocation for shared resources; distinguish AWS account bill from Bolt cost and include external frontend hosting |
| Inventory | EC2/EBS/public IPv4, RDS/backups/snapshots, cache/replication, S3/ECR, load balancing/NAT/CDN/DNS/monitoring across relevant regions; identify live deployed revision |
| Configuration | CPU-credit mode, architecture, storage/performance, security groups including DB/cache, IAM roles, encryption/auth, backups/deletion protection, actual retention/lifecycle and failover settings; never retrieve secret values |
| Utilization | Event-shaped high-resolution EC2/RDS/Redis metrics; app RSS/swap/latency/error/queue metrics; DB connections/locks/I/O/credits; cache evictions and broker queues; dates/units/statistics preserved |
| Reliability | Backup age and a private restore/PITR rehearsal; measured recovery; deployment rollback and host/cache/worker failure behavior |

The supplied `collect_aws.py` and `aws-readonly-policy.json` are drafts, not verified production audit tooling. Correct/validate these gaps before treating output as complete:

1. Name-prefix filters and one region miss renamed, untagged and other-region resources. CloudFront is global despite the output label. Review pagination, including its one-page CloudFront call and S3 listing behavior.
2. Elastic-IP enumeration misses automatically assigned public IPv4; EC2 selected fields omit public-IP address. DB/cache security groups are listed but only app-instance groups have detailed rules collected. IAM policies, DNS, logs and several billing/configuration categories are not covered.
3. Every metric currently requests Average/Maximum hourly. Counters/charges/bytes need appropriate **Sum** statistics and units; gauges may need Minimum as well as Average/Maximum. Summing hourly averages does not produce total bytes or CPU-credit charges. Convert summed bytes to rate using interval duration when needed. Hourly data cannot establish request p95/p99 or second-scale bursts.
4. Missing CloudWatch data is not zero utilization. EC2 memory requires guest instrumentation; the collector lists agent metric names but does not retrieve their values. Cache metrics assume node `0001` and need full live topology coverage.
5. Empty/absent optional lifecycle settings differ from AccessDenied or failed collection. Flag partial completeness explicitly; the collector can exit zero with operation errors. Do not certify a complete audit from its exit code.
6. Cost Explorer totals remain account-wide unless filtered, and even Mumbai costs are not necessarily Bolt-only. UsageQuantity grouped only by service combines units and must not be summed as one usage number. Check availability/history and permissions for resource-level allocation.

`aws-access-check.json` records the credential prerequisite failure. No resource, metric or billing operation ran successfully. The draft collector's syntax/CLI checks do not validate IAM coverage or AWS response handling. Authenticated access and network reachability are separate prerequisites.

Cost comparison should include EC2 hours/EBS, RDS hours/storage/backup excess, cache node-hours, IPv4, S3/ECR, requests/transfer, monitoring and any observed or proposed ALB/NAT/CDN/DNS/WAF. Include non-AWS hosting separately. Use current verified regional rates and like-for-like currency/tax assumptions. Keep unblended versus amortized totals distinct; show credits/free tier/discounts separately and avoid double counting. A 730-hour month is a comparison assumption, not actual calendar usage.

`cost-inputs.csv` is an unfinished input worksheet; it does not contain verified prices or a completed savings calculation. Compare **baseline**, **tuned measured deployment**, and **availability-focused deployment**, reporting monthly run rate, event incremental cost, load results and failure tolerance for each.

Potential savings remain conditional: optimize write/roster queries; retain necessary rollback images with ECR lifecycle; set justified log/version/multipart retention; remove confirmed unused resources; examine IPv4/NAT/credit charges; right-size measured idle capacity. Do not remove backups, combine durable DB/cache onto the app host, shut down event services or buy commitments on the strength of this assessment. RDS gp3 and non-burstable compute are comparison candidates after regional pricing/support and workload measurements.

## 9. Capacity model and acceptance experiment

The following is **D: illustrative**, not user-approved load or observed capacity: 30 questions, one answer every five seconds, and start/finish spread across five seconds. For immediate single-answer persistence:

| Concurrent participants | Sustained answer writes/s | Starts/s within five seconds | Answers in one 30-question round |
|---:|---:|---:|---:|
| 100 | 20 | 20 | 3,000 |
| 150 | 30 | 30 | 4,500 |
| 500 | 100 | 100 | 15,000 |
| 1,000 | 200 | 200 | 30,000 |

Use `participants ÷ answer interval` for sustained answers, `participants ÷ burst window` for start/finalize requests, and add measured login, fetch, refresh, report and organizer traffic. Two-second answers multiply the answer rate by 2.5. A five-second individual standings poll would add 200 reads/s for 1,000 users if such a feature is chosen. Cached shared standings or less frequent polling should be evaluated before choosing push infrastructure; a server-derived countdown alone does not require WebSockets.

Buffered practice is a **different scenario**: 150 participants each sending one 30-answer batch over five seconds imply 30 batch requests/s. Applying D05's query count gives 14,100 offered SQL statements over that window, or 2,820/s; 1,000 batches imply 94,000 offered statements. These are arithmetic extrapolations of one local query count, not successful throughput or cost. Do not add both full immediate-write and full end-batch models unless the implemented flow genuinely does both.

Proposed staging gates, pending Product/CTO agreement:

- Zero loss or duplication of accepted submissions; acknowledged results reconcile to durable question/attempt records and approved scoring rules. Repeated finalization leaves score/XP stable.
- No accepted out-of-policy late answer; deadline behavior deterministic under jitter/reconnect. Publication/dispute handling follows approved rules.
- Answer acknowledgement p95 ≤300 ms and p99 ≤1 s; finalization p95 ≤1 s; server-error rate <0.1%. These are proposals, not guarantees. Separately report auth latency, expected rejection codes and any unexpected 429s.
- Run 150 participants, then a proposed 300-participant headroom case, with real hashing/JWTs/throttles, synchronized boundaries, retries and full event duration plus agreed soak. Test 500/1,000 as future growth cases after passing the initial gate.
- Capture client and server timings, achieved throughput, queueing, CPU/RSS/swap/credits, DB memory/connections/locks/I/O and cache behavior. Report configuration, dataset size, network conditions and bottleneck; do not hide failed requests in successful-response percentiles.
- Test backup restoration and agreed failure scenarios separately. A successful throughput run does not prove node-loss availability or recoverability.

Instance sizing, worker/thread counts, bounded connections/pooling and extra nodes follow these results. More workers can increase memory and DB connections; PBKDF2 login cost is not represented by MD5 probes. Multi-AZ/failover is an availability choice, not a throughput benchmark result. No instance class is approved here.

## 10. Execution order and final review

| Gate | Deliverable | Exit criterion / dependencies |
|---|---|---|
| G0: requirements and identity | Canonical source/live URLs/deployed revision; event rule sheet; budget, service and recovery targets | Product + CTO decisions recorded; external auto-deploy behavior identified; allows a concrete test manifest |
| G1: correctness and boundaries | F01–F06, persistence/eligibility contracts, required event flow and content policy | Database and browser failure tests establish approved scoring, deadlines and durable acknowledgements |
| G2: releasable artifact | F07–F12 plus privacy requirements applicable to release; clean CI, image/health/bootstrap, immutable artifacts | Clean staging release with no secret inclusion, real auth/throttles and reviewed data handling; no AWS production deployment |
| G3: evidence and tuning | F13–F19 investigations, private AWS inventory/costs, production-like load and restore run | Metrics, reconciled results, recovery evidence and complete cost comparison; unresolved risks explicit |
| G4: launch decision | Named owners, event runbook, monitoring, participant rehearsal and rollback plan | Product, engineering, QA and operations sign-offs against agreed targets; production action separately authorized |

Some work proceeds in parallel: source/role decisions, AWS read-only evidence collection and existing defect fixes need not wait for every event rule. Final scoring/deadline acceptance depends on those rules; capacity approval depends on corrected write paths and realistic load. No calendar or effort estimate is justified until owners and scope are confirmed.

Final consolidated review:

- **Architecture:** Django/PostgreSQL/Redis/static SPA is a reasonable base to evaluate; no rewrite recommendation is supported.
- **Product:** simultaneous timed participation is confirmed; event rules and recovery promises are not. Existing practice must not be presented as proven tournament support.
- **Engineering:** local evidence demonstrates incorrect scoring, deadline/access weaknesses, persistence ambiguity, deletion/login failures and query amplification. Deployment/artifact gaps have source backing; live exposure and runtime health remain unverified.
- **QA:** these diagnostics establish what to fix and test. They do not establish release readiness or concurrency limits.
- **Finance/operations:** current bill, utilization, project attribution and recovery capability are unavailable. Cost optimization proposals remain conditional until section 8 is complete.
- **Forward decision:** proceed with the requirements sheet, assigned backlog and read-only evidence collection. Do not approve tournament readiness, capacity or a savings number from the present evidence.

### Questions that remain for the next working session

1. Which frontend repo/branch and URLs are deployed, and what deploys automatically from GitHub?
2. How long are the event and rounds; shared questions or individualized; what attempts, skips, deadline/grace, tie-break and publication rules apply?
3. What happens after disconnect/reload, and what interruption/recovery is acceptable during a round?
4. What monthly/event budget, latency goal and uptime/recovery targets should the comparison satisfy?
5. Who owns organizer approval, class/event eligibility, admin permissions, consent and data retention?
6. Can secure read-only AWS access or private billing/inventory/metric exports be provided?

### Reproduce this assessment's local diagnostics

In the original prepared audit workspace, with local PostgreSQL/Redis running (the paths, `dev.env` and probe files below are not included in this repository publication):

```bash
source /workspace/.setup/dev.env
PYTHONPATH=/workspace/Bolt-V1/backend \
DJANGO_SETTINGS_MODULE=config.settings.test \
/workspace/Bolt-V1/backend/.venv/bin/pytest \
  -c /workspace/Bolt-V1/backend/pyproject.toml -o addopts= \
  /workspace/audit/bolt-review/test_diagnostics.py \
  /workspace/audit/bolt-review/test_second_pass.py -q -s
```

This uses a disposable local test database. Test names assert observed defects; replace these diagnostic expectations with corrected acceptance tests in implementation PRs. Keep fixture/error logs and any future AWS exports private. No credentials, production user data or deployment instructions are required for these probes.
