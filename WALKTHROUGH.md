# Server Monitor Frontend Walkthrough

This guide explains the main parts of the frontend in simple steps, so someone new can learn how to move around the app and what each screen does.

## 1. Start Here

When you open the app, you will usually see one of three things:

1. A loading screen while the app restores your session.
2. The login page if you are not signed in.
3. The main console after login.

If you are signed in, the app opens in a layout with a top bar, a left menu, and a main content area.

## 2. Login Page

Use this screen to sign in with the account given to you by an administrator.

What it does:

- Lets you enter your username or email and password.
- Starts your session so you can access the dashboard and other pages.
- Sends you back to the login page if your session expires.

What to do first:

1. Enter your login details.
2. Sign in.
3. Wait for the app to load your session and permissions.

## 3. Main Layout

After login, the page is split into three main areas.

### Top Bar

The top bar shows:

- The current page title.
- A theme button to switch between light and dark mode.
- Your user menu with your name, role, and a sign-out option.
- Alert status badges when you have permission to view alerts.

What it does:

- Helps you see where you are in the app.
- Lets you change the theme.
- Lets you sign out.
- Gives a quick view of open or critical alerts.

### Left Menu

The left menu is the main way to move around the app.

It includes these sections:

- Dashboard
- Server Inventory
- Backup Status
- Alerts
- Thresholds
- Reports
- Users
- Audit Logs
- Settings

What it does:

- Takes you to each part of the console.
- Shows only the pages your role can access.
- Highlights the page you are currently on.

### Main Content Area

This is where the selected page appears.

What it does:

- Shows tables, charts, forms, and details.
- Changes when you click a menu item.
- Contains the actions you use most often.

## 4. Dashboard

The dashboard is the first place to look if you want a quick health check of the whole estate.

What you see:

- Total servers.
- Verified servers.
- Pending servers.
- Open alerts.
- Critical alerts.
- Charts showing server criticality and agent verification.
- Charts for alert type and backup/health summary.
- A list of the most recent open alerts.

What it does:

- Gives you a summary of the environment.
- Helps you spot problems quickly.
- Lets you jump to the Server Inventory or Alerts screens by clicking the cards.

What to do first:

1. Check the alert cards.
2. Look at the verification and criticality charts.
3. Open the recent alerts list if something looks urgent.

## 5. Server Inventory

This is the main screen for managing servers and groups.

What you can do here:

- Search for a server by name, hostname, or IP.
- Filter by location, department, criticality, operating system, verification state, and agent expectation.
- Open a server to see its details.
- Add a new server if you have admin access.
- Edit an existing server.
- Delete a server.
- Rotate an agent token.

What the screen shows:

- A list of registered servers.
- Status badges for verification and criticality.
- Pagination when there are many servers.

How to use it:

1. Start with search if you already know the server name.
2. Use filters to narrow the list.
3. Click a server row to open its details.
4. Use Add server only if you are allowed to manage servers.

## 6. Server Detail

When you open a server from the inventory, you go to its detail page.

What it does:

- Shows the server’s health history.
- Shows CPU, memory, and disk trends.
- Shows backup history and backup age warnings.
- Shows alerts related to that server.

What to look for:

- Whether the server is healthy or trending downward.
- Whether backups are recent.
- Whether any alerts are still open.

Use this page when you want to investigate one server in more detail.

## 7. Backup Status

This page is for checking backup freshness across the estate.

What it does:

- Shows which servers have recent backups.
- Helps you find missing or stale backups.
- Lets you review backup-related issues in one place.

Use this page when you want to answer, “Are backups still running correctly?”

## 8. Alerts

This page is the central alert inbox.

What you can do here:

- View open and historical alerts.
- Filter and page through the list.
- Acknowledge alerts.
- Resolve alerts.
- Jump to the server linked to an alert.

What it does:

- Shows active problems that need attention.
- Lets operators work through the queue.
- Keeps the alert history organized.

How to use it:

1. Start with critical alerts first.
2. Open the alert to understand the issue.
3. Acknowledge or resolve it when appropriate.
4. Jump to the affected server if you need more detail.

## 9. Thresholds

This page controls the rules that turn metrics into alerts.

What it does:

- Lets you define warning and critical thresholds.
- Supports rules for CPU, memory, disk, and backup age.
- Lets you set rules globally or per server.

Why it matters:

- Thresholds decide when the system creates alerts.
- Lower values usually mean fewer alerts.
- Higher sensitivity usually means earlier warnings.

Use this page when you need to tune alert behavior.

## 10. Reports

This page is for generating exported reports.

What you can do here:

- Generate health reports.
- Generate backup reports.
- Choose a date range.
- Choose the scope you want to report on.
- Download the report in PDF or Excel format.

Use this page when you need a shareable file for review or recordkeeping.

## 11. Users

This page is for managing accounts and roles.

What you can do here:

- View users.
- Create new user accounts if you have admin access.
- Change role assignments.
- Generate secure credentials for new users.

What to know:

- Accounts are managed by administrators.
- New users usually receive credentials through a one-time handoff.

Use this page when you are setting up or updating access for staff.

## 12. Audit Logs

This page is a read-only activity history.

What it does:

- Shows privileged actions taken in the system.
- Includes metadata about who did what and when.

Use this page when you need to review changes, investigate activity, or confirm an action.

## 13. Settings

This page contains personal and reference information.

What you can see:

- Your name, email, role, and permissions.
- Light/dark theme controls.
- A short agent onboarding reference.

What it does:

- Lets you check what your account can access.
- Lets you switch the look of the app.
- Explains how servers connect through monitoring agents.

## 14. Common Actions

These actions appear across the app.

### Refresh

Use refresh when you want the latest data loaded again.

### Search and Filters

Use search and filters to find the exact server, alert, or report you need.

### Theme Switch

Use the theme button in the top bar to switch between light and dark mode.

### Sign Out

Use the user menu in the top bar, or the sign-out button in the sidebar, to leave the app safely.

### Badges and Status Labels

Badges show things like role, alert severity, verification state, or system status.

They are there to help you read the screen quickly.

## 15. A Simple First-Time Workflow

If you are new to the frontend, follow this order:

1. Sign in.
2. Check the Dashboard for overall system health.
3. Open Alerts if you see any critical issues.
4. Go to Server Inventory to find the server you want.
5. Open the server detail page to inspect health and backups.
6. Use Reports if you need an export.
7. Check Settings to confirm your role and permissions.

## 16. When You Do Not See a Page

Some pages are hidden if your role does not allow access.

If a menu item is missing, it usually means:

- Your account does not have permission for that area.
- The backend did not grant that capability to your role.

If that happens, contact an administrator.

## 17. Quick Summary

- Dashboard = quick status overview.
- Server Inventory = manage servers and groups.
- Server Detail = inspect one server deeply.
- Backup Status = check backup freshness.
- Alerts = review and clear incidents.
- Thresholds = control alert rules.
- Reports = export data.
- Users = manage accounts.
- Audit Logs = review actions.
- Settings = see your profile, theme, and permissions.
