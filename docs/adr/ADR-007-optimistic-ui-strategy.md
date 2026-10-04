# ADR-007: Optimistic UI Strategy and Conflict Rollback

## Status
Accepted

## Context
In a fast-paced sales environment, drag-and-drop Kanban pipeline movements and task completions must feel immediate and responsive. Waiting for round-trip server mutations introduces noticeable lag and harms user experience. However, mutations can fail due to network interruptions, unauthorized operations, or concurrent modifications by other sales team members.

## Decision
We implemented an **Optimistic UI with Automatic Rollback and Version-Based Concurrency Detection**:
1. **Optimistic State Transition**:
   - When a user drags a deal to a new stage in the Kanban board, the UI immediately updates local component state, moving the card to the target column and recalculating stage total values.
2. **Asynchronous Server Mutation**:
   - The client dispatches a Server Action (`moveDealStageAction`) including `deal_id`, `targetStageId`, and the deal's last known `updated_at` version timestamp.
3. **Rollback on Failure**:
   - If the server action returns an error (e.g. 403 Forbidden or network disconnect), the client restores the previous snapshot state and displays a descriptive toast notification.
4. **Optimistic Concurrency Conflict (HTTP 409)**:
   - If the database detects that `updated_at` changed since the client fetched the deal (modified concurrently by another rep), the server rejects the stale update with `ConflictError`.
   - The client notifies the user of the concurrent edit, rolls back the optimistic move, and refreshes the current board state from the server.

## Alternatives Considered
- **Pessimistic UI (Loading Spinners on Drag)**: UI feels sluggish and blocks user workflow.
- **Silent Optimistic UI without Rollback**: Leaves the user in an inconsistent state when mutations fail.

## Consequences
- **Positive**: Fluid 60fps interaction feel for sales reps, immediate monetary recalculation, safe recovery from race conditions.
- **Trade-offs**: Client components must maintain previous state snapshots to enable rollback.
