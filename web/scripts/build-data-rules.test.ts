import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain ESM build script without type declarations
import { buildPolicies } from "./build-data-rules.mjs";

type Policy = { schemaName: string; policyName: string; operation: number; ruleGroup: { logicalOperator: number; rules: { operator: number; rightOperand: string }[] } };

const policies = buildPolicies() as Policy[];
const find = (schema: string, operation: number) => policies.find((policy) => policy.schemaName === schema && policy.operation === operation)!;
const rights = (policy: Policy) => policy.ruleGroup.rules.map((rule) => `${rule.operator === 8 ? "in" : "="} ${rule.rightOperand}`);

describe("data access policies", () => {
  it("defines read, edit and delete for all five schemas, with stable names", () => {
    expect(policies).toHaveLength(15);
    expect(new Set(policies.map((policy) => policy.policyName))).toEqual(new Set(["members-can-read", "members-can-edit", "members-can-delete"]));
  });

  it("lets only members read anything", () => {
    for (const schema of ["Trip", "ItineraryDay", "Suggestion", "Expense", "Vote"]) {
      expect(rights(find(schema, 0))).toEqual(["in memberIds"]);
    }
  });

  it("keeps the trip record owner-only", () => {
    expect(rights(find("Trip", 2))).toEqual(["= CreatedBy"]);
    expect(rights(find("Trip", 3))).toEqual(["= CreatedBy"]);
  });

  it("gives the itinerary to editors and content to authors or editors", () => {
    expect(rights(find("ItineraryDay", 2))).toEqual(["in editorIds"]);
    expect(rights(find("Suggestion", 2))).toEqual(["= CreatedBy", "in editorIds"]);
    expect(find("Suggestion", 2).ruleGroup.logicalOperator).toBe(1);
    expect(rights(find("Expense", 3))).toEqual(["= CreatedBy", "in editorIds"]);
  });

  it("lets only a vote's author or the trip owner change it", () => {
    expect(rights(find("Vote", 2))).toEqual(["= CreatedBy", "= tripOwnerId"]);
  });
});
