# Phase 14: Audit Logging

## Overview
This phase implements an audit log for all privileged actions within an organization, such as API key creation, destination updates, and replay actions.

## Components Implemented
- `AuditLogEntry` model and persistence
- Query endpoints for audit logs
- Interceptors/middlewares to automatically log privileged actions
