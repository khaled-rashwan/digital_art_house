import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import type { Schema } from '../../data/resource';
import { LambdaClient, GetFunctionCommand } from "@aws-sdk/client-lambda";
import {
  AppSyncClient,
  ListGraphqlApisCommand,
} from "@aws-sdk/client-appsync";

// Initialize AWS clients
const dynamoDbClient = new DynamoDBClient({});
const lambdaClient = new LambdaClient({});
const appsyncClient = new AppSyncClient({});

/**
 * Lambda function handler for recording or rescheduling a booking.
 * This function updates both Booking and InstructorAvailability tables.
 * The specific tables are determined based on tags associated with the Lambda function,
 * allowing for environment-specific (sandbox/branch) data management.
 *
 * @param {Schema["RecordBooking"]["functionHandler"]["event"]} event - Event data containing arguments (studentId, lessonId, oldInstructorAvailabilityId, newInstructorAvailabilityId).
 * @param {Schema["RecordBooking"]["functionHandler"]["context"]} context - Lambda context object containing information about the execution environment.
 * @returns {Promise<{ recordStatus: string, executionDuration: number }>} - A promise that resolves to an object containing
 *          a status message and the function execution duration.
 */
export const handler: Schema["RecordBooking"]["functionHandler"] = async (event, context) => {
  const start = performance.now();
  console.log("Starting RecordBooking Lambda function execution");

  try {
    // Step 1: Retrieve Lambda function tags to determine deployment type and environment details
    console.log("Step 1: Retrieving Lambda function tags...");
    const lambdaParams = { FunctionName: context.functionName };
    const lambdaCommand = new GetFunctionCommand(lambdaParams);
    let lambdaResponse;
    
    try {
      lambdaResponse = await lambdaClient.send(lambdaCommand);
      console.log("Successfully retrieved Lambda function details.");
    } catch (error) {
      console.error("Error retrieving Lambda function details:", error);
      return {
        recordStatus: "ERROR",
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
        recordStatus: "ERROR",
        executionDuration: performance.now() - start,
      };
    }
    console.log("Lambda function tags:", tags);

    deploymentType = tags["amplify:deployment-type"];
    if (!deploymentType) {
      console.error("Error: Deployment type tag ('amplify:deployment-type') not found in Lambda tags.");
      return {
        recordStatus: "ERROR",
        executionDuration: performance.now() - start,
      };
    }
    console.log(`Deployment type identified from tags: ${deploymentType}`);

    // Determine environment details based on deployment type (sandbox or branch)
    if (deploymentType === "sandbox") {
      console.log('Deployment type is sandbox. Extracting sandbox ID from stack name tag.');
      const stackName = tags["aws:cloudformation:stack-name"];
      if (!stackName) {
        console.error("Error: Stack name tag ('aws:cloudformation:stack-name') not found for sandbox deployment.");
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }
      sandboxId = stackName.split("-function")[0]; // Assumes sandbox ID is before '-function' in stack name
      console.log(`Sandbox ID extracted from stack name: ${sandboxId}`);
    } else if (deploymentType === "branch") {
      console.log('Deployment type is branch. Extracting branch name from branch name tag.');
      branchName = tags["amplify:branch-name"];
      if (!branchName) {
        console.error("Error: Branch name tag ('amplify:branch-name') not found for branch deployment.");
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }
      console.log(`Branch Name extracted from tags: ${branchName}`);
    } else {
      console.error(`Error: Unsupported deployment type: ${deploymentType}. Supported types are 'sandbox' and 'branch'.`);
      return {
        recordStatus: "ERROR",
        executionDuration: performance.now() - start,
      };
    }

    // Step 2: Find the AppSync API based on deployment type
    console.log("Step 2: Finding the AppSync API...");
    let targetApiId = null;

    if (deploymentType === "sandbox") {
      console.log("Finding AppSync API for sandbox deployment...");
      // List all GraphQL APIs
      const listApisCommand = new ListGraphqlApisCommand({});
      let listApisResponse;
      
      try {
        listApisResponse = await appsyncClient.send(listApisCommand);
        console.log("Successfully listed AppSync APIs.");
      } catch (error) {
        console.error("Error listing AppSync APIs:", error);
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }

      if (!listApisResponse.graphqlApis || listApisResponse.graphqlApis.length === 0) {
        console.warn("Warning: No AppSync APIs found.");
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }

      // Find API by matching stack ID with sandbox ID
      for (const api of listApisResponse.graphqlApis) {
        if (api.tags && api.tags["aws:cloudformation:stack-name"] && api.tags["aws:cloudformation:stack-name"].startsWith(sandboxId)) {
          targetApiId = api.apiId;
          console.log(`Found matching AppSync API for sandbox ID ${sandboxId}: ${api.name} (ID: ${targetApiId})`);
          break;
        }
      }
    } else if (deploymentType === "branch") {
      console.log("Finding AppSync API for branch deployment...");
      // List all GraphQL APIs
      const listApisCommand = new ListGraphqlApisCommand({});
      let listApisResponse;
      
      try {
        listApisResponse = await appsyncClient.send(listApisCommand);
        console.log("Successfully listed AppSync APIs.");
      } catch (error) {
        console.error("Error listing AppSync APIs:", error);
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }

      if (!listApisResponse.graphqlApis || listApisResponse.graphqlApis.length === 0) {
        console.warn("Warning: No AppSync APIs found.");
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }

      // Find API by matching branch name
      for (const api of listApisResponse.graphqlApis) {
        if (api.tags && api.tags["amplify:branch-name"] === branchName) {
          targetApiId = api.apiId;
          console.log(`Found matching AppSync API for branch ${branchName}: ${api.name} (ID: ${targetApiId})`);
          break;
        }
      }
    }

    if (!targetApiId) {
      console.error("Error: No matching AppSync API found for deployment type:", deploymentType);
      return {
        recordStatus: "ERROR",
        executionDuration: performance.now() - start,
      };
    }

    // Step 3: Construct the DynamoDB table names
    console.log("Step 3: Constructing DynamoDB table names...");
    const bookingTable = `Booking-${targetApiId}-NONE`;
    const instructorAvailabilityTable = `InstructorAvailability-${targetApiId}-NONE`;
    console.log(`Booking table: ${bookingTable}`);
    console.log(`InstructorAvailability table: ${instructorAvailabilityTable}`);

    // Step 4: Extract arguments from the event
    console.log("Step 4: Extracting arguments from the event...");
    const { studentId, lessonId, oldInstructorAvailabilityId, newInstructorAvailabilityId, action } = event.arguments;
    const timestamp = new Date().toISOString();
    const bookingId = `${studentId}_${lessonId}`;
    console.log(`Booking ID: ${bookingId}`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Lesson ID: ${lessonId}`);
    console.log(`Old Availability ID: ${oldInstructorAvailabilityId || 'None (new booking)'}`);
    console.log(`New Availability ID: ${newInstructorAvailabilityId}`);
    
    // Check if the operation is a skip
    if (action === "skip") {
      console.log("Skip mode: updating booking status to skipped.");

      // Retrieve the existing booking record
      const getBookingParams = {
        TableName: bookingTable,
        Key: {
          id: { S: bookingId }
        }
      };

      let bookingResponse;
      try {
        bookingResponse = await dynamoDbClient.send(new GetItemCommand(getBookingParams));
        if (!bookingResponse.Item) {
          console.warn(`No booking found with ID ${bookingId} to skip.`);
          return {
            recordStatus: "ERROR",
            executionDuration: performance.now() - start,
          };
        }
      } catch (error) {
        console.error("Error retrieving booking for skip:", error);
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }

      // Update InstructorAvailability: mark the current availability as not booked
      try {
        const updateAvailabilityParams = {
          TableName: instructorAvailabilityTable,
          Key: {
            id: { S: oldInstructorAvailabilityId }
          },
          UpdateExpression: "SET isBooked = :isBooked, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":isBooked": { BOOL: false },
            ":updatedAt": { S: timestamp }
          }
        };
        await dynamoDbClient.send(new UpdateItemCommand(updateAvailabilityParams));
        console.log(`Instructor availability ${oldInstructorAvailabilityId} updated to not booked for skip.`);
      } catch (error) {
        console.error("Error updating InstructorAvailability for skip:", error);
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }

      // Update the booking record: set status to "skipped"
      try {
        const updateBookingParams = {
          TableName: bookingTable,
          Key: { id: { S: bookingId } },
          UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": { S: "skipped" },
            ":updatedAt": { S: timestamp }
          }
        };
        await dynamoDbClient.send(new UpdateItemCommand(updateBookingParams));
        console.log(`Booking ${bookingId} updated to skipped.`);
      } catch (error) {
        console.error("Error updating booking record for skip:", error);
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }

      // Return the success response for skip
      return {
        recordStatus: "SUCCESS",
        executionDuration: performance.now() - start
      };
    }

    // Step 5: Handle rescheduling if oldInstructorAvailabilityId is provided
    console.log("Step 5: Processing booking/rescheduling...");
    let numberOfReschedules = 0;
    let isRescheduling = !!oldInstructorAvailabilityId;
    let originalCreatedAt = timestamp; // Default for new bookings

    if (isRescheduling) {
      console.log("Rescheduling mode: Retrieving existing booking and updating old availability...");
      // Get the current booking
      const getBookingParams = {
        TableName: bookingTable,
        Key: {
          id: { S: bookingId }
        }
      };

      try {
        const bookingResponse = await dynamoDbClient.send(new GetItemCommand(getBookingParams));
        
        if (bookingResponse.Item) {
          console.log("Found existing booking. Updating old availability...");
          // Save the original createdAt value
          if (bookingResponse.Item.createdAt && bookingResponse.Item.createdAt.S) {
            originalCreatedAt = bookingResponse.Item.createdAt.S;
            console.log(`Preserved original createdAt: ${originalCreatedAt}`);
          }
          
          // Update the old availability to mark as not booked
          const updateOldAvailabilityParams = {
            TableName: instructorAvailabilityTable,
            Key: {
              id: { S: oldInstructorAvailabilityId }
            },
            UpdateExpression: "SET isBooked = :isBooked, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":isBooked": { BOOL: false },
              ":updatedAt": { S: timestamp }
            }
          };
          
          await dynamoDbClient.send(new UpdateItemCommand(updateOldAvailabilityParams));
          console.log(`Updated old availability ${oldInstructorAvailabilityId} as not booked`);
          
          // Increment numberOfReschedules
          numberOfReschedules = parseInt(bookingResponse.Item.numberOfReschedules.N || "0") + 1;
          console.log(`Incremented numberOfReschedules to: ${numberOfReschedules}`);
        } else {
          console.warn(`No existing booking found with ID ${bookingId}, treating as new booking`);
          isRescheduling = false;
        }
      } catch (error) {
        console.error(`Error retrieving booking or updating old availability: ${error}`);
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }
    }

    // Step 6: Update the new availability to mark as booked
    console.log("Step 6: Updating new availability as booked...");
    try {
      if (action !== "skip" && !newInstructorAvailabilityId) {
        console.error("newInstructorAvailabilityId must be provided for scheduling/rescheduling.");
        return {
          recordStatus: "ERROR",
          executionDuration: performance.now() - start,
        };
      }
      // When updating new availability in scheduling/rescheduling mode, we are now sure newInstructorAvailabilityId is defined.
      const updateNewAvailabilityParams = {
        TableName: instructorAvailabilityTable,
        Key: {
          id: { S: newInstructorAvailabilityId! } // Non-null assertion since we checked above
        },
        UpdateExpression: "SET isBooked = :isBooked, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":isBooked": { BOOL: true },
          ":updatedAt": { S: timestamp }
        }
      };

      await dynamoDbClient.send(new UpdateItemCommand(updateNewAvailabilityParams));
      console.log(`Updated new availability ${newInstructorAvailabilityId} as booked`);
    } catch (error) {
      console.error(`Error updating new availability: ${error}`);
      return {
        recordStatus: "ERROR",
        executionDuration: performance.now() - start,
      };
    }

    // Step 7: Create or update booking record
    console.log("Step 7: Creating or updating booking record...");
    try {
      const owner = `${studentId}::${studentId}`; // Owner format for authorization

      // Define the booking item - always include createdAt
      const bookingItem: Record<string, any> = {
        id: { S: bookingId },
        __typename: { S: "Booking" },
        availabilityId: { S: newInstructorAvailabilityId },
        lessonId: { S: lessonId },
        numberOfReschedules: { N: numberOfReschedules.toString() },
        status: { S: "scheduled" },
        studentId: { S: studentId },
        updatedAt: { S: timestamp },
        owner: { S: owner },
        createdAt: { S: originalCreatedAt } // Use preserved original timestamp or current timestamp for new bookings
      };

      const putBookingParams = {
        TableName: bookingTable,
        Item: bookingItem
      };

      await dynamoDbClient.send(new PutItemCommand(putBookingParams));
      console.log(`${isRescheduling ? 'Updated' : 'Created new'} booking record: ${bookingId}`);
    } catch (error) {
      console.error(`Error creating/updating booking record: ${error}`);
      return {
        recordStatus: "ERROR",
        executionDuration: performance.now() - start,
      };
    }

    // Step 8: Return success response
    console.log("Step 8: Returning success response...");
    return {
      recordStatus: "SUCCESS",
      executionDuration: performance.now() - start
    };
  } catch (error) {
    console.error("Error in RecordBooking Lambda function:", error);
    return {
      recordStatus: "ERROR",
      executionDuration: performance.now() - start
    };
  } finally {
    console.log("RecordBooking Lambda function execution finished.");
  }
};