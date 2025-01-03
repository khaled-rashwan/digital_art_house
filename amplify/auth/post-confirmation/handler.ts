import {
    DynamoDBClient,
    PutItemCommand,
  } from "@aws-sdk/client-dynamodb";
  import type { PostConfirmationTriggerHandler } from "aws-lambda";
  import { LambdaClient, GetFunctionCommand } from "@aws-sdk/client-lambda";
  import {
    AppSyncClient,
    ListGraphqlApisCommand,
  } from "@aws-sdk/client-appsync";
  
  const dynamoDbClient = new DynamoDBClient({});
  const lambdaClient = new LambdaClient({});
  const appsyncClient = new AppSyncClient({});
  
  export const handler: PostConfirmationTriggerHandler = async (event, context) => {
    try {
      // Step 1: Get the current Lambda function's tags
      const lambdaParams = { FunctionName: context.functionName };
      const lambdaCommand = new GetFunctionCommand(lambdaParams);
      const lambdaResponse = await lambdaClient.send(lambdaCommand);
  
      const tags = lambdaResponse.Tags;
      if (!tags) {
        console.error("No tags found on the Lambda function");
        return event;
      }
  
      const deploymentType = tags["amplify:deployment-type"];
      if (!deploymentType) {
        console.error("Deployment type not found in Lambda tags");
        return event;
      }
  
      let graphqlApi;
      if (deploymentType === "sandbox") {
        // Handle sandbox environment using aws:cloudformation:stack-id
        const fullStackId = tags["aws:cloudformation:stack-id"];
        if (!fullStackId) {
          console.error("Full stack ID not found in Lambda tags for sandbox");
          return event;
        }
        console.log(`Full Stack ID: ${fullStackId}`);
  
        // Extract the base stack ID (before "function")
        const baseStackId = fullStackId.split("-function")[0];
        console.log(`Base Stack ID: ${baseStackId}`);
  
        // Find the AppSync API associated with this base stack ID
        const listApisCommand = new ListGraphqlApisCommand({});
        const listApisResponse = await appsyncClient.send(listApisCommand);
  
        graphqlApi = listApisResponse.graphqlApis?.find(
          (api) => api.tags && api.tags["aws:cloudformation:stack-id"]?.startsWith(baseStackId)
        );
  
        if (!graphqlApi) {
          console.error("No AppSync API found for the given base stack ID in sandbox");
          return event;
        }
      } else if (deploymentType === "branch") {
        // Handle branch environment using amplify:branch-name
        const branchName = tags["amplify:branch-name"];
        if (!branchName) {
          console.error("Branch name not found in Lambda tags for branch");
          return event;
        }
        console.log(`Branch Name: ${branchName}`);
  
        // Find the AppSync API associated with this branch name
        const listApisCommand = new ListGraphqlApisCommand({});
        const listApisResponse = await appsyncClient.send(listApisCommand);
  
        graphqlApi = listApisResponse.graphqlApis?.find(
          (api) => api.tags && api.tags["amplify:branch-name"] === branchName
        );
  
        if (!graphqlApi) {
          console.error("No AppSync API found for the given branch name");
          return event;
        }
      } else {
        console.error(`Unsupported deployment type: ${deploymentType}`);
        return event;
      }
  
      const apiId = graphqlApi.apiId;
      console.log(`AppSync API ID: ${apiId}`);
  
      // Step 2: Construct the DynamoDB table name
      const tableName = `User-${apiId}-NONE`;
  
      // Step 3: Insert a record into the DynamoDB table
      const timestamp = new Date().toISOString(); // Generate ISO 8601 timestamp

      // Construct the owner field using Cognito user attributes
      const userSub = event.request.userAttributes.sub; // Cognito sub
      const username = event.userName
      const owner = `${userSub}::${username}`; // Owner format

      const putItemParams = {
        TableName: tableName,
        Item: {
          pocketBalance: { N: "0" },
          id: { S: userSub }, // Unique identifier (Cognito sub)
          createdAt: { S: timestamp }, // Creation timestamp
          updatedAt: { S: timestamp }, // Last updated timestamp
          owner: { S: owner }, // Constructed owner field
          __typename: { S: "User" }, // Typename for GraphQL compatibility
          role: { S: "Student"}
        },
      };
  
      await dynamoDbClient.send(new PutItemCommand(putItemParams));
      console.log(`Record inserted into table: ${tableName}`);
  
      return event;
    } catch (error) {
      console.error("Error in Lambda function:", error);
      throw error;
    }
  };
  