import { type ClientSchema, a, defineData, defineFunction } from '@aws-amplify/backend';

/**
 * Digital Art House Schema using Amplify Gen2 with AppSync and DynamoDB.
 * This schema includes User, Course, Lesson, Application, InstructorAvailability, Booking, and Transaction models.
 */


// define the getInstructors function
export const getInstructors = defineFunction({
  entry: '../functions/get-instructors/handler.ts',
  name: 'getInstructors',
})
// define the getUsers function
export const getUsers = defineFunction({
  entry: '../functions/get-users/handler.ts', // Update the entry point to the getUsers handler file
  name: 'getUsers', // Update the function name to getUsers
});

// Define the getStudents function
export const getStudents = defineFunction({
  entry: '../functions/get-students/handler.ts', // Update the entry point to the getStudents handler file
  name: 'getStudents', // Update the function name to getStudents
});

// Define the recordBooking function
export const recordBooking = defineFunction({
  entry: '../functions/record-booking/handler.ts', // Update the entry point to the recordBooking handler file
  name: 'recordBooking', // Update the function name to recordBooking
});

const schema = a.schema({
  // Define the getInstructors custom type and query
  getInstructorsResponse: a.customType({
    instructors: a.string(),
    executionDuration: a.float()
  }),

  Instructors: a
    .query()
    //.arguments({ content: a.string() })
    .returns(a.ref('getInstructorsResponse'))
    .authorization(allow => [allow.authenticated()])
    // 3. set the function has the handler
    .handler(a.handler.function(getInstructors)),

  // Define the getUsers custom type and query
  getUsersResponse: a.customType({ // Updated custom type name
    users: a.string(), // Updated field name to 'users' to match handler return
    executionDuration: a.float()
  }),

  Users: a // Updated query name to 'Users'
    .query()
    //.arguments({ content: a.string() }) // Keep or remove arguments as needed
    .returns(a.ref('getUsersResponse')) // Updated to use getUsersResponse
    .authorization(allow => [allow.authenticated()])
    // 3. set the function has the handler
    .handler(a.handler.function(getUsers)), // Updated to use getUsers function

  // Define the getStudentsResponse custom type
  getStudentsResponse: a.customType({
    users: a.string(), // JSON-encoded list of user details
    executionDuration: a.float(), // Execution duration in milliseconds
  }),

  // Define the Students query
  Students: a
    .query()
    .returns(a.ref('getStudentsResponse')) // Use the getStudentsResponse custom type
    .authorization(allow => [allow.authenticated()]) // Restrict access to authenticated users
    .handler(a.handler.function(getStudents)), // Set the getStudents function as the handler

  // Define the recordBookingResponse custom type
  recordBookingResponse: a.customType({
    recordStatus: a.string(), // JSON-encoded record status
    executionDuration: a.float(), // Execution duration in milliseconds
  }),

  // Define the Students query
  RecordBooking: a
  .query()
  .arguments({
    studentId: a.string().required(),
    lessonId: a.string().required(),
    oldInstructorAvailabilityId: a.string().required(),
    // newInstructorAvailabilityId is now optional so that skip operations can ignore it
    newInstructorAvailabilityId: a.string(),
    // New argument to determine the action: "schedule" or "skip"
    action: a.string().required()
  })
  .returns(a.ref('recordBookingResponse'))
  .authorization(allow => [allow.authenticated()])
  .handler(a.handler.function(recordBooking)),

  // User model representing users in the system
  User: a
    .model({
      id: a.id().required(), // Unique identifier (Cognito sub)
      pocketBalance: a.float().default(0), // User's available balance
      role: a.string().default('Student'),
      courses: a.hasMany('Course', 'instructorId'), // Courses taught by the user
      applications: a.hasMany('Application', 'studentId'), // Applications made by the user
      instructorAvailabilities: a.hasMany('InstructorAvailability', 'instructorId'), // Availability slots of the instructor
      bookings: a.hasMany('Booking', 'studentId'), // Bookings made by the user
      transactions: a.hasMany('Transaction', 'userId'), // Financial transactions related to the user
    })
    .authorization((allow) => [
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']), // Admins can manage users
      allow.ownerDefinedIn('id').to(['read']), // Users can read their own data
    ]),

  // Course model defining available courses
  Course: a
    .model({
      title: a.string().required(), // Course title
      description: a.string(), // Course description
      cost: a.float().required(), // Course cost
      duration: a.integer().required(), // Total number of sessions
      icon: a.string(), // Optional course icon
      available: a.boolean().default(true), // Availability status
      instructorId: a.id(), // Foreign key to User (instructor)
      instructor: a.belongsTo('User', 'instructorId'), // Instructor relationship
      applications: a.hasMany('Application', 'courseId'), // Applications for this course
      lessons: a.hasMany('Lesson', 'courseId'), // Lessons within the course
    })
    .authorization((allow) => [
      allow.groups(['Admin']).to(['create', 'update', 'delete']), // Admins can manage courses
      allow.authenticated().to(['read']), // Authenticated users can read courses
      allow.owner().to(['read']), // Instructors can read their courses
    ]),

  // Lesson model representing individual lessons
  Lesson: a
    .model({
      title: a.string().required(), // Lesson title
      description: a.string(), // Lesson description
      icon: a.string(), // Optional lesson icon
      order: a.integer().required(), // Order within the course
      duration: a.integer().default(60).required(), // Duration in minutes
      courseId: a.id().required(), // Foreign key to Course
      course: a.belongsTo('Course', 'courseId'), // Course relationship
      bookings: a.hasMany('Booking', 'lessonId'), // Bookings for this lesson
    })
    .authorization((allow) => [
      allow.groups(['Admin']).to(['create', 'update', 'delete']), // Admins can manage lessons
      allow.owner().to(['create', 'read', 'update', 'delete']), // Instructors can manage their lessons
      allow.authenticated().to(['read']), // Authenticated users can read lessons
    ]),

  // Application model managing course applications
  Application: a
    .model({
      studentId: a.id().required(), // Foreign key to User (student)
      student: a.belongsTo('User', 'studentId'), // Student relationship
      courseId: a.id().required(), // Foreign key to Course
      course: a.belongsTo('Course', 'courseId'), // Course relationship
      status: a.string().required(), // Application status ("applied", "paid")
      progressPercentage: a.float().default(0), // Course progress
      completedLessons: a.string().array(), // Completed lessons
      numberOfReschedules: a.integer().default(0), // Total reschedules for the course
      transaction: a.hasMany('Transaction', 'relatedApplicationId') // Financial transactions related to the application
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('studentId').to(['create', 'read', 'update']), // Students can manage their applications
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']), // Admins can manage applications
    ]),

  // InstructorAvailability model defining availability slots
  InstructorAvailability: a
    .model({
      instructorId: a.id().required(), // Foreign key to User (instructor)
      instructor: a.belongsTo('User', 'instructorId'), // Instructor relationship
      date: a.date().required(), // Availability date
      timeStart: a.datetime().required(), // Start date and time
      timeEnd: a.datetime().required(), // End date and time
      isBooked: a.boolean().default(false), // Booking status
      description: a.string(), // Optional description
      booking: a.hasOne('Booking', 'availabilityId'), // Associated booking
    })
    .authorization((allow) => [
      allow.groups(['Admin']).to(['create', 'update', 'delete']), // Admins can manage availability
      allow.owner().to(['create', 'read', 'update', 'delete']), // Instructors can manage their availability
      allow.authenticated().to(['read']), // Authenticated users can read availability
    ]),

  // Booking model representing session bookings
  Booking: a
    .model({
      availabilityId: a.id().required(), // Foreign key to InstructorAvailability
      availability: a.belongsTo('InstructorAvailability', 'availabilityId'), // Availability relationship
      studentId: a.id().required(), // Foreign key to User (student)
      student: a.belongsTo('User', 'studentId'), // Student relationship
      lessonId: a.id(), // Foreign key to Lesson
      lesson: a.belongsTo('Lesson', 'lessonId'), // Lesson relationship
      status: a.string().default('scheduled'), // Booking status
      numberOfReschedules: a.integer().default(0), // Number of reschedules for this booking
    })
    .authorization((allow) => [
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']), // Admins can manage bookings
      allow.ownerDefinedIn('studentId').to(['create', 'read', 'update']), // Students can manage their bookings
    ]),

  // Transaction model for financial records
  Transaction: a
    .model({
      userId: a.id().required(), // Foreign key to User
      user: a.belongsTo('User', 'userId'), // User relationship
      amount: a.float().required(), // Transaction amount
      transactionType: a.string().required(), // Type: "payment", "refund", "deduction"
      date: a.datetime().required(), // Transaction date and time
      description: a.string(), // Optional description
      relatedApplicationId: a.id(), // Optional foreign key to Application
      application: a.belongsTo('Application', 'relatedApplicationId'), // Application relationship
    })
    .authorization((allow) => [
      allow.groups(['Admin']).to(['create', 'read', 'update', 'delete']), // Admins can manage transactions
      allow.ownerDefinedIn('userId').to(['read']), // Users can read their own transactions
    ]),
});

// Export schema for Amplify resource configuration
export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
