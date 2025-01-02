import { defineBackend, defineFunction } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import * as iam from "aws-cdk-lib/aws-iam"
import { postConfirmation } from './auth/post-confirmation/resource';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  postConfirmation
});

// Get the Lambda function resource for postConfirmation
const postConfirmationLambda = backend.postConfirmation.resources.lambda;

// Define the IAM policy statement to allow updating the "User" table in DynamoDB
const allowPutUser = new iam.PolicyStatement({
  sid: "AllowPutUser",
  actions: ["dynamodb:PutItem"],
  resources: [
    // Replace 'UserTable' with the actual ARN of your DynamoDB table
    "arn:aws:dynamodb:*:*:table/User-*",
  ],
});

const allowListTables = new iam.PolicyStatement({
  sid: "AllowListTables",
  actions: [
    "dynamodb:ListTables", // Allow ListTables (no specific resource required)
  ],
  resources: ["*"], // ListTables requires "*" as the resource
});

const lambdaGetFunction = new iam.PolicyStatement({
  sid: "lambdaGetFunction",
  actions: [
    "lambda:GetFunction", // Allow GetFunction (no specific resource required)
  ],
  resources: ["*"], // GetFunction requires "*" as the resource
});

const dynamodbListTagsOfResource = new iam.PolicyStatement({
  sid: "dynamodbListTagsOfResource",
  actions: [
    "dynamodb:ListTagsOfResource", // Allow ListTagsOfResource (no specific resource required)
  ],
  resources: ["*"], // ListTagsOfResource requires "*" as the resource
});

// New: Allow AppSync API actions
const allowAppSyncActions = new iam.PolicyStatement({
  sid: "AllowAppSyncActions",
  actions: [
    "appsync:ListGraphqlApis", // Allows listing all AppSync APIs
    "appsync:GetGraphqlApi", // Allows retrieving details for a specific AppSync API
  ],
  resources: ["*"], // Can be scoped further if you know the AppSync API ARNs
});

// Add the policy statement to the Lambda function's role
postConfirmationLambda.addToRolePolicy(allowPutUser);
postConfirmationLambda.addToRolePolicy(allowListTables);
postConfirmationLambda.addToRolePolicy(lambdaGetFunction);
postConfirmationLambda.addToRolePolicy(dynamodbListTagsOfResource);
postConfirmationLambda.addToRolePolicy(allowAppSyncActions);