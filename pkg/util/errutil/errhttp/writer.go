package errhttp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"reflect"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apiserver/pkg/endpoints/request"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/util/errutil"
)

var ErrNonGrafanaError = errutil.Internal("core.MalformedError")
var defaultLogger = log.New("requestErrors")

// ErrorOptions is a container for functional options passed to [Write].
type ErrorOptions struct {
	fallback *errutil.Error
	logger   log.Logger
}

type k8sError struct {
	metav1.Status `json:",inline"`

	// Internal values that do not have a clean home in the standard Status object
	MessageID string         `json:"messageId"`
	Extra     map[string]any `json:"extra,omitempty"`
}

// Write writes an error to the provided [http.ResponseWriter] with the
// appropriate HTTP status and JSON payload from [errutil.Error].
// Write also logs the provided error to either the "request-errors"
// logger, or the logger provided as a functional option using
// [WithLogger].
// When passing errors that are not [errors.As] compatible with
// [errutil.Error], [ErrNonGrafanaError] will be used to create a
// generic 500 Internal Server Error payload by default, this is
// overrideable by providing [WithFallback] for a custom fallback
// error.
func Write(ctx context.Context, err error, w http.ResponseWriter, opts ...func(ErrorOptions) ErrorOptions) {
	opt := ErrorOptions{}
	for _, o := range opts {
		opt = o(opt)
	}

	var gErr errutil.Error
	if !errors.As(err, &gErr) {
		gErr = fallbackOrInternalError(err, opt)
	}

	logError(ctx, gErr, opt)

	var rsp any
	pub := gErr.Public()
	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(pub.StatusCode)
	rsp = pub

	// When running in k8s, this will return a v1 status
	// Typically, k8s handlers should directly support error negotiation, however
	// when implementing handlers directly this will maintain compatibility with client-go
	info, ok := request.RequestInfoFrom(ctx)
	if ok {
		status := &k8sError{
			Status: metav1.Status{
				Status:  metav1.StatusFailure,
				Code:    int32(pub.StatusCode),
				Message: pub.Message,
				Details: &metav1.StatusDetails{
					Name:  info.Name,
					Group: info.APIGroup,
				},
			},
			// Add the internal values into
			MessageID: pub.MessageID,
			Extra:     pub.Extra,
		}
		switch pub.StatusCode {
		case 400:
			status.Reason = metav1.StatusReasonBadRequest
		case 401:
			status.Reason = metav1.StatusReasonUnauthorized
		case 403:
			status.Reason = metav1.StatusReasonForbidden
		case 404:
			status.Reason = metav1.StatusReasonNotFound
		case 500: // many reasons things could map here
			status.Reason = metav1.StatusReasonInternalError
		case 504:
			status.Reason = metav1.StatusReasonTimeout
		}
		rsp = status
	}

	err = json.NewEncoder(w).Encode(rsp)
	if err != nil {
		defaultLogger.FromContext(ctx).Error("error while writing error", "error", err)
	}
}

// WithFallback sets the default error returned to the user if the error
// sent to [Write] is not an [errutil.Error].
func WithFallback(opt ErrorOptions, fallback errutil.Error) ErrorOptions {
	opt.fallback = &fallback
	return opt
}

// WithLogger sets the logger that [Write] should write log output on.
func WithLogger(opt ErrorOptions, logger log.Logger) ErrorOptions {
	opt.logger = logger
	return opt
}

func logError(ctx context.Context, e errutil.Error, opt ErrorOptions) {
	var logger log.Logger = defaultLogger
	if opt.logger != nil {
		logger = opt.logger
	}

	kv := []any{
		"messageID", e.MessageID,
		"error", e.LogMessage,
	}
	if e.Underlying != nil {
		kv = append(kv, "underlying", e.Underlying)
	}

	e.LogLevel.LogFunc(logger.FromContext(ctx))(
		"Request error",
		kv...,
	)
}

func fallbackOrInternalError(err error, opt ErrorOptions) errutil.Error {
	if opt.fallback != nil {
		fErr := *opt.fallback
		fErr.Underlying = err
		return fErr
	}

	return ErrNonGrafanaError.Errorf("unexpected error type [%s]: %w", reflect.TypeOf(err), err)
}
