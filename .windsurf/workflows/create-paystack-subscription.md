---
description: To automate the complex business logic for creating a recurring subscription for the "Hire a Full-Time Driver" service, translating financial architecture into a reliable command.
auto_execution_mode: 1
---

1. Invoke: User types /create-paystack-subscription <contractId>. 
 2. Scaffolding: Create a new server-side function createPaystackSubscription(contractId: string). 
 3. Data Retrieval: Fetch the relevant contract document from MongoDB using the contractId. Also fetch the associated driver document to get their Paystack subaccount_code. 
 4. Create Plan: Generate code to call the Paystack API to create a new monthly plan, using the monthlySalary from the contract (converted to kobo). 
 5. Create Subscription: Generate code to call the Paystack API to create the subscription, linking the customer and the new plan. 
 6. Split Payment: Explicitly include the split_code parameter when creating the initial transaction to associate the driver's subaccount for automatic commission splitting. 
 7. DB Update: Upon success from Paystack, update the Contracts document in MongoDB, setting its status to 'active' and storing the subscription_code.