import { defineBackend, defineFunction } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import * as iam from "aws-cdk-lib/aws-iam"
import { postConfirmation } from './auth/post-confirmation/resource';
import { getInstructors, getUsers, getStudents, recordBooking } from '../amplify/data/resource';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  postConfirmation,
  getInstructors,
  getUsers,
  getStudents,
  recordBooking,
});

// Get the Lambda function resource for postConfirmation
const postConfirmationLambda = backend.postConfirmation.resources.lambda;

// Get the Lambda function resource for getInstructors
//const getInstructorsLambda = backend.getInstructors.resources.lambda;

// Define the policy statements for the postConfirmation Lambda function role
const policyStatements = [
  // Policy for DynamoDB PutItem
  new iam.PolicyStatement({
    sid: "AllowDynamoDBPutItem",
    actions: ["dynamodb:PutItem"],
    resources: [
      "arn:aws:dynamodb:us-east-1:503641682615:table/User-*", // Scoped to User-* tables in the us-east-1 region
    ],
  }),

  // Policy for Lambda GetFunction
  new iam.PolicyStatement({
    sid: "AllowLambdaAccess",
    actions: ["lambda:GetFunction"],
    resources: [
      "arn:aws:lambda:us-east-1:503641682615:function:amplify-*", // Scoped to Lambda functions starting with "amplify-"
    ],
  }),

  // Policy for AppSync ListGraphqlApis and GetGraphqlApi
  new iam.PolicyStatement({
    sid: "AllowAppSyncAccess",
    actions: [
      "appsync:ListGraphqlApis",
      "appsync:GetGraphqlApi",
    ],
    resources: [
      "arn:aws:appsync:us-east-1:503641682615:*", // Scoped to AppSync APIs in the us-east-1 region
    ],
  }),
];

// Attach these policies to the Lambda function role
policyStatements.forEach((statement) => postConfirmationLambda.addToRolePolicy(statement));

// Define the policy statements for the getInstructors Lambda function role
const getInstructorsPolicyStatements = [
  // Policy for listing users in the "Instructor" group across all Cognito User Pools
  new iam.PolicyStatement({
    sid: "AllowCognitoListUsers",
    actions: ["cognito-idp:ListUsers"],
    resources: ["*"], // Allows access to all user pools
  }),
  // Policy for listing users in a specific group
  new iam.PolicyStatement({
    sid: "AllowCognitoListUsersInGroup",
    actions: ["cognito-idp:ListUsersInGroup"],
    resources: ["*"], // Allows listing users in groups across all user pools
  }),
  // Policy for listing all User Pools
  new iam.PolicyStatement({
    sid: "AllowCognitoListUserPools",
    actions: ["cognito-idp:ListUserPools"],
    resources: ["*"], // Allows listing all user pools
  }),
  // Policy for describing User Pools to retrieve tags
  new iam.PolicyStatement({
    sid: "AllowCognitoDescribeUserPool",
    actions: ["cognito-idp:DescribeUserPool"],
    resources: ["*"], // Allows describing all user pools
  }),
  // Policy for retrieving Lambda function details (tags)
  new iam.PolicyStatement({
    sid: "AllowLambdaGetFunction",
    actions: ["lambda:GetFunction"],
    resources: ["*"], // Allows retrieving details of the current Lambda function
  }),
  new iam.PolicyStatement({
    sid: "AllowAppSyncAccess",
    actions: [
      "appsync:ListGraphqlApis",
      "appsync:GetGraphqlApi",
    ],
    resources: ["*"],
  }),
];

const getInstructorLambda = backend.getInstructors.resources.lambda;
// Attach these policies to the Lambda function role
getInstructorsPolicyStatements.forEach((statement) => getInstructorLambda.addToRolePolicy(statement));

// Define the policy statements for the getUsers Lambda function role
const getUsersPolicyStatements = [
  // Policy for listing users in Cognito User Pools
  new iam.PolicyStatement({
    sid: "AllowCognitoListUsers",
    actions: ["cognito-idp:ListUsers"],
    resources: ["*"], // Allows access to list users in all user pools
  }),
  // Policy for listing all User Pools
  new iam.PolicyStatement({
    sid: "AllowCognitoListUserPools",
    actions: ["cognito-idp:ListUserPools"],
    resources: ["*"], // Allows listing all user pools
  }),
  // Policy for describing User Pools to retrieve tags
  new iam.PolicyStatement({
    sid: "AllowCognitoDescribeUserPool",
    actions: ["cognito-idp:DescribeUserPool"],
    resources: ["*"], // Allows describing all user pools
  }),
  // Policy for retrieving Lambda function details (tags)
  new iam.PolicyStatement({
    sid: "AllowLambdaGetFunction",
    actions: ["lambda:GetFunction"],
    resources: ["*"], // Allows retrieving details of the current Lambda function
  }),
  // Policy for AppSync access to list and get APIs (for sandbox User Pool discovery)
  new iam.PolicyStatement({
    sid: "AllowAppSyncAccess",
    actions: [
      "appsync:ListGraphqlApis",
      "appsync:GetGraphqlApi",
    ],
    resources: ["*"], // Allows listing and getting details of all AppSync APIs
  }),
];

// Assuming you have defined your getUsers Lambda function using aws-amplify/backend and it is accessible via 'backend.getUsers'
// and that the lambda resource is accessible via 'backend.getUsers.resources.lambda'
// Adjust 'backend.getUsers.resources.lambda' to the actual path to your Lambda function resource if different
const getUsersLambda = backend.getUsers.resources.lambda;

// Attach these policies to the getUsers Lambda function role
getUsersPolicyStatements.forEach((statement) => getUsersLambda.addToRolePolicy(statement));

// Define the policy statements for the getStudents Lambda function role
const getStudentsPolicyStatements = [
  // Policy for listing users in a specific Cognito User Pool group
  new iam.PolicyStatement({
    sid: "AllowCognitoListUsersInGroup",
    actions: ["cognito-idp:ListUsersInGroup"],
    resources: ["*"], // Allows listing users in any User Pool group
  }),
  // Policy for listing all User Pools
  new iam.PolicyStatement({
    sid: "AllowCognitoListUserPools",
    actions: ["cognito-idp:ListUserPools"],
    resources: ["*"], // Allows listing all User Pools
  }),
  // Policy for describing User Pools to retrieve tags
  new iam.PolicyStatement({
    sid: "AllowCognitoDescribeUserPool",
    actions: ["cognito-idp:DescribeUserPool"],
    resources: ["*"], // Allows describing all User Pools
  }),
  // Policy for retrieving Lambda function details (tags)
  new iam.PolicyStatement({
    sid: "AllowLambdaGetFunction",
    actions: ["lambda:GetFunction"],
    resources: ["*"], // Allows retrieving details of the current Lambda function
  }),
  // Policy for AppSync access to list and get APIs (for sandbox User Pool discovery)
  new iam.PolicyStatement({
    sid: "AllowAppSyncAccess",
    actions: [
      "appsync:ListGraphqlApis",
      "appsync:GetGraphqlApi",
    ],
    resources: ["*"], // Allows listing and getting details of all AppSync APIs
  }),
];

const getStudentsLambda = backend.getStudents.resources.lambda;

// Attach these policies to the getStudents Lambda function role
getStudentsPolicyStatements.forEach((statement) => getStudentsLambda.addToRolePolicy(statement));

// Define the policy statements for the recordBooking Lambda function role
const recordBookingPolicyStatements = [
  // Policy for DynamoDB operations on Booking and InstructorAvailability tables
  new iam.PolicyStatement({
    sid: "AllowDynamoDBAccess",
    actions: [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem"
    ],
    resources: ["*"], // Allows operations on any DynamoDB table
  }),
  
  // Policy for retrieving Lambda function details (tags)
  new iam.PolicyStatement({
    sid: "AllowLambdaGetFunction",
    actions: ["lambda:GetFunction"],
    resources: ["*"], // Allows retrieving details of the current Lambda function
  }),
  
  // Policy for AppSync access to list and get APIs
  new iam.PolicyStatement({
    sid: "AllowAppSyncAccess",
    actions: [
      "appsync:ListGraphqlApis",
    ],
    resources: ["*"], // Allows listing all AppSync APIs
  }),
];

const recordBookingLambda = backend.recordBooking.resources.lambda;

// Attach these policies to the recordBooking Lambda function role
recordBookingPolicyStatements.forEach((statement) => 
  recordBookingLambda.addToRolePolicy(statement)
);