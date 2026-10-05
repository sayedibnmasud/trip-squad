// Generates the data-access policies in blocks/data/rules.json from the table
// below (see docs/superpowers/specs/2026-10-05-trip-roles-design.md).
// Run: node scripts/build-data-rules.mjs, then `blocks data rules deploy`.
//
// Policy names are kept stable on purpose: `rules deploy` updates policies by
// name, so renaming one would leave the old policy active beside the new one.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RULES_FILE = new URL("../blocks/data/rules.json", import.meta.url);

// Data Gateway enums (blocks-data ServiceEnums.cs), sent as numbers.
const AUTH = 0;
const SCHEMA_FIELD = 1;
const EQUAL = 0;
const IN = 8;
const AND = 0;
const OR = 1;
const RLS = 0;
const OPERATION = { read: 0, edit: 2, delete: 3 };

// "The signed-in user is <field>" / "...is in <field>".
const is = (field) => ({ leftSource: AUTH, leftOperand: "UserId", operator: EQUAL, rightSource: SCHEMA_FIELD, rightOperand: field, rightOperands: [], staticValue: null, description: `UserId = ${field}` });
const isIn = (field) => ({ leftSource: AUTH, leftOperand: "UserId", operator: IN, rightSource: SCHEMA_FIELD, rightOperand: field, rightOperands: [], staticValue: null, description: `UserId in ${field}` });

const members = { rules: [isIn("memberIds")], text: "trip members" };
const owner = { rules: [is("CreatedBy")], text: "the trip owner (its creator)" };
const editors = { rules: [isIn("editorIds")], text: "the owner and editors" };
const authorOrEditors = { rules: [is("CreatedBy"), isIn("editorIds")], text: "its author, the owner and editors" };
const authorOrOwner = { rules: [is("CreatedBy"), is("tripOwnerId")], text: "its author and the trip owner" };

export const ACCESS = {
  Trip: { read: members, edit: owner, delete: owner },
  ItineraryDay: { read: members, edit: editors, delete: editors },
  Suggestion: { read: members, edit: authorOrEditors, delete: authorOrEditors },
  Expense: { read: members, edit: authorOrEditors, delete: authorOrEditors },
  Vote: { read: members, edit: authorOrOwner, delete: authorOrOwner }
};

export function buildPolicies(access = ACCESS) {
  return Object.entries(access).flatMap(([schemaName, operations]) =>
    Object.entries(operations).map(([operation, who]) => ({
      schemaName,
      policyName: `members-can-${operation}`,
      policyDescription: `Only ${who.text} can ${operation} ${schemaName} records`,
      policyType: RLS,
      operation: OPERATION[operation],
      fieldNames: [],
      ruleGroup: { logicalOperator: who.rules.length > 1 ? OR : AND, rules: who.rules, nestedGroups: [] },
      priority: 0,
      isAllowPolicy: true
    }))
  );
}

// Compare paths, not URLs: the URL form percent-encodes spaces in the path.
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const current = JSON.parse(readFileSync(RULES_FILE, "utf8"));
  const next = { ...current, policies: buildPolicies() };
  writeFileSync(RULES_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${next.policies.length} policies to blocks/data/rules.json`);
}
