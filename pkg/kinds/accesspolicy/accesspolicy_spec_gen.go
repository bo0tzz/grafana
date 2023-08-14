// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     kinds/gen.go
// Using jennies:
//     GoResourceTypes
//
// Run 'make gen-cue' from repository root to regenerate.

package accesspolicy

// Defines values for RoleRefKind.
const (
	RoleRefKindBuiltinRole RoleRefKind = "BuiltinRole"
	RoleRefKindRole        RoleRefKind = "Role"
	RoleRefKindTeam        RoleRefKind = "Team"
	RoleRefKindUser        RoleRefKind = "User"
)

// AccessRule defines model for AccessRule.
type AccessRule struct {
	// The kind this rule applies to (dashboards, alert, etc)
	Kind string `json:"kind"`

	// Specific sub-elements like "alert.rules" or "dashboard.permissions"????
	Target *string `json:"target,omitempty"`

	// READ, WRITE, CREATE, DELETE, ...
	// should move to k8s style verbs like: "get", "list", "watch", "create", "update", "patch", "delete"
	Verb string `json:"verb"`
}

// ResourceRef defines model for ResourceRef.
type ResourceRef struct {
	Kind string `json:"kind"`
	Name string `json:"name"`
}

// RoleRef defines model for RoleRef.
type RoleRef struct {
	// Policies can apply to roles, teams, or users
	// Applying policies to individual users is supported, but discouraged
	Kind  RoleRefKind `json:"kind"`
	Name  string      `json:"name"`
	Xname string      `json:"xname"`
}

// Policies can apply to roles, teams, or users
// Applying policies to individual users is supported, but discouraged
type RoleRefKind string

// Spec defines model for Spec.
type Spec struct {
	Role RoleRef `json:"role"`

	// The set of rules to apply.  Note that * is required to modify
	// access policy rules, and that "none" will reject all actions
	Rules []AccessRule `json:"rules"`
	Scope ResourceRef  `json:"scope"`
}
