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
    policyHolderName: string;
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
    policyHolderName: string;
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
    try {
      // ID Validation
      if (!payload.policyHolderName || !payload.policyStartDate || !payload.policyEndDate) {
        return Result.Err<LifeInsurancePolicy, string>("Invalid payload");
      }
  
      const insurancePolicy: LifeInsurancePolicy = {
        id: uuidv4(),
        createdAt: ic.time(),
        updatedAt: Opt.None,
        policyHolder: ic.caller(),
        policyHolderName: payload.policyHolderName,
        coverageAmount: payload.coverageAmount,
        premiumAmount: payload.premiumAmount,
        policyStartDate: payload.policyStartDate,
        policyEndDate: payload.policyEndDate,
        isClaimed: payload.isClaimed,
      };
  
      insurancePolicyStorage.insert(insurancePolicy.id, insurancePolicy);
      return Result.Ok<LifeInsurancePolicy, string>(insurancePolicy);
    } catch (error) {
      return Result.Err<LifeInsurancePolicy, string>("Failed to create insurance policy");
    }
  }
  
  // Function to get an insurance policy by ID
  $query;
  export function getInsurancePolicy(id: string): Result<LifeInsurancePolicy, string> {
    try {
      // ID Validation
      if (typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID parameter.");
      }
  
      return match(insurancePolicyStorage.get(id), {
        Some: (policy) => Result.Ok<LifeInsurancePolicy, string>(policy),
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
      });
    } catch (error) {
      return Result.Err<LifeInsurancePolicy, string>("An error occurred while retrieving insurance policy by ID.");
    }
  }
  
  // Function to get all insurance policies for the current user
  $query;
  export function getAllInsurancePolicies(): Result<Vec<LifeInsurancePolicy>, string> {
    try {
      // Return all insurance policies for the current user
  
      return Result.Ok(insurancePolicyStorage.values());
  
    } catch (error) {
      return Result.Err<Vec<LifeInsurancePolicy>, string>("Error retrieving insurance policies");
    }
  }
  
  // Function to update an insurance policy
  $update;
  export function updateInsurancePolicy(id: string, payload: LifeInsurancePolicyPayload): Result<LifeInsurancePolicy, string> {
    try {
      // ID Validation
      if (typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID parameter.");
      }
  
      // Payload Validation
      if (!payload.policyHolderName || !payload.policyStartDate || !payload.policyEndDate) {
        return Result.Err<LifeInsurancePolicy, string>("Invalid payload");
      }
  
      return match(insurancePolicyStorage.get(id), {
        Some: (existingPolicy) => {
          const updatedPolicy: LifeInsurancePolicy = {
            ...existingPolicy,
            policyHolderName: payload.policyHolderName,
            coverageAmount: payload.coverageAmount,
            premiumAmount: payload.premiumAmount,
            policyStartDate: payload.policyStartDate,
            policyEndDate: payload.policyEndDate,
            isClaimed: payload.isClaimed,
            updatedAt: Opt.Some(ic.time()),
          };
  
          insurancePolicyStorage.insert(updatedPolicy.id, updatedPolicy);
          return Result.Ok<LifeInsurancePolicy, string>(updatedPolicy);
        },
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
      });
    } catch (error) {
      return Result.Err<LifeInsurancePolicy, string>(`Failed to update Insurance Policy with ID=${id}. Error: ${error}`);
    }
  }
  
  // Function to delete an insurance policy
  $update;
  export function deleteInsurancePolicy(id: string): Result<LifeInsurancePolicy, string> {
    try {
      // ID Validation
      if (typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID parameter.");
      }
  
      return match(insurancePolicyStorage.get(id), {
        Some: (existingPolicy) => {
          insurancePolicyStorage.remove(id);
          return Result.Ok<LifeInsurancePolicy, string>(existingPolicy);
        },
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
      });
    } catch (error) {
      return Result.Err<LifeInsurancePolicy, string>(`Failed to delete Insurance Policy with ID=${id}. Error: ${error}`);
    }
  }
  
  // Function to file a claim for an insurance policy
  $update;
  export function fileClaim(id: string): Result<LifeInsurancePolicy, string> {
    try {
      // ID Validation
      if (typeof id !== "string") {
        return Result.Err<LifeInsurancePolicy, string>("Invalid ID parameter.");
      }
  
      return match(insurancePolicyStorage.get(id), {
        Some: (policy) => {
          if (!policy.isClaimed) {
            const updatedPolicy: LifeInsurancePolicy = {
              ...policy,
              isClaimed: true,
              updatedAt: Opt.Some(ic.time()),
            };
  
            insurancePolicyStorage.insert(updatedPolicy.id, updatedPolicy);
            return Result.Ok<LifeInsurancePolicy, string>(updatedPolicy);
          } else {
            return Result.Err<LifeInsurancePolicy, string>(`Claim for Insurance Policy with ID=${id} has already been filed.`);
          }
        },
        None: () => Result.Err<LifeInsurancePolicy, string>(`Insurance Policy with ID=${id} not found.`),
      });
    } catch (error) {
      return Result.Err<LifeInsurancePolicy, string>(`Failed to claim Insurance Policy with ID=${id}. Error: ${error}`);
    }
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
  