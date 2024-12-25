
# Digital Art House - DynamoDB Schema

This document outlines the DynamoDB schema for the "Digital Art House" platform. The platform facilitates online art courses, including user applications, session management, and payment tracking.

## Tables

### 1. Courses
- **Purpose**: Store course details, including title, description, schedule, and other metadata.
- **Partition Key**: `PK` (Course ID, `COURSE#<CourseID>`)
- **Sort Key**: `SK` (constant `DETAILS` for main course details)

| **PK**            | **SK**       | **Attribute**     | **Description**                           |
|--------------------|--------------|-------------------|-------------------------------------------|
| COURSE#<CourseID>  | DETAILS      | `Title`           | Title of the course                       |
|                    |              | `Description`     | Brief description of the course           |
|                    |              | `Cost`            | Cost for the course                       |
|                    |              | `Duration`        | Number of sessions                        |
|                    |              | `PaymentMethod`   | Payment method (offline, link, etc.)      |
|                    |              | `Schedule`        | Schedule pattern for sessions             |

---

### 2. UsersCourses
- **Purpose**: Track users' enrollment, payment status, and session management per course.
- **Partition Key**: `PK` (User ID, `USER#<UserID>`)
- **Sort Key**: `SK` (Course ID and Status, `COURSE#<CourseID>#STATUS#<Status>`)

| **PK**            | **SK**                       | **Attribute**       | **Description**                        |
|--------------------|------------------------------|---------------------|----------------------------------------|
| USER#<UserID>      | COURSE#<CourseID>#APPLIED    | `AppliedDate`       | Date of application                    |
|                    |                              | `ContactInfo`       | User contact details                   |
| USER#<UserID>      | COURSE#<CourseID>#PAID       | `PaidDate`          | Date payment was confirmed             |
|                    |                              | `Balance`           | Balance remaining (for session costs)  |
|                    |                              | `SessionsRemaining` | Remaining sessions for user            |

---

### 3. Sessions
- **Purpose**: Manage individual session details for each user, including attendance, rescheduling, and skipping.
- **Partition Key**: `PK` (Course ID, `COURSE#<CourseID>`)
- **Sort Key**: `SK` (Session ID and User ID, `SESSION#<SessionID>#USER#<UserID>`)

| **PK**            | **SK**                        | **Attribute**       | **Description**                            |
|--------------------|-------------------------------|---------------------|--------------------------------------------|
| COURSE#<CourseID>  | SESSION#<SessionID>#USER#<UserID> | `Status`         | Status of session (Scheduled, Attended, Skipped) |
|                    |                               | `SessionDate`      | Scheduled date/time                        |
|                    |                               | `Reschedulable`    | Boolean, if session can be rescheduled     |
|                    |                               | `RescheduleDate`   | Date/time if rescheduled                   |
|                    |                               | `PaymentStatus`    | Whether session is paid, unpaid, etc.      |

---

## Workflow

### 1. User Applies for a Course
- Insert a new record in `UsersCourses` with `SK` set to `COURSE#<CourseID>#APPLIED`.
- Populate `AppliedDate` and `ContactInfo`.

### 2. Admin Confirms Payment
- Update the record in `UsersCourses` by adding the `PaidDate`, setting `SK` to `COURSE#<CourseID>#PAID`, and setting the `Balance` to the initial amount required.
- Initialize `SessionsRemaining` to the total number of sessions for the course.

### 3. User Attends, Skips, or Reschedules a Session
- **Attending**: Update the session’s `Status` to `Attended`, mark `PaymentStatus` as paid, and decrement `SessionsRemaining` and `Balance` in `UsersCourses`.
- **Skipping**: Update the session’s `Status` to `Skipped` and deduct the session cost from the `Balance`.
- **Rescheduling**: Check if `Reschedulable` is `true` and that the session is more than 24 hours away. If so, update `SessionDate` and set `Reschedulable` to `false`. Rescheduled sessions do not decrement `Balance`.

### 4. User Views Course Details and Progress
- Retrieve data from `Courses` for the course details.
- Query `Sessions` by `PK` (`COURSE#<CourseID>`) and filter by `SK` containing the user’s ID to get session-specific details for the user.
- Query `UsersCourses` by user ID to track their payment status, balance, and the number of remaining sessions.
