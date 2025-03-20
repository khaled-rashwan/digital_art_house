import {
    CognitoIdentityProviderClient,
    ListUserPoolsCommand,
    DescribeUserPoolCommand,
    ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { LambdaClient, GetFunctionCommand } from "@aws-sdk/client-lambda";
import { AppSyncClient, ListGraphqlApisCommand, GetGraphqlApiCommand } from "@aws-sdk/client-appsync";

// Initialize AWS clients
const lambdaClient = new LambdaClient({});
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const appsyncClient = new AppSyncClient({ region: 'us-east-1' });

/**
 * Lambda function handler for retrieving a list of users in the "Student" group from a Cognito User Pool.
 * The User Pool is determined based on tags associated with the Lambda function itself,
 * allowing for environment-specific (sandbox/branch) user management.
 *
 * @returns {Promise<{ users: string, executionDuration: number }>} - A promise that resolves to an object containing
 *          a JSON string of user details (including username, name, and email) in the "Student" group and the function execution duration.
 */
export const handler = async () => {
    const start = performance.now();
    console.log("Starting getStudents Lambda function execution");

    // Step 1: Retrieve Lambda function tags to determine deployment type and environment details
    console.log("Step 1: Retrieving Lambda function tags...");
    const lambdaParams = { FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME };
    const lambdaCommand = new GetFunctionCommand(lambdaParams);
    let lambdaResponse;
    try {
        lambdaResponse = await lambdaClient.send(lambdaCommand);
        console.log("Successfully retrieved Lambda function details.");
    } catch (error) {
        console.error("Error retrieving Lambda function details:", error);
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    }

    const tags = lambdaResponse.Tags;
    let deploymentType = "";
    let branchName = "";
    let sandboxId = "";

    if (!tags) {
        console.warn("Warning: No tags found on the Lambda function. Cannot determine deployment type.");
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    }
    console.log("Lambda function tags:", tags);

    deploymentType = tags["amplify:deployment-type"];
    if (!deploymentType) {
        console.error("Error: Deployment type tag ('amplify:deployment-type') not found in Lambda tags.");
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    }
    console.log(`Deployment type identified from tags: ${deploymentType}`);

    if (deploymentType === "sandbox") {
        console.log('Deployment type is sandbox. Extracting sandbox ID from stack name tag.');
        const stackName = tags["aws:cloudformation:stack-name"];
        if (!stackName) {
            console.error("Error: Stack name tag ('aws:cloudformation:stack-name') not found for sandbox deployment.");
            return {
                users: JSON.stringify([]),
                executionDuration: performance.now() - start,
            };
        }
        sandboxId = stackName.split("-function")[0];
        console.log(`Sandbox ID extracted from stack name: ${sandboxId}`);
    } else if (deploymentType === "branch") {
        console.log('Deployment type is branch. Extracting branch name from branch name tag.');
        branchName = tags["amplify:branch-name"];
        if (!branchName) {
            console.error("Error: Branch name tag ('amplify:branch-name') not found for branch deployment.");
            return {
                users: JSON.stringify([]),
                executionDuration: performance.now() - start,
            };
        }
        console.log(`Branch Name extracted from tags: ${branchName}`);
    } else {
        console.error(`Error: Unsupported deployment type: ${deploymentType}. Supported types are 'sandbox' and 'branch'.`);
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    }

    // Step 2: List all User Pools in the region to find the target User Pool
    console.log("Step 2: Listing all User Pools in the region...");
    const listUserPoolsCommand = new ListUserPoolsCommand({ MaxResults: 60 });
    let userPoolsResponse;
    try {
        userPoolsResponse = await cognitoClient.send(listUserPoolsCommand);
        console.log("Successfully listed User Pools.");
    } catch (error) {
        console.error("Error listing User Pools:", error);
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    }

    if (!userPoolsResponse.UserPools || userPoolsResponse.UserPools.length === 0) {
        console.warn("Warning: No User Pools found in the region.");
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    }
    console.log(`Found ${userPoolsResponse.UserPools.length} User Pools in the region.`);

    // Step 3: Filter User Pools to find the target User Pool based on deployment type and tags
    let targetUserPoolId = null;

    if (deploymentType === "sandbox") {
        console.log("Deployment type is sandbox. Finding User Pool associated with AppSync instance based on sandbox ID.");
        const listGraphqlApisCommand = new ListGraphqlApisCommand({});
        let graphqlApisResponse;
        try {
            graphqlApisResponse = await appsyncClient.send(listGraphqlApisCommand);
            console.log("Successfully listed AppSync instances.");
        } catch (error) {
            console.error("Error listing AppSync instances:", error);
            return {
                users: JSON.stringify([]),
                executionDuration: performance.now() - start,
            };
        }

        if (!graphqlApisResponse.graphqlApis || graphqlApisResponse.graphqlApis.length === 0) {
            console.warn("Warning: No AppSync instances found in the region.");
            return {
                users: JSON.stringify([]),
                executionDuration: performance.now() - start,
            };
        }
        console.log(`Found ${graphqlApisResponse.graphqlApis.length} AppSync instances.`);

        let targetAppSync = null;
        for (const api of graphqlApisResponse.graphqlApis) {
            console.log(`Checking AppSync API: ${api.name} (ID: ${api.apiId})`);
            const getGraphqlApiCommand = new GetGraphqlApiCommand({ apiId: api.apiId });
            let appSyncDetails;
            try {
                appSyncDetails = await appsyncClient.send(getGraphqlApiCommand);
            } catch (error) {
                console.error(`Error getting details for AppSync API ${api.apiId}:`, error);
                continue;
            }

            const appSyncTags = appSyncDetails.graphqlApi?.tags;
            if (!appSyncTags) {
                console.log(`AppSync API ${api.apiId} has no tags. Skipping.`);
                continue;
            }

            const stackNameTag = appSyncTags["aws:cloudformation:stack-name"];
            if (stackNameTag && stackNameTag.includes(sandboxId) && appSyncDetails.graphqlApi) {
                targetAppSync = appSyncDetails.graphqlApi;
                console.log(`Found matching AppSync instance for sandbox ID ${sandboxId}: ${targetAppSync.name} (ID: ${targetAppSync.apiId})`);
                break;
            }
        }

        if (!targetAppSync) {
            console.error("Error: No matching AppSync instance found for sandbox ID:", sandboxId);
            return {
                users: JSON.stringify([]),
                executionDuration: performance.now() - start,
            };
        }

        targetUserPoolId = targetAppSync.userPoolConfig?.userPoolId;
        if (!targetUserPoolId) {
            console.error("Error: No User Pool ID found in AppSync details for API:", targetAppSync.apiId);
            return {
                users: JSON.stringify([]),
                executionDuration: performance.now() - start,
            };
        }
        console.log(`Retrieved User Pool ID from AppSync configuration: ${targetUserPoolId}`);

    } else if (deploymentType === "branch") {
        console.log("Deployment type is branch. Finding User Pool with matching branch name tag.");
        for (const userPool of userPoolsResponse.UserPools) {
            console.log(`Checking User Pool: ${userPool.Name} (ID: ${userPool.Id})`);
            const describeUserPoolCommand = new DescribeUserPoolCommand({ UserPoolId: userPool.Id });
            let userPoolDetails;
            try {
                userPoolDetails = await cognitoClient.send(describeUserPoolCommand);
            } catch (error) {
                console.error(`Error describing User Pool ${userPool.Id}:`, error);
                continue;
            }

            const userPoolTags = userPoolDetails.UserPool?.UserPoolTags;

            if (!userPoolTags) {
                console.log(`User Pool ${userPool.Id} has no tags. Skipping.`);
                continue;
            }

            if (userPoolTags["amplify:branch-name"] === branchName) {
                targetUserPoolId = userPool.Id;
                console.log(`Found matching User Pool for branch ${branchName}: ${userPool.Name} (ID: ${targetUserPoolId})`);
                break;
            }
        }
    }

    if (!targetUserPoolId) {
        console.error("Error: No matching User Pool found based on tags for deployment type:", deploymentType);
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    }

    console.log(`Target User Pool ID identified: ${targetUserPoolId}`);

    // Step 4: List users in the "Student" group
    console.log("Step 4: Listing users in the 'Student' group...");
    try {
        const listUsersInGroupCommand = new ListUsersInGroupCommand({
            UserPoolId: targetUserPoolId,
            GroupName: "Student",
            Limit: 60,
        });

        const response = await cognitoClient.send(listUsersInGroupCommand);
        const users = response.Users || [];
        console.log(`Found ${users.length} users in the 'Student' group.`);

        // Step 5: Extract user details (username, name, and email attributes) for each user
        console.log("Step 5: Extracting user details (username, name, and email attributes).");
        const userDetails = users.map(user => {
            const nameAttribute = user.Attributes?.find(attr => attr.Name === 'name');
            const emailAttribute = user.Attributes?.find(attr => attr.Name === 'email');
            return {
                username: user.Username,
                name: nameAttribute ? nameAttribute.Value : 'Unknown',
                email: emailAttribute ? emailAttribute.Value : 'Unknown' // Add email with default 'Unknown'
            };
        });
        console.log("User details extraction complete.");

        // Step 6: Return the list of users in the "Student" group and execution duration
        console.log("Step 6: Returning user list and execution duration.");
        return {
            users: JSON.stringify(userDetails),
            executionDuration: performance.now() - start,
        };

    } catch (error) {
        console.error('Error fetching users from Cognito User Pool:', error);
        return {
            users: JSON.stringify([]),
            executionDuration: performance.now() - start,
        };
    } finally {
        console.log("getStudents Lambda function execution finished.");
    }
};