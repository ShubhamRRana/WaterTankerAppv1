# Admin First-Login Walkthrough Design

## Goal

Give each new admin a one-time hybrid guided tour after their first successful login. The account's free trial is already active at this point. The tour introduces the complete admin workflow using a welcome panel followed by highlights on real screens.

The walkthrough must not start automatically again after it is completed or skipped. An admin can replay it manually from Profile at any time.

## Scope

The walkthrough covers:

1. Welcome and free-trial context
2. Bookings and trip details
3. Driver management
4. Vehicle management
5. Payments and agency QR
6. Expenses
7. Reports
8. Profile, subscription status, and walkthrough replay

The design is admin-only. Driver and customer walkthroughs, remotely authored tour content, analytics dashboards, and automatic replays for future app versions are outside this scope.

## Persistence

Add a nullable `walkthrough_seen_at timestamptz` field to the admin record.

- `null`: the walkthrough is eligible to start automatically.
- Timestamp present: it must not start automatically.
- Completing or skipping the tour writes the timestamp.
- Manual replay does not clear or update the timestamp.

Row-level security must permit an authenticated admin to read and update only their own walkthrough status. The application must not use client-editable auth metadata for this authorization decision.

## Architecture

### Walkthrough controller

A controller mounted inside the full admin navigator owns:

- Whether the walkthrough is loading, active, saving, or inactive
- The current step
- Automatic first-login launch
- Manual replay
- Next, Back, Skip, and Finish actions
- Cross-screen navigation
- Persistence of completion or skip

It starts an automatic tour only after authentication, admin data, subscription gating, and navigation are ready. Manual replay bypasses the eligibility check but uses the same steps and UI.

### Step registry

The tour steps are declarative records containing:

- Stable step identifier
- Destination route
- Target identifier
- Title and concise description
- Optional fallback target

Screens register measurable targets with stable identifiers. The controller navigates to the required route, waits for layout, then asks the overlay to measure and highlight the registered target.

### Walkthrough overlay

The custom overlay dims the current screen, leaves the target visually prominent, and presents a coachmark with progress and controls. A welcome panel appears before the first spotlight.

The overlay uses the existing theme and typography systems. It supports light and dark modes, safe areas, large text, screen-reader announcements, and Android back handling. Back moves to the previous step; dismissing requires Skip or Finish so the persistence behavior remains explicit.

### Profile replay

Profile gains a `Replay walkthrough` settings row. Selecting it starts the controller in replay mode from the welcome panel. Replay never changes first-login eligibility.

## User Flow

1. The admin logs in successfully.
2. The full admin navigator loads during the active free trial.
3. The controller reads `walkthrough_seen_at`.
4. If it is null, the welcome panel opens.
5. The admin proceeds through the actual admin screens:
   - Bookings and trip details
   - Drivers
   - Vehicles
   - Payments and QR
   - Expenses
   - Reports
   - Profile and subscription
6. Each screen highlights its main action. When a list has no records, the corresponding empty-state action is highlighted.
7. Finish or Skip persists `walkthrough_seen_at` before dismissing.
8. Future logins do not launch the tour.
9. The admin can start a non-persisting replay from Profile.

## Dynamic Behavior

The step sequence adapts to rendered state without changing the overall feature order:

- Prefer a primary action when data exists.
- Use the equivalent empty-state action when data does not exist.
- Skip a target safely if neither target is available after a bounded layout wait.
- Never highlight subscription-locked or unavailable controls.

This keeps the walkthrough useful for both empty and partially configured accounts.

## Failure Handling

- If eligibility cannot be loaded, do not start the tour based on an assumption. Keep normal app use available and retry eligibility during the session.
- If a target cannot be measured, continue to the next valid step.
- If navigation fails, keep the current coachmark visible and allow retry or skip.
- If saving Finish or Skip fails, keep the final state visible with Retry. Do not claim that the preference was saved.
- Repeated save actions must be idempotent.
- Logging out or losing the authenticated admin stops the active tour immediately.

## Accessibility

- Announce the step title, description, and progress to screen readers.
- Trap accessibility focus within the active welcome panel or coachmark.
- Give all controls explicit roles, labels, and hints.
- Support font scaling without clipping controls.
- Maintain sufficient contrast in light and dark themes.
- Do not rely on color alone to identify the highlighted element.

## Testing

### Unit tests

- Eligibility for null and populated timestamps
- Automatic mode versus replay mode
- Step progression and route selection
- Empty-state target fallback
- Missing-target skip behavior
- Idempotent completion and skip

### Component tests

- Welcome, spotlight, progress, and controls
- Theme and large-text rendering
- Screen-reader labels
- Profile replay action
- Saving and retry states

### Integration tests

- First successful admin login starts the tour
- Completion prevents later automatic launches
- Skip prevents later automatic launches
- Replay starts despite a populated timestamp
- Replay does not alter the timestamp
- Failed persistence does not dismiss as successfully saved
- Logout and subscription-gate changes stop or suppress the tour safely

## Success Criteria

- A newly created admin sees the walkthrough after their first successful login.
- Completing or skipping it prevents every later automatic launch for that admin across devices.
- Replay remains available from Profile.
- The full admin feature set is introduced through real, context-aware targets.
- Missing UI targets and network failures do not crash or trap the application.
