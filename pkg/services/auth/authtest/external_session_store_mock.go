// Code generated by mockery v2.42.1. DO NOT EDIT.

package authtest

import (
	context "context"

	auth "github.com/grafana/grafana/pkg/services/auth"

	mock "github.com/stretchr/testify/mock"
)

// MockExternalSessionStore is an autogenerated mock type for the ExternalSessionStore type
type MockExternalSessionStore struct {
	mock.Mock
}

// BatchDeleteExternalSessionsByUserIDs provides a mock function with given fields: ctx, userIDs
func (_m *MockExternalSessionStore) BatchDeleteExternalSessionsByUserIDs(ctx context.Context, userIDs []int64) error {
	ret := _m.Called(ctx, userIDs)

	if len(ret) == 0 {
		panic("no return value specified for BatchDeleteExternalSessionsByUserIDs")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, []int64) error); ok {
		r0 = rf(ctx, userIDs)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// Create provides a mock function with given fields: ctx, extSesion
func (_m *MockExternalSessionStore) Create(ctx context.Context, extSesion *auth.ExternalSession) error {
	ret := _m.Called(ctx, extSesion)

	if len(ret) == 0 {
		panic("no return value specified for Create")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, *auth.ExternalSession) error); ok {
		r0 = rf(ctx, extSesion)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// Delete provides a mock function with given fields: ctx, ID
func (_m *MockExternalSessionStore) Delete(ctx context.Context, ID int64) error {
	ret := _m.Called(ctx, ID)

	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, int64) error); ok {
		r0 = rf(ctx, ID)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// DeleteExternalSessionsByUserID provides a mock function with given fields: ctx, userID
func (_m *MockExternalSessionStore) DeleteExternalSessionsByUserID(ctx context.Context, userID int64) error {
	ret := _m.Called(ctx, userID)

	if len(ret) == 0 {
		panic("no return value specified for DeleteExternalSessionsByUserID")
	}

	var r0 error
	if rf, ok := ret.Get(0).(func(context.Context, int64) error); ok {
		r0 = rf(ctx, userID)
	} else {
		r0 = ret.Error(0)
	}

	return r0
}

// Get provides a mock function with given fields: ctx, ID
func (_m *MockExternalSessionStore) Get(ctx context.Context, ID int64) (*auth.ExternalSession, error) {
	ret := _m.Called(ctx, ID)

	if len(ret) == 0 {
		panic("no return value specified for Get")
	}

	var r0 *auth.ExternalSession
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, int64) (*auth.ExternalSession, error)); ok {
		return rf(ctx, ID)
	}
	if rf, ok := ret.Get(0).(func(context.Context, int64) *auth.ExternalSession); ok {
		r0 = rf(ctx, ID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*auth.ExternalSession)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, int64) error); ok {
		r1 = rf(ctx, ID)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// List provides a mock function with given fields: ctx, query
func (_m *MockExternalSessionStore) List(ctx context.Context, query *auth.ListExternalSessionQuery) ([]*auth.ExternalSession, error) {
	ret := _m.Called(ctx, query)

	if len(ret) == 0 {
		panic("no return value specified for List")
	}

	var r0 []*auth.ExternalSession
	var r1 error
	if rf, ok := ret.Get(0).(func(context.Context, *auth.ListExternalSessionQuery) ([]*auth.ExternalSession, error)); ok {
		return rf(ctx, query)
	}
	if rf, ok := ret.Get(0).(func(context.Context, *auth.ListExternalSessionQuery) []*auth.ExternalSession); ok {
		r0 = rf(ctx, query)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*auth.ExternalSession)
		}
	}

	if rf, ok := ret.Get(1).(func(context.Context, *auth.ListExternalSessionQuery) error); ok {
		r1 = rf(ctx, query)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// NewMockExternalSessionStore creates a new instance of MockExternalSessionStore. It also registers a testing interface on the mock and a cleanup function to assert the mocks expectations.
// The first argument is typically a *testing.T value.
func NewMockExternalSessionStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *MockExternalSessionStore {
	mock := &MockExternalSessionStore{}
	mock.Mock.Test(t)

	t.Cleanup(func() { mock.AssertExpectations(t) })

	return mock
}
