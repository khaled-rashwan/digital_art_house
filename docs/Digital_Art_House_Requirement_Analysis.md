
# Digital Art House - Requirement Analysis and Use Cases

## Project Overview

Digital Art House is an online platform designed to facilitate art courses over Zoom. The platform enables users to browse, apply for, and attend online art courses. Each course consists of a structured schedule of sessions, allowing users to interact with the course material, manage attendance, and reschedule or skip sessions as needed.

Payments are managed externally, with the platform tracking each user's enrollment, attendance, and session usage.

---

## Core Features

1. **User Registration & Authentication**: 
   - Handled via AWS Amplify and Cognito.
   - Users can register and log in to the platform securely.

2. **Course Management**:
   - Display a catalog of available courses.
   - Each course includes details such as title, description, cost, duration, schedule, and payment method.

3. **Application and Enrollment**:
   - Users can apply for courses and view their application status.
   - Upon payment confirmation by an admin, the user's enrollment is updated to indicate "Paid."

4. **Session Management**:
   - Each course has a fixed schedule of sessions (e.g., twice weekly for four weeks).
   - Users can attend, reschedule, or skip sessions.
   - Rescheduling is limited to once per session and must occur at least 24 hours before the session start time.
   - Missed sessions are counted as skipped and are deducted from the user's session balance.

5. **Payment Tracking**:
   - Admin updates enrollment to "Paid" upon payment confirmation.
   - Users have a balance for sessions, which is adjusted based on attendance or skips.

---

## Use Cases

### 1. User Browses Available Courses
   - **Description**: A registered or guest user visits the courses page to view all available courses.
   - **Preconditions**: Courses have been created and published on the platform.
   - **Postconditions**: User can view course details and apply for enrollment.

### 2. User Applies for a Course
   - **Description**: A registered user applies for a course.
   - **Preconditions**: User is logged in, and the course is available.
   - **Postconditions**: User's application status is set to "Applied," and they await contact for payment.

### 3. Admin Confirms Payment
   - **Description**: An admin updates the user’s course application to "Paid" after verifying external payment.
   - **Preconditions**: User has applied for the course.
   - **Postconditions**: User’s status is updated to "Paid," and they can begin attending sessions.

### 4. User Attends a Session
   - **Description**: A user attends a scheduled session for their enrolled course.
   - **Preconditions**: User has paid for the course, and the session is scheduled.
   - **Postconditions**: User’s balance is reduced by one session.

### 5. User Reschedules a Session
   - **Description**: User requests to reschedule a session to a later time.
   - **Preconditions**: The session is reschedulable, user is enrolled, and request is made at least 24 hours in advance.
   - **Postconditions**: Session date is updated, and it remains unpaid.

### 6. User Skips a Session
   - **Description**: User skips a session they are unable to attend.
   - **Preconditions**: User did not attend the session, and it was not rescheduled.
   - **Postconditions**: Session is marked as "Skipped," and the user’s balance is reduced by one session.

### 7. User Views Enrolled Courses and Progress
   - **Description**: User can view their enrolled courses and track progress, including remaining sessions and balance.
   - **Preconditions**: User is logged in and enrolled in at least one course.
   - **Postconditions**: User can view all current and past courses, session details, and remaining sessions.

---

## Technical Specifications

- **Frontend**: Uses AWS Amplify for authentication and UI hosting.
- **Backend**: Uses AWS DynamoDB for managing course, user, and session data.
- **Session Scheduling**: Built-in logic for attendance, rescheduling, and balance tracking to ensure accurate session management.
- **Notifications**: Contact details from Cognito are used for payment and application follow-ups.

This document serves as an overview for developers and stakeholders, highlighting the core functionality, use cases, and technical specifications of the Digital Art House platform.
