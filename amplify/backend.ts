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