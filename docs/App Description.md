# Digital Art House

A minimal React Native Expo app for managing art courses with user and admin functionalities.

## Technology Stack
- **Frontend:** React Native Expo
- **Backend:** AWS Amplify Gen2
- **Authentication:** AWS Cognito
- **Database:** DynamoDB

## User Roles
- **Users**
- **Admins**

## Features

### Users
- **Register & Login:** Secure authentication via Cognito.
- **Explore Courses:** Browse available courses and view prices.
- **Choose Courses:** Select desired courses from the catalog.
- **Schedule Sessions:** Pick available dates and times from a calendar on the course page.
- **Manage Pocket:** View available balance added by admin.

### Admins
- **Manage Users:** Add funds to user pockets.
- **Track Sessions:** Deduct session costs from user pockets after completion.
- **Add Courses:** Update and manage the list of available courses.

## Payment Processing
- Payments are handled externally and not within the app.

## Minimal Design
- Clean and straightforward user interface.
- Focused on essential functionalities for ease of use.

