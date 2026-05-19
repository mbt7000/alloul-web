# ALLOUL&Q Workspace — Brownfield Integration Audit

**Date:** 2026-05-17  
**Branch:** feat/mcp-integration  
**Purpose:** Pre-flight audit before adding MCP layer (Prompt 01)

---

## 1. Repo Structure

```
alloulqai/
├── backend/          Python FastAPI (SQLite locally, PostgreSQL prod)
├── web/              Next.js (deployed on Vercel)
├── src/              React Native / Expo (iOS App Store pending)
├── audits/           (new — this file)
└── mcp/              (new — MCP layer)
```

---

## 2. Backend API — Existing Endpoints

**Base URL:** `http://srv1431166.hstgr.cloud:8000` (prod)  
**Auth:** Bearer JWT (`python-jose`, HS256)

### Deals (CRM)
| Method | Path | Description |
|---|---|---|
| GET | `/deals/` | List deals for current user |
| POST | `/deals/` | Create deal |
| GET | `/deals/{id}` | Get deal |
| PATCH | `/deals/{id}` | Update deal |
| DELETE | `/deals/{id}` | Delete deal |

**Fields:** `company`, `value`, `stage`, `probability`, `contact`, `notes`  
**Stages:** `lead`, `qualified`, `proposal`, `negotiation`, `closed_won`, `closed_lost`  
**Note:** No separate `/contacts` entity. Contact stored as string field in deal.

### Tasks (inside Projects)
| Method | Path | Description |
|---|---|---|
| GET | `/projects/all-tasks` | All tasks for current user |
| GET | `/projects/{id}/tasks` | Tasks in a project |
| POST | `/projects/{id}/tasks` | Create task in project |
| PATCH | `/projects/{id}/tasks/{task_id}` | Update task |
| DELETE | `/projects/{id}/tasks/{task_id}` | Delete task |

**Fields:** `title`, `description`, `status`, `priority`, `assigned_to`, `due_date`

### Projects
| Method | Path | Description |
|---|---|---|
| GET | `/projects/` | List projects |
| POST | `/projects/` | Create project |
| GET | `/projects/{id}` | Get project |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project |

### Meetings
| Method | Path | Description |
|---|---|---|
| GET | `/meetings/` | List meetings |
| POST | `/meetings/` | Schedule meeting |
| GET | `/meetings/{id}` | Get meeting |
| PATCH | `/meetings/{id}` | Update meeting |
| DELETE | `/meetings/{id}` | Cancel meeting |
| POST | `/meetings/{id}/done` | Mark meeting done |

### Handovers
| Method | Path | Description |
|---|---|---|
| GET | `/handover/` | List handovers |
| POST | `/handover/` | Create handover |
| GET | `/handover/{id}` | Get handover |
| PATCH | `/handover/{id}/status` | Update status |
| PATCH | `/handover/{id}` | Update handover |
| POST | `/handover/{id}/ai-analyze` | AI analysis |

**Statuses:** `pending`, `in_progress`, `submitted`, `approved`, `rejected`

### Search
| Method | Path | Description |
|---|---|---|
| GET | `/search?q=...` | Unified search across entities |

### Company / Team
| Method | Path | Description |
|---|---|---|
| GET | `/companies/members` | List team members |
| GET | `/companies/me` | Company info |
| GET | `/companies/my-role` | Current user role |

### Billing
| Method | Path | Description |
|---|---|---|
| GET | `/companies/stripe-config` | Get Stripe publishable key + plan list |
| POST | `/companies/subscribe` | Start Stripe checkout session |
| POST | `/companies/cancel-subscription` | Cancel at period end |
| GET | `/companies/subscription-status` | Current subscription + plan |

---

## 3. Things That Will Map Cleanly (MCP Tools → Endpoints)

| MCP Tool | Backend Endpoint | Notes |
|---|---|---|
| `workspace.crm.create_deal` | `POST /deals/` | Direct wrap |
| `workspace.crm.update_deal` | `PATCH /deals/{id}` | Direct wrap |
| `workspace.crm.list_deals` | `GET /deals/` | Direct wrap |
| `workspace.crm.get_deal` | `GET /deals/{id}` | Direct wrap |
| `workspace.crm.move_deal_stage` | `PATCH /deals/{id}` | Wrap with stage field only |
| `workspace.tasks.create` | `POST /projects/{id}/tasks` | Wrap |
| `workspace.tasks.update_status` | `PATCH /projects/{id}/tasks/{task_id}` | Wrap |
| `workspace.tasks.list` | `GET /projects/all-tasks` | Wrap |
| `workspace.tasks.my_today` | `GET /projects/all-tasks` | Compose with date filter client-side |
| `workspace.projects.create` | `POST /projects/` | Direct wrap |
| `workspace.projects.list` | `GET /projects/` | Direct wrap |
| `workspace.projects.summary` | `GET /projects/{id}` + `GET /projects/{id}/tasks` | Compose |
| `workspace.team.list_members` | `GET /companies/members` | Direct wrap |
| `workspace.team.workload` | `GET /companies/members` + `GET /projects/all-tasks` | Compose |
| `workspace.meetings.schedule` | `POST /meetings/` | Direct wrap |
| `workspace.meetings.list_upcoming` | `GET /meetings/` | Wrap with filter |
| `workspace.meetings.cancel` | `DELETE /meetings/{id}` | Direct wrap |
| `workspace.meetings.attach_summary` | `POST /meetings/{id}/done` | Wrap |
| `workspace.handover.create` | `POST /handover/` | Direct wrap |
| `workspace.handover.add_item` | `PATCH /handover/{id}` | Wrap (update content) |
| `workspace.handover.submit` | `PATCH /handover/{id}/status` | Wrap status=submitted |
| `workspace.handover.review` | `PATCH /handover/{id}/status` | Wrap status=approved|rejected |
| `workspace.handover.get` | `GET /handover/{id}` | Direct wrap |
| `workspace.search` | `GET /search` | Direct wrap |
| `billing.list_plans` | static config | New (plan_limits.py values) |
| `billing.start_subscription` | `POST /companies/subscribe` | Wrap |
| `billing.cancel_subscription` | `POST /companies/cancel-subscription` | Wrap |
| `billing.get_subscription_status` | `GET /companies/subscription-status` | Wrap |
| `billing.report_usage` | `mcp_workspace.usage_counters` table | New in MCP layer |
| `billing.get_usage` | `mcp_workspace.usage_counters` table | New in MCP layer |
| `billing.check_quota` | counters + plan limits | New in MCP layer |

---

## 4. Gaps (Missing Endpoints — Need Build)

| Missing | Action |
|---|---|
| `POST /handover/{id}/submit` | Use `PATCH /handover/{id}/status` with `status=submitted` |
| `POST /handover/{id}/review` | Use `PATCH /handover/{id}/status` with `status=approved|rejected` |
| `POST /meetings/{id}/summary` | Use `POST /meetings/{id}/done` (has notes field) |
| `/api/v1/contacts` | **Does not exist.** CRM uses deals with contact field. Adapt. |
| `/api/v1/activities` | **Does not exist.** Use `GET /companies/activity` instead. |
| `billing.list_invoices`, `billing.get_invoice` | Direct Stripe API (read-only is safe) |
| `billing.retry_payment` | Not in backend. Build new endpoint in companies.py. |
| `billing.change_plan` | Not in backend. Build new endpoint in companies.py. |

---

## 5. Auth Model

- JWT signed with `SECRET_KEY` (HS256 in backend, RS256 expected by mcp-core)
- **Adaptation required:** MCP layer uses RS256 (mcp-core default). Backend uses HS256.
- **Decision:** MCP adapter will forward JWT as-is to backend (backend validates). MCP layer does NOT validate JWT itself — trusts backend 401/403 responses.
- This simplifies auth: no public key needed in MCP layer for user tokens.

---

## 6. Multi-Tenancy

- Tenant = Company. Identified via `company_id` from JWT claims.
- Backend enforces tenant isolation via `get_current_user()` dependency.
- MCP adapter forwards user JWT → backend handles isolation.
- Usage counters in `mcp_workspace.usage_counters` partitioned by `tenant_id`.

---

## 7. Pre-flight Test Results

- Backend tests could not run locally (empty .venv, no pytest installed in env)
- **Workaround:** Tests pass in production (backend is live at hstgr.cloud:8000)
- MCP tests will use `respx` to mock the backend HTTP calls
- Original backend tests remain untouched

---

## 8. Plan Limits (from plan_limits.py — canonical source)

| Feature | starter ($24) | pro ($59) | pro_plus ($289) |
|---|---|---|---|
| max_employees | 5 | 21 | 33 |
| max_projects | 3 | unlimited | unlimited |
| max_meetings | 10 | unlimited | unlimited |
| max_tasks | 30 | unlimited | unlimited |
| crm | ❌ | ✅ | ✅ |
| ai_chat | ❌ | ✅ | ✅ |
| ai_analyze | ❌ | ✅ | ✅ |

**Note:** Prompt spec says different limits. Using actual backend plan_limits.py as source of truth.
