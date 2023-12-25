import {
    $update,
    $query,
    Record,
    StableBTreeMap,
    Vec,
    match,
    Result,
    nat64,
    ic,
    Opt,
    Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the LifeInsurancePolicy type
type LifeInsurancePolicy = Record<{
    id: string;
    policyHolder: Principal;
    coverageAmount: number;
    premiumAmount: number;
    policyStartDate: nat64;
    policyEndDate: nat64;
    isClaimed: boolean;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>;

// Define the Payload type for creating or updating insurance policies
type LifeInsurancePolicyPayload = Record<{
    policyHolder: Principal;
    coverageAmount: number;
    premiumAmount: number;
    policyStartDate: nat64;
    policyEndDate: nat64;
    isClaimed: boolean;
}>;

// Create StableBTreeMap to store insurance policies
const insurancePolicyStorage = new StableBTreeMap<string, LifeInsurancePolicy>(0, 44, 1024);

// Function to create a new insurance policy
$update;
export function createInsurancePolicy(payload: LifeInsurancePolicyPayload): Result<LifeInsurancePolicy, string> {
    // Validate input payload
    if (!payload || typeof payload !== "object") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid payload for creating an insurance policy.");
    }

    // Ensure required fields are present
    const requiredFields = ["policyHolder", "coverageAmount", "premiumAmount", "policyStartDate", "policyEndDate", "isClaimed"];
    for (const field of requiredFields) {
        if (!(field in payload)) {
            return Result.Err<LifeInsurancePolicy, string>(`Missing required field: ${field}.`);
        }
    }

    // Validate sensitive data if needed

    const insurancePolicy: LifeInsurancePolicy = {
        id: uuidv4(),
        createdAt: ic.time(),
        updatedAt: Opt.None,
        ...payload,
    };
    insurancePolicyStorage.insert(insurancePolicy.id, insurancePolicy);
    return Result.Ok<LifeInsurancePolicy, string>(insurancePolicy);
}
    

// Function to get an insurance policy by ID
$query;
export function getInsurancePolicy(id: string): Result<LifeInsurancePolicy, string> {
    // Validate ID format
    if (!id || typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID format.");
    }

    return match(insurancePolicyStorage.get(id), {
        Some: (policy) => Result.Ok<LifeInsurancePolicy, string>(policy),
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
    });
}

// Function to get all insurance policies for the current user
$query;
export function getAllInsurancePolicies(): Result<Vec<LifeInsurancePolicy>, string> {
    const currentUserId = ic.caller();

    // Validate current user ID
    if (!currentUserId || typeof currentUserId !== "string") {
        return Result.Err<Vec<LifeInsurancePolicy>, string>("Invalid current user ID.");
    }

    const userInsurancePolicies = insurancePolicyStorage.values().filter((policy) => policy.policyHolder === currentUserId);
    return Result.Ok(userInsurancePolicies);
}

// Function to update an insurance policy
$update;
export function updateInsurancePolicy(id: string, payload: LifeInsurancePolicyPayload): Result<LifeInsurancePolicy, string> {
    // Validate ID format
    if (!id || typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID format.");
    }

    // Validate input payload
    if (!payload || typeof payload !== "object") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid payload for updating an insurance policy.");
    }

    // Ensure required fields are present in the payload
    const requiredFields = ["policyHolder", "coverageAmount", "premiumAmount", "policyStartDate", "policyEndDate", "isClaimed"];
    for (const field of requiredFields) {
        if (!(field in payload)) {
            return Result.Err<LifeInsurancePolicy, string>(`Missing required field: ${field}.`);
        }
    }
    return match(insurancePolicyStorage.get(id), {
        Some: (existingPolicy) => {
            const updatedPolicy: LifeInsurancePolicy = {
                ...existingPolicy,
                ...payload,
                updatedAt: Opt.Some(ic.time()),
            };

            insurancePolicyStorage.insert(updatedPolicy.id, updatedPolicy);
            return Result.Ok<LifeInsurancePolicy, string>(updatedPolicy);
        },
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
    });
}

// Function to delete an insurance policy
$update;
export function deleteInsurancePolicy(id: string): Result<LifeInsurancePolicy, string> {
    // Validate ID format
    if (!id || typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID format.");
    }

    return match(insurancePolicyStorage.get(id), {
        Some: (existingPolicy) => {
            insurancePolicyStorage.remove(id);
            return Result.Ok<LifeInsurancePolicy, string>(existingPolicy);
        },
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
    });
}

// Function to file a claim for an insurance policy
$update;
export function fileClaim(id: string): Result<LifeInsurancePolicy, string> {
    // Validate ID format
    if (!id || typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID format.");
    }

    return match(insurancePolicyStorage.get(id), {
        Some: (policy) => {
            // Check for reentrancy
            if (policy.isClaimed) {
                return Result.Err<LifeInsurancePolicy, string>(`Claim for Insurance Policy with ID=${id} has already been filed.`);
            }

            const updatedPolicy: LifeInsurancePolicy = {
                ...policy,
                isClaimed: true,
                updatedAt: Opt.Some(ic.time()),
            };

            insurancePolicyStorage.insert(updatedPolicy.id, updatedPolicy);
            return Result.Ok<LifeInsurancePolicy, string>(updatedPolicy);
        },
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
    });
}


// Cryptographic utility for generating random values
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    },
};
